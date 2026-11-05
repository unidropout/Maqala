import { href, type Lang } from "./i18n";
import type { Filters } from "./works";

/** Параметры URL для фильтров; пустые значения не попадают в адрес. */
export function filtersToParams(f: Filters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  for (const c of f.countries) p.append("country", c);
  if (f.yearFrom) p.set("year_from", String(f.yearFrom));
  if (f.yearTo) p.set("year_to", String(f.yearTo));
  if (f.field) p.set("field", f.field);
  if (f.language) p.set("language", f.language);
  if (f.license) p.set("license", f.license);
  if (f.sort !== (f.q ? "relevance" : "cited")) p.set("sort", f.sort);
  if (f.page > 1) p.set("page", String(f.page));
  return p;
}

/** Ссылка на выдачу с изменёнными фильтрами. При смене фильтров страница сбрасывается на первую. */
export function searchHref(lang: Lang, f: Filters, changes: Partial<Filters>): string {
  const next = { ...f, page: 1, ...changes };
  const query = filtersToParams(next).toString();
  return href(lang, query ? `/search?${query}` : "/search");
}

export function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}
