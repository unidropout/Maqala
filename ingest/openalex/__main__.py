"""Загрузка статей из OpenAlex в базу.

Пример:
    python -m ingest.openalex --country KZ --limit 2000
"""

import argparse
import logging
import os
import sys
from collections import Counter

from dotenv import load_dotenv

from ingest import db
from ingest.openalex.client import OpenAlexClient, build_filter
from ingest.openalex.normalize import SOURCE, normalize

log = logging.getLogger("ingest.openalex")


def run(conn, client: OpenAlexClient, countries: list[str], limit: int | None) -> Counter:
    filter_ = build_filter(countries)
    run_id = db.start_run(conn, SOURCE, {"countries": countries, "limit": limit, "filter": filter_})
    stats = Counter(fetched=0, inserted=0, updated=0, skipped=0, errors=0)
    try:
        for page in client.iter_pages(filter_, limit=limit):
            # Страница пишется одной транзакцией, каждая запись внутри неё — в своей точке
            # сохранения: ошибка в одной записи не откатывает остальные.
            with conn.transaction():
                for record in page:
                    stats["fetched"] += 1
                    try:
                        with conn.transaction():
                            work = normalize(record)
                            if work is None:
                                stats["skipped"] += 1
                                continue
                            result = db.upsert_work(conn, work)
                    except Exception:
                        stats["errors"] += 1
                        log.exception("Не удалось сохранить %s", record.get("id"))
                        continue
                    stats["skipped" if result is db.UpsertResult.DUPLICATE else result.value] += 1
            log.info("Обработано %d записей", stats["fetched"])
    except Exception as exc:
        conn.rollback()
        db.finish_run(conn, run_id, stats, "failed", str(exc)[:2000])
        raise
    db.finish_run(conn, run_id, stats, "success")
    return stats


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Загрузка статей из OpenAlex")
    parser.add_argument(
        "--country",
        action="append",
        dest="countries",
        metavar="CODE",
        help="страна авторов, ISO-код (можно указать несколько раз), по умолчанию KZ",
    )
    parser.add_argument("--limit", type=int, help="сколько записей загрузить (по умолчанию все)")
    args = parser.parse_args(argv)

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    load_dotenv()
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        log.error("Не задан DATABASE_URL (см. .env.example)")
        return 2

    client = OpenAlexClient(
        api_key=os.environ.get("OPENALEX_API_KEY"), email=os.environ.get("OPENALEX_EMAIL")
    )
    with db.connect(database_url) as conn:
        stats = run(conn, client, args.countries or ["KZ"], args.limit)
    log.info(
        "Готово: получено %(fetched)d, добавлено %(inserted)d, обновлено %(updated)d, "
        "пропущено %(skipped)d, ошибок %(errors)d",
        stats,
    )
    return 1 if stats["errors"] else 0


if __name__ == "__main__":
    sys.exit(main())
