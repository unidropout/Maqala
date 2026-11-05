import Link from "next/link";
import { countryName, formatNumber, languageName, licenseName } from "@/lib/format";
import { getDict, href, type Lang } from "@/lib/i18n";
import { searchHref, toggle } from "@/lib/url";
import type { FacetValue, Facets, Filters as FiltersData } from "@/lib/works";

function FacetList({
  title,
  values,
  isActive,
  hrefFor,
  label,
  lang,
}: {
  title: string;
  values: FacetValue[];
  isActive: (v: string) => boolean;
  hrefFor: (v: string) => string;
  label: (v: string) => string;
  lang: Lang;
}) {
  if (!values.length) return null;
  return (
    <div className="border-t border-line/20 py-4">
      <h3 className="label mb-2">{title}</h3>
      <ul className="space-y-0.5">
        {values.map(({ value, count }) => {
          const active = isActive(value);
          return (
            <li key={value}>
              <Link
                href={hrefFor(value)}
                aria-current={active ? "true" : undefined}
                className={`flex items-center justify-between gap-2 rounded-full px-3 py-1.5 text-sm transition hover:bg-soft ${active ? "bg-soft font-medium text-fg" : ""}`}
              >
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${active ? "border-ink" : "border-line/40"}`}
                  >
                    {active && <span className="h-2 w-2 rounded-full bg-ink" />}
                  </span>
                  {label(value)}
                </span>
                <span className="text-xs text-muted">{formatNumber(count, lang)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function Filters({ filters: f, facets, lang }: { filters: FiltersData; facets: Facets; lang: Lang }) {
  const t = getDict(lang);
  const link = (changes: Partial<FiltersData>) => searchHref(lang, f, changes);
  const single = (current: string | null, v: string) => (current === v ? null : v);
  const hasFilters = f.countries.length > 0 || f.yearFrom || f.yearTo || f.field || f.language || f.license;
  const reset = link({ countries: [], yearFrom: null, yearTo: null, field: null, language: null, license: null });
  const input = "w-20 rounded-full border border-line/40 bg-bg px-3 py-1.5 focus:border-ink focus:outline-none";

  return (
    <aside aria-label={t.filters.title} className="card h-fit p-4 sm:p-5">
      <div className="flex items-center justify-between pb-2">
        <h2 className="display text-2xl">{t.filters.title}</h2>
        {hasFilters && (
          <Link href={reset} className="text-sm text-muted underline underline-offset-2 hover:text-fg">
            {t.search.resetFilters}
          </Link>
        )}
      </div>

      <FacetList
        lang={lang}
        title={t.filters.country}
        values={facets.country}
        isActive={(v) => f.countries.includes(v)}
        hrefFor={(v) => link({ countries: toggle(f.countries, v) })}
        label={(v) => countryName(v, lang)}
      />

      <form action={href(lang, "/search")} method="get" className="border-t border-line/20 py-4">
        <h3 className="label mb-2">{t.filters.year}</h3>
        {/* Остальные фильтры передаются скрытыми полями, чтобы не потеряться. */}
        {f.q && <input type="hidden" name="q" value={f.q} />}
        {f.countries.map((c) => (
          <input key={c} type="hidden" name="country" value={c} />
        ))}
        {f.field && <input type="hidden" name="field" value={f.field} />}
        {f.language && <input type="hidden" name="language" value={f.language} />}
        {f.license && <input type="hidden" name="license" value={f.license} />}
        <div className="flex items-center gap-2 text-sm">
          <label className="flex items-center gap-1">
            {t.filters.yearFrom}
            <input name="year_from" type="number" min={1900} max={2100} defaultValue={f.yearFrom ?? ""} className={input} />
          </label>
          <label className="flex items-center gap-1">
            {t.filters.yearTo}
            <input name="year_to" type="number" min={1900} max={2100} defaultValue={f.yearTo ?? ""} className={input} />
          </label>
        </div>
        <button type="submit" className="btn-outline mt-3 px-4 py-1.5 text-sm">
          {t.filters.apply}
        </button>
      </form>

      <FacetList
        lang={lang}
        title={t.filters.field}
        values={facets.field}
        isActive={(v) => f.field === v}
        hrefFor={(v) => link({ field: single(f.field, v) })}
        label={(v) => v}
      />
      <FacetList
        lang={lang}
        title={t.filters.language}
        values={facets.language}
        isActive={(v) => f.language === v}
        hrefFor={(v) => link({ language: single(f.language, v) })}
        label={(v) => languageName(v, lang)}
      />
      <FacetList
        lang={lang}
        title={t.filters.license}
        values={facets.license}
        isActive={(v) => f.license === v}
        hrefFor={(v) => link({ license: single(f.license, v) })}
        label={(v) => (v === "none" ? t.filters.noLicense : licenseName(v))}
      />
    </aside>
  );
}
