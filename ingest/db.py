"""Запись статей и логов загрузки в PostgreSQL. Все запросы параметризованы (ТЗ §5)."""

from enum import Enum
from typing import Any

import psycopg
from psycopg.types.json import Jsonb

WORK_COLUMNS = [
    "source",
    "source_id",
    "doi",
    "title",
    "abstract",
    "publication_year",
    "publication_date",
    "language",
    "work_type",
    "license",
    "is_oa",
    "oa_status",
    "landing_url",
    "oa_url",
    "journal",
    "field",
    "subfield",
    "topic",
    "cited_by_count",
    "countries",
    "authors",
    "raw",
    "source_updated_at",
]
_JSON_COLUMNS = {"authors", "raw"}

_UPSERT_SQL = f"""
insert into works ({", ".join(WORK_COLUMNS)})
values ({", ".join(f"%({c})s" for c in WORK_COLUMNS)})
on conflict (source, source_id) do update set
    {", ".join(f"{c} = excluded.{c}" for c in WORK_COLUMNS[2:])},
    updated_at = now()
-- Статью, исправленную в админке, источник больше не перезаписывает.
where works.edited_at is null
returning (xmax = 0) as inserted
"""

# Та же статья уже есть под другим id (из другого источника или дубль внутри источника).
_DOI_DUPLICATE_SQL = """
select 1 from works
where doi = %(doi)s and not (source = %(source)s and source_id = %(source_id)s)
limit 1
"""


class UpsertResult(Enum):
    INSERTED = "inserted"
    UPDATED = "updated"
    DUPLICATE = "duplicate"
    PROTECTED = "protected"  # исправлена вручную в админке


def connect(database_url: str) -> psycopg.Connection:
    return psycopg.connect(database_url)


def upsert_work(conn: psycopg.Connection, work: dict[str, Any]) -> UpsertResult:
    with conn.cursor() as cur:
        if work.get("doi"):
            cur.execute(_DOI_DUPLICATE_SQL, work)
            if cur.fetchone():
                return UpsertResult.DUPLICATE
        params = {c: Jsonb(work[c]) if c in _JSON_COLUMNS else work[c] for c in WORK_COLUMNS}
        cur.execute(_UPSERT_SQL, params)
        row = cur.fetchone()
    if row is None:
        return UpsertResult.PROTECTED
    return UpsertResult.INSERTED if row[0] else UpsertResult.UPDATED


def start_run(conn: psycopg.Connection, source: str, params: dict[str, Any]) -> int:
    with conn.cursor() as cur:
        cur.execute(
            "insert into ingest_runs (source, params) values (%s, %s) returning id",
            (source, Jsonb(params)),
        )
        (run_id,) = cur.fetchone()
    conn.commit()
    return run_id


def finish_run(
    conn: psycopg.Connection,
    run_id: int,
    stats: dict[str, int],
    status: str,
    error_message: str | None = None,
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            update ingest_runs set
                status = %(status)s, finished_at = now(), error_message = %(error_message)s,
                fetched = %(fetched)s, inserted = %(inserted)s, updated = %(updated)s,
                skipped = %(skipped)s, errors = %(errors)s
            where id = %(run_id)s
            """,
            {**stats, "status": status, "error_message": error_message, "run_id": run_id},
        )
    conn.commit()
