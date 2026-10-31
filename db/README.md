# db

Схема базы данных PostgreSQL.

- `schema.sql` — таблица статей `works` (единая схема, ТЗ §6.2) и лог загрузок `ingest_runs` (ТЗ §6.3).

Все файлы `*.sql` из этой папки выполняются автоматически при **первом** запуске контейнера, когда база ещё пустая. Чтобы применить изменённую схему локально, пересоздай базу (данные удалятся):

```bash
docker compose down -v
docker compose up -d
```

Схема написана идемпотентно (`create ... if not exists`), поэтому новые таблицы и индексы можно добавить без удаления данных:

```bash
docker compose exec db psql -U maqala -d maqala -f /docker-entrypoint-initdb.d/schema.sql
```

В Git Bash на Windows перед командой добавь `MSYS_NO_PATHCONV=1`, иначе путь к файлу исказится.
