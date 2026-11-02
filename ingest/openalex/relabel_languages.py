"""Пересчитывает язык уже загруженных статей OpenAlex после изменения правил detect_language.

Запросов к API не делает: берёт название, аннотацию и исходную метку языка из базы.

    python -m ingest.openalex.relabel_languages
"""

import logging
import os
import sys

from dotenv import load_dotenv

from ingest import db
from ingest.openalex.normalize import SOURCE, detect_language

log = logging.getLogger("ingest.openalex.relabel")


def relabel(conn) -> int:
    rows = conn.execute(
        "select id, title, abstract, raw->>'language', language from works where source = %s",
        (SOURCE,),
    ).fetchall()
    changes = [
        (new, work_id)
        for work_id, title, abstract, source_language, current in rows
        if (new := detect_language(title, abstract, source_language)) != current
    ]
    with conn.cursor() as cur:
        cur.executemany("update works set language = %s, updated_at = now() where id = %s", changes)
    conn.commit()
    return len(changes)


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    load_dotenv()
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        log.error("Не задан DATABASE_URL (см. .env.example)")
        return 2
    with db.connect(database_url) as conn:
        log.info("Язык изменён у %d статей", relabel(conn))
    return 0


if __name__ == "__main__":
    sys.exit(main())
