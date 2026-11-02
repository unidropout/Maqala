"""Проверки на настоящей базе. Запускаются, только если задан TEST_DATABASE_URL.

Локально: TEST_DATABASE_URL=$DATABASE_URL pytest. Тесты удаляют за собой свои записи.
"""

import json
import os
from pathlib import Path

import psycopg
import pytest

from ingest import db
from ingest.openalex.__main__ import run
from ingest.tests.test_openalex_client import FakeClient

DATABASE_URL = os.environ.get("TEST_DATABASE_URL")
SCHEMA = Path(__file__).parents[2] / "db" / "schema.sql"
FIXTURES = Path(__file__).parent / "fixtures"

pytestmark = pytest.mark.skipif(not DATABASE_URL, reason="TEST_DATABASE_URL не задан")


def record(source_id: str, doi: str | None, title: str | None = "Тестовая статья") -> dict:
    data = json.loads((FIXTURES / "openalex_work_en.json").read_text(encoding="utf-8"))
    data["id"] = f"https://openalex.org/{source_id}"
    data["doi"] = f"https://doi.org/{doi}" if doi else None
    data["display_name"] = title
    return data


@pytest.fixture
def conn():
    with psycopg.connect(DATABASE_URL) as conn:
        conn.execute(SCHEMA.read_text(encoding="utf-8"))
        conn.commit()
        yield conn
        conn.rollback()
        conn.execute("delete from works where source_id like 'WTEST%'")
        conn.execute("delete from ingest_runs where params->>'test' = 'true'")
        conn.commit()


def count(conn, sql: str, *params) -> int:
    return conn.execute(sql, params).fetchone()[0]


def test_rerun_updates_without_duplicates(conn, monkeypatch):
    # Помечаем запуск как тестовый, чтобы фикстура удалила его из лога.
    original_start = db.start_run
    monkeypatch.setattr(
        db, "start_run", lambda c, s, p: original_start(c, s, {**p, "test": "true"})
    )
    pages = [
        [
            record("WTEST1", "10.0000/test.1"),
            record("WTEST2", "10.0000/test.2"),
            record("WTEST3", None, title=None),  # без названия: отбрасывается
            record("WTEST4", "10.0000/TEST.1"),  # тот же DOI, что у WTEST1: дубль
        ]
    ]

    def client():
        return FakeClient([{"meta": {}, "results": p} for p in pages] + [{"results": []}])

    first = run(conn, client(), {"countries": ["KZ"]}, limit=None)
    second = run(conn, client(), {"countries": ["KZ"]}, limit=None)

    assert (first["fetched"], first["inserted"], first["updated"], first["skipped"]) == (4, 2, 0, 2)
    assert (second["inserted"], second["updated"], second["skipped"]) == (0, 2, 2)
    assert count(conn, "select count(*) from works where source_id like 'WTEST%%'") == 2

    log = conn.execute(
        "select status, fetched, inserted, updated, skipped, errors from ingest_runs "
        "where params->>'test' = 'true' order by id"
    ).fetchall()
    assert log == [("success", 4, 2, 0, 2, 0), ("success", 4, 0, 2, 2, 0)]


def test_upsert_stores_arrays_and_json(conn):
    from ingest.openalex.normalize import normalize

    work = normalize(record("WTEST10", "10.0000/test.10"))
    assert db.upsert_work(conn, work) is db.UpsertResult.INSERTED

    countries, authors, raw = conn.execute(
        "select countries, authors, raw from works where source_id = 'WTEST10'"
    ).fetchone()
    assert countries == ["KZ"]
    assert authors[0]["institutions"][0]["country"] == "KZ"
    assert raw["id"] == "https://openalex.org/WTEST10"
