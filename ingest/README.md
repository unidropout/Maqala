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

Без `--limit` загружается всё, что подходит под фильтр. Без `OPENALEX_API_KEY` — не больше 10 000 статей (см. `docs/data-sources.md`). Повторный запуск обновляет записи, дублей не создаёт. Итоги каждого запуска лежат в таблице `ingest_runs`.

## Тесты

```bash
ruff check .
pytest
```

Тесты базы (`tests/test_db.py`) запускаются, если задан `TEST_DATABASE_URL`, например равный `DATABASE_URL` из `.env`. Они удаляют за собой свои записи.
