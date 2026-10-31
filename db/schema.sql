-- Схема базы Maqala: единая схема статьи (ТЗ §6.2) и лог загрузок (ТЗ §6.3).
-- Скрипт идемпотентный: его можно применять повторно к уже существующей базе.

-- Статьи из всех источников в едином формате.
create table if not exists works (
    id                bigint generated always as identity primary key,

    -- Откуда запись и её id в источнике. Пара уникальна: по ней делается upsert.
    source            text        not null,
    source_id         text        not null,

    doi               text,                       -- без префикса https://doi.org/, в нижнем регистре
    title             text        not null,
    abstract          text,                       -- может быть пустой (ТЗ §6.4)
    publication_year  integer,
    publication_date  date,
    language          text,                       -- ISO 639-1, может быть пустым
    work_type         text,                       -- article, review, book-chapter, ...

    license           text,                       -- cc-by, cc-by-nc-nd, ...; пусто, если неизвестна
    is_oa             boolean     not null default false,
    oa_status         text,                       -- gold, green, hybrid, bronze, diamond, closed

    landing_url       text,                       -- страница оригинала
    oa_url            text,                       -- бесплатный текст (страница или PDF)

    journal           text,
    field             text,                       -- область науки, например Medicine
    subfield          text,
    topic             text,

    cited_by_count    integer     not null default 0,
    countries         text[]      not null default '{}',   -- ISO 3166-1 alpha-2 стран авторов
    -- [{"name": "...", "orcid": "...", "institutions": [{"name": "...", "country": "KZ"}]}]
    authors           jsonb       not null default '[]',

    raw               jsonb,                      -- исходная запись источника (без тяжёлых полей)
    source_updated_at timestamptz,                -- когда запись изменилась в источнике
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now(),

    constraint works_source_uq unique (source, source_id),
    constraint works_title_not_blank check (btrim(title) <> '')
);

-- Дедупликация между источниками и поиск по DOI.
create index if not exists works_doi_idx on works (doi) where doi is not null;
-- Фильтр «страна» и страница страны (FR-2, FR-6).
create index if not exists works_countries_idx on works using gin (countries);

-- Лог каждого запуска коннектора.
create table if not exists ingest_runs (
    id            bigint generated always as identity primary key,
    source        text        not null,
    params        jsonb       not null default '{}',
    status        text        not null default 'running'
                  check (status in ('running', 'success', 'failed')),
    started_at    timestamptz not null default now(),
    finished_at   timestamptz,
    fetched       integer     not null default 0,  -- получено из источника
    inserted      integer     not null default 0,  -- добавлено новых
    updated       integer     not null default 0,  -- обновлено существующих
    skipped       integer     not null default 0,  -- отброшено: нет названия или дубль по DOI
    errors        integer     not null default 0,  -- записи, которые не удалось обработать
    error_message text
);
