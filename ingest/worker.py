"""Выполняет загрузки, поставленные в очередь из админки (таблица ingest_jobs).

    python -m ingest.worker

Берёт задачи по одной, пока очередь не опустеет, и завершается. В продакшене запускается
по расписанию (GitHub Actions), локально — вручную или сайтом при INGEST_AUTORUN=1.
"""

import logging
import os
import re
import sys
from typing import Any

from dotenv import load_dotenv
from psycopg.types.json import Jsonb

from ingest import db
from ingest.openalex.__main__ import run
from ingest.openalex.client import OpenAlexClient

log = logging.getLogger("ingest.worker")

MAX_LIMIT = 100_000
_CODE_RE = re.compile(r"^[A-Za-z]{2}$")

_CLAIM_SQL = """
update ingest_jobs set status = 'running', started_at = now()
where id = (
    select id from ingest_jobs where status = 'queued'
    order by id for update skip locked limit 1
)
returning id, params
"""


def parse_params(params: dict[str, Any]) -> tuple[dict[str, Any], int | None]:
    """Проверяет параметры задачи заново: в базу их пишет сайт, доверять им нельзя."""

    def codes(key: str) -> list[str] | None:
        values = params.get(key) or []
        if not isinstance(values, list) or not all(
            isinstance(v, str) and _CODE_RE.match(v) for v in values
        ):
            raise ValueError(f"{key}: нужен список двухбуквенных кодов")
        return [v.upper() if key != "languages" else v.lower() for v in values] or None

    def year(key: str) -> int | None:
        value = params.get(key)
        if value is None:
            return None
        if not isinstance(value, int) or not 1900 <= value <= 2100:
            raise ValueError(f"{key}: год от 1900 до 2100")
        return value

    selection = {
        "countries": codes("countries"),
        "languages": codes("languages"),
        "journal_countries": codes("journal_countries"),
        "year_from": year("year_from"),
        "year_to": year("year_to"),
    }
    if not (selection["countries"] or selection["languages"] or selection["journal_countries"]):
        raise ValueError("нужна хотя бы одна страна, язык или страна журнала")
    limit = params.get("limit")
    if limit is not None and (not isinstance(limit, int) or not 1 <= limit <= MAX_LIMIT):
        raise ValueError(f"limit: от 1 до {MAX_LIMIT}")
    return selection, limit


def process_next(conn, client: OpenAlexClient) -> bool:
    """Выполняет одну задачу из очереди. False — очередь пуста."""
    row = conn.execute(_CLAIM_SQL).fetchone()
    conn.commit()
    if row is None:
        return False
    job_id, params = row
    log.info("Задача %d: %s", job_id, params)

    def link_run(run_id: int) -> None:
        conn.execute("update ingest_jobs set run_id = %s where id = %s", (run_id, job_id))
        conn.commit()

    try:
        selection, limit = parse_params(params)
        stats = run(conn, client, selection, limit, on_start=link_run)
    except Exception as exc:
        conn.rollback()
        log.exception("Задача %d не выполнена", job_id)
        conn.execute(
            "update ingest_jobs set status = 'failed', finished_at = now(), error = %s "
            "where id = %s",
            (str(exc)[:2000], job_id),
        )
        conn.commit()
        return True
    conn.execute(
        "update ingest_jobs set status = 'done', finished_at = now(), params = %s where id = %s",
        (Jsonb({**params, "result": dict(stats)}), job_id),
    )
    conn.commit()
    return True


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    load_dotenv()
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        log.error("Не задан DATABASE_URL (см. .env.example)")
        return 2
    client = OpenAlexClient(
        api_key=os.environ.get("OPENALEX_API_KEY"), email=os.environ.get("OPENALEX_EMAIL")
    )
    processed = 0
    with db.connect(database_url) as conn:
        while process_next(conn, client):
            processed += 1
    log.info("Готово: обработано задач %d", processed)
    return 0


if __name__ == "__main__":
    sys.exit(main())
