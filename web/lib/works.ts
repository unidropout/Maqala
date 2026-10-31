import { pool } from "./db";

export const PAGE_SIZE = 20;
const MAX_PAGE = 500;

export type Sort = "relevance" | "date" | "cited";

export type Filters = {
  q: string;
  countries: string[];
  yearFrom: number | null;
  yearTo: number | null;
  field: string | null;
  language: string | null;
  license: string | null; // "none" — статьи без лицензии
  sort: Sort;
  page: number;
};

export type Author = {
  name: string;
  orcid: string | null;
  institutions: { name: string; country: string | null }[];
};

export type WorkCard = {
  id: number;
  title: string;
  abstract: string | null;
  publication_year: number | null;
  journal: string | null;
  license: string | null;
  countries: string[];
  cited_by_count: number;
  authors: Author[];
  authors_total: number;
};

export type Work = WorkCard & {
  doi: string | null;
  source: string;
  source_id: string;
  publication_date: string | null;
  language: string | null;
  work_type: string | null;
  oa_status: string | null;
  landing_url: string | null;
  oa_url: string | null;
  field: string | null;
  subfield: string | null;
  topic: string | null;
};

export type FacetValue = { value: string; count: number };
export type Facets = Record<"country" | "field" | "language" | "license", FacetValue[]>;

type Params = Record<string, string | string[] | undefined> | URLSearchParams;

