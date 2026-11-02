# ingest

Коннекторы на Python, которые загружают метаданные статей из источников и приводят их к единой схеме (ТЗ §6.3).

- `db.py` — запись в базу: upsert по `(source, source_id)`, пропуск дублей по DOI, лог запусков.
- `openalex/` — коннектор OpenAlex: `client.py` (API), `normalize.py` (приведение к схеме), `__main__.py` (запуск).
- `tests/` — тесты; `tests/fixtures/` — реальные записи OpenAlex.

## Установка

```bash
python -m venv .venv
.venv\Scripts\activate          # Windows; на macOS/Linux: source .venv/bin/activate
pip install -e ".[dev]"
```

## Загрузка

База должна быть запущена (`docker compose up -d`), настройки берутся из `.env`.

```bash
python -m ingest.openalex --country KZ --limit 2000
```

Параметры выборки (можно сочетать, внутри одного параметра значения объединяются через «или»):

| Параметр | Что выбирает |
|---|---|
| `--country KZ` | статьи с авторами из страны (по умолчанию, если не задано ничего другого) |
| `--language kk` | статьи на языке по метке OpenAlex: `kk`, `ru`, `en` |
| `--journal-country KZ` | статьи из журналов страны |
| `--year-from 2020`, `--year-to 2022` | годы публикации |
| `--limit 2000` | не больше стольких статей |

Казахские и русские статьи загружались так (каждая часть меньше 10 000 статей, чтобы уложиться в ограничение без ключа):

```bash
python -m ingest.openalex --language kk --year-to 2019
python -m ingest.openalex --language kk --year-from 2020 --year-to 2022
python -m ingest.openalex --language kk --year-from 2023 --year-to 2024
python -m ingest.openalex --language kk --year-from 2025
python -m ingest.openalex --language ru --country KZ --year-to 2019
python -m ingest.openalex --language ru --country KZ --year-from 2020 --year-to 2022
python -m ingest.openalex --language ru --country KZ --year-from 2023
python -m ingest.openalex --language ru --journal-country KZ --year-to 2021
python -m ingest.openalex --language ru --journal-country KZ --year-from 2022 --year-to 2023
python -m ingest.openalex --language ru --journal-country KZ --year-from 2024
```

Без `--limit` загружается всё, что подходит под фильтр.

Если поменялись правила определения языка (`detect_language`), язык уже загруженных статей пересчитывается без запросов к API:

```bash
python -m ingest.openalex.relabel_languages
``` Без `OPENALEX_API_KEY` — не больше 10 000 статей (см. `docs/data-sources.md`). Повторный запуск обновляет записи, дублей не создаёт. Итоги каждого запуска лежат в таблице `ingest_runs`.

## Тесты

```bash
ruff check .
pytest
```

Тесты базы (`tests/test_db.py`) запускаются, если задан `TEST_DATABASE_URL`, например равный `DATABASE_URL` из `.env`. Они удаляют за собой свои записи.
