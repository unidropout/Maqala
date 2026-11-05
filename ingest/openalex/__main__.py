"""Загрузка статей из OpenAlex в базу.

Примеры:
    python -m ingest.openalex --country KZ --limit 2000
    python -m ingest.openalex --language kk --year-from 2020
    python -m ingest.openalex --language ru --country KZ
"""

import argparse
import logging
import os
import sys
from collections import Counter
from collections.abc import Callable

from dotenv import load_dotenv

from ingest import db
from ingest.openalex.client import OpenAlexClient, build_filter
from ingest.openalex.normalize import SOURCE, normalize

log = logging.getLogger("ingest.openalex")


def run(
    conn,
    client: OpenAlexClient,
    selection: dict,
    limit: int | None,
    on_start: Callable[[int], None] | None = None,
) -> Counter:
    """selection — аргументы build_filter: countries, languages, journal_countries, годы.

    on_start получает id записи в ingest_runs сразу после её создания.
    """
    filter_ = build_filter(**selection)
    run_id = db.start_run(conn, SOURCE, {**selection, "limit": limit, "filter": filter_})
    if on_start:
        on_start(run_id)
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
                    skipped = result in (db.UpsertResult.DUPLICATE, db.UpsertResult.PROTECTED)
                    stats["skipped" if skipped else result.value] += 1
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
        help="страна авторов, ISO-код (можно указать несколько раз)",
    )
    parser.add_argument(
        "--language",
        action="append",
        dest="languages",
        metavar="CODE",
        help="язык статьи по метке OpenAlex: kk, ru, en (можно указать несколько раз)",
    )
    parser.add_argument(
        "--journal-country",
        action="append",
        dest="journal_countries",
        metavar="CODE",
        help="страна журнала, ISO-код: статьи казахстанских журналов — KZ",
    )
    parser.add_argument("--year-from", type=int, help="год публикации не раньше")
    parser.add_argument("--year-to", type=int, help="год публикации не позже")
    parser.add_argument("--limit", type=int, help="сколько записей загрузить (по умолчанию все)")
    args = parser.parse_args(argv)

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    load_dotenv()
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        log.error("Не задан DATABASE_URL (см. .env.example)")
        return 2

    selection = {
        "countries": args.countries,
        "languages": args.languages,
        "journal_countries": args.journal_countries,
        "year_from": args.year_from,
        "year_to": args.year_to,
    }
    # Без условий загрузка охватила бы весь OpenAlex, поэтому по умолчанию берём Казахстан.
    if not (args.countries or args.languages or args.journal_countries):
        selection["countries"] = ["KZ"]

    client = OpenAlexClient(
        api_key=os.environ.get("OPENALEX_API_KEY"), email=os.environ.get("OPENALEX_EMAIL")
    )
    with db.connect(database_url) as conn:
        stats = run(conn, client, selection, args.limit)
    log.info(
        "Готово: получено %(fetched)d, добавлено %(inserted)d, обновлено %(updated)d, "
        "пропущено %(skipped)d, ошибок %(errors)d",
        stats,
    )
    return 1 if stats["errors"] else 0


if __name__ == "__main__":
    sys.exit(main())