function getAll(params: Params, key: string): string[] {
  if (params instanceof URLSearchParams) return params.getAll(key);
  const value = params[key];
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function getOne(params: Params, key: string): string | null {
  const value = getAll(params, key)[0]?.trim();
  return value ? value : null;
}

function toYear(value: string | null): number | null {
  if (!value || !/^\d{4}$/.test(value)) return null;
  return Number(value);
}

/** Разбирает параметры URL в фильтры. Неверные значения молча отбрасываются. */
export function parseFilters(params: Params): Filters {
  const q = (getOne(params, "q") ?? "").slice(0, 200);
  const sortParam = getOne(params, "sort");
  const sort: Sort =
    sortParam === "date" || sortParam === "cited" || sortParam === "relevance"
      ? sortParam
      : q
        ? "relevance"
        : "cited";
  const page = Number(getOne(params, "page"));
  return {
    q,
    countries: getAll(params, "country")
      .flatMap((c) => c.split(","))
      .map((c) => c.trim().toUpperCase())
      .filter((c) => /^[A-Z]{2}$/.test(c)),
    yearFrom: toYear(getOne(params, "year_from")),
    yearTo: toYear(getOne(params, "year_to")),
    field: getOne(params, "field"),
    language: getOne(params, "language"),
    license: getOne(params, "license"),
    sort,
    page: Number.isInteger(page) && page >= 1 ? Math.min(page, MAX_PAGE) : 1,
  };
}

type Facet = keyof Facets;

/** Условия WHERE для фильтров. Фасет, для которого считаются количества, можно исключить. */
function buildWhere(f: Filters, exclude?: Facet) {
  const where: string[] = [];
  const params: unknown[] = [];
  const add = (sql: (n: string) => string, value: unknown) => {
    params.push(value);
    where.push(sql(`$${params.length}`));
  };

  if (f.q) add((n) => `search_vector @@ websearch_to_tsquery('simple', ${n})`, f.q);
  if (f.countries.length && exclude !== "country") add((n) => `countries && ${n}::text[]`, f.countries);
  if (f.yearFrom) add((n) => `publication_year >= ${n}`, f.yearFrom);
  if (f.yearTo) add((n) => `publication_year <= ${n}`, f.yearTo);
  if (f.field && exclude !== "field") add((n) => `field = ${n}`, f.field);
  if (f.language && exclude !== "language") add((n) => `language = ${n}`, f.language);
  if (f.license && exclude !== "license") {
    if (f.license === "none") where.push("license is null");
    else add((n) => `license = ${n}`, f.license);
  }

  return { sql: where.length ? `where ${where.join(" and ")}` : "", params };
}

const CARD_COLUMNS = `
  id, title, abstract, publication_year, journal, license, countries, cited_by_count,
  (select coalesce(jsonb_agg(a), '[]') from (select a from jsonb_array_elements(authors) a limit 5) s) as authors,
  jsonb_array_length(authors) as authors_total
`;

export async function searchWorks(f: Filters): Promise<{ total: number; items: WorkCard[] }> {
  const { sql, params } = buildWhere(f);
  let order = "cited_by_count desc, id";
  if (f.sort === "date") order = "publication_date desc nulls last, id";
  if (f.sort === "relevance" && f.q) {
    params.push(f.q);
    order = `ts_rank_cd(search_vector, websearch_to_tsquery('simple', $${params.length})) desc, cited_by_count desc, id`;
  }
  const offset = (f.page - 1) * PAGE_SIZE;

  const [count, rows] = await Promise.all([
    pool.query<{ total: number }>(`select count(*)::int as total from works ${sql}`, buildWhere(f).params),
    pool.query<WorkCard>(
      `select ${CARD_COLUMNS} from works ${sql} order by ${order} limit ${PAGE_SIZE} offset ${offset}`,
      params,
    ),
  ]);
  return { total: count.rows[0].total, items: rows.rows };
}

const FACET_SQL: Record<Facet, (where: string) => string> = {
  country: (w) =>
    `select c as value, count(*)::int as count from works cross join unnest(countries) c ${w}
     group by c order by count desc, c limit 12`,
  field: (w) =>
    `select field as value, count(*)::int as count from works ${w ? `${w} and` : "where"} field is not null
     group by field order by count desc, field limit 12`,
  language: (w) =>
    `select language as value, count(*)::int as count from works ${w ? `${w} and` : "where"} language is not null
     group by language order by count desc, language limit 8`,
  license: (w) =>
    `select coalesce(license, 'none') as value, count(*)::int as count from works ${w}
     group by 1 order by count desc, 1 limit 8`,
};

/** Значения фильтров с количеством статей с учётом остальных выбранных фильтров (FR-2). */
export async function getFacets(f: Filters): Promise<Facets> {
  const facets = Object.keys(FACET_SQL) as Facet[];
  const results = await Promise.all(
    facets.map((facet) => {
      const { sql, params } = buildWhere(f, facet);
      return pool.query<FacetValue>(FACET_SQL[facet](sql), params);
    }),
  );
  return Object.fromEntries(facets.map((facet, i) => [facet, results[i].rows])) as Facets;
}

export async function getWork(id: number): Promise<Work | null> {
  if (!Number.isSafeInteger(id) || id < 1) return null;
  const { rows } = await pool.query<Work>(
    `select id, title, abstract, publication_year, publication_date::text, journal, license, countries,
            cited_by_count, authors, jsonb_array_length(authors) as authors_total, doi, source, source_id,
            language, work_type, oa_status, landing_url, oa_url, field, subfield, topic
     from works where id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function getStats() {
  const { rows } = await pool.query<{ total: number; kz: number; oa: number }>(
    `select count(*)::int as total,
            count(*) filter (where 'KZ' = any(countries))::int as kz,
            count(*) filter (where is_oa)::int as oa
     from works`,
  );
  return rows[0];
}

export async function getTopCited(limit: number, country?: string): Promise<WorkCard[]> {
  const { rows } = await pool.query<WorkCard>(
    `select ${CARD_COLUMNS} from works ${country ? "where countries @> array[$2]::text[]" : ""}
     order by cited_by_count desc, id limit $1`,
    country ? [limit, country] : [limit],
  );
  return rows;
}

export async function getCountryStats(code: string) {
  const [total, byYear, byField, recent, top] = await Promise.all([
    pool.query<{ total: number }>(`select count(*)::int as total from works where countries @> array[$1]::text[]`, [code]),
    pool.query<{ year: number; count: number }>(
      `select publication_year as year, count(*)::int as count from works
       where countries @> array[$1]::text[] and publication_year is not null
       group by 1 order by 1`,
      [code],
    ),
    pool.query<FacetValue>(
      `select field as value, count(*)::int as count from works
       where countries @> array[$1]::text[] and field is not null
       group by 1 order by 2 desc limit 10`,
      [code],
    ),
    pool.query<WorkCard>(
      `select ${CARD_COLUMNS} from works where countries @> array[$1]::text[]
       order by publication_date desc nulls last, id limit 5`,
      [code],
    ),
    getTopCited(5, code),
  ]);
  return {
    total: total.rows[0].total,
    byYear: byYear.rows,
    byField: byField.rows,
    recent: recent.rows,
    topCited: top,
  };
}
