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

-- Полнотекстовый поиск (FR-1): название весит больше аннотации.
-- Конфигурация simple одинаково работает для русского, казахского и английского,
-- но не учитывает морфологию (решение 007 в docs/decisions.md).
alter table works add column if not exists search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(abstract, '')), 'B')
) stored;
create index if not exists works_search_idx on works using gin (search_vector);
-- Фильтры и сортировки выдачи (FR-2, FR-3).
create index if not exists works_year_idx on works (publication_year);
create index if not exists works_cited_idx on works (cited_by_count desc);
create index if not exists works_date_idx on works (publication_date desc nulls last);

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

-- Модерация статей (админка). Скрытая статья не видна на сайте; исправленную вручную
-- (edited_at не пусто) коннектор больше не перезаписывает.
alter table works add column if not exists is_hidden boolean not null default false;
alter table works add column if not exists hidden_reason text;
alter table works add column if not exists edited_at timestamptz;

-- Пользователи. Роли: user — обычный, editor — правит статьи, superadmin — всё, включая
-- пользователей и загрузки. Первого superadmin назначают командой npm run set-role.
create table if not exists users (
    id             bigint generated always as identity primary key,
    email          text        not null,
    email_verified boolean     not null default false,  -- подтверждена Google
    name           text        not null,
    password_hash  text,                                 -- пусто, если вход только через Google
    google_sub     text unique,
    role           text        not null default 'user'
                   check (role in ('user', 'editor', 'superadmin')),
    lang           text        not null default 'ru' check (lang in ('ru', 'kk', 'en')),
    theme          text        not null default 'system' check (theme in ('system', 'light', 'dark')),
    is_blocked     boolean     not null default false,
    created_at     timestamptz not null default now(),
    updated_at     timestamptz not null default now(),
    last_login_at  timestamptz
);
create unique index if not exists users_email_uq on users (lower(email));

-- Сессии: в cookie лежит случайный токен, здесь — только его SHA-256.
create table if not exists sessions (
    id         text        primary key,
    user_id    bigint      not null references users (id) on delete cascade,
    created_at timestamptz not null default now(),
    expires_at timestamptz not null
);
create index if not exists sessions_user_idx on sessions (user_id);

create table if not exists favorites (
    user_id    bigint      not null references users (id) on delete cascade,
    work_id    bigint      not null references works (id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (user_id, work_id)
);

-- Журнал действий в админке: кто, что и когда изменил.
create table if not exists audit_log (
    id          bigint generated always as identity primary key,
    actor_id    bigint      references users (id) on delete set null,
    action      text        not null,
    target_type text        not null,
    target_id   text,
    details     jsonb       not null default '{}',
    created_at  timestamptz not null default now()
);
create index if not exists audit_log_created_idx on audit_log (created_at desc);

-- Очередь загрузок, которые запросили из админки. Выполняет python -m ingest.worker.
create table if not exists ingest_jobs (
    id           bigint generated always as identity primary key,
    params       jsonb       not null,
    status       text        not null default 'queued'
                 check (status in ('queued', 'running', 'done', 'failed')),
    requested_by bigint      references users (id) on delete set null,
    run_id       bigint      references ingest_runs (id) on delete set null,
    error        text,
    created_at   timestamptz not null default now(),
    started_at   timestamptz,
    finished_at  timestamptz
);
