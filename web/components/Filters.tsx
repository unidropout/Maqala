import Link from "next/link";
import { countryName, formatNumber, languageName, licenseName } from "@/lib/format";
import { ru } from "@/lib/i18n";
import { searchHref, toggle } from "@/lib/url";
import type { FacetValue, Facets, Filters as FiltersData } from "@/lib/works";

function FacetList({
  title,
  values,
  isActive,
  hrefFor,
  label,
}: {
  title: string;
  values: FacetValue[];
  isActive: (v: string) => boolean;
  hrefFor: (v: string) => string;
  label: (v: string) => string;
}) {
  if (!values.length) return null;
  return (
    <div className="border-t border-line py-4">
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <ul className="space-y-0.5">
        {values.map(({ value, count }) => {
          const active = isActive(value);
          return (
            <li key={value}>
              <Link
                href={hrefFor(value)}
                aria-current={active ? "true" : undefined}
                className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-bg ${active ? "font-medium text-accent" : ""}`}
              >
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className={`grid h-4 w-4 shrink-0 place-items-center rounded border text-[10px] ${active ? "border-accent bg-accent text-white" : "border-line"}`}
                  >
                    {active && "✓"}
                  </span>
                  {label(value)}
                </span>
                <span className="text-xs text-muted">{formatNumber(count)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function Filters({ filters: f, facets }: { filters: FiltersData; facets: Facets }) {
  const single = (current: string | null, v: string) => (current === v ? null : v);
  const hasFilters =
    f.countries.length > 0 || f.yearFrom || f.yearTo || f.field || f.language || f.license;
  const reset = searchHref(f, {
    countries: [],
    yearFrom: null,
    yearTo: null,
    field: null,
    language: null,
    license: null,
  });
  const input = "w-20 rounded-lg border border-line bg-bg px-2 py-1";

  return (
    <aside aria-label={ru.filters.title} className="h-fit rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between pb-2">
        <h2 className="font-semibold">{ru.filters.title}</h2>
        {hasFilters && (
          <Link href={reset} className="text-sm text-accent underline">
            {ru.search.resetFilters}
          </Link>
        )}
      </div>

      <FacetList
        title={ru.filters.country}
        values={facets.country}
        isActive={(v) => f.countries.includes(v)}
        hrefFor={(v) => searchHref(f, { countries: toggle(f.countries, v) })}
        label={countryName}
      />

      <form action="/search" method="get" className="border-t border-line py-4">
        <h3 className="mb-2 text-sm font-semibold">{ru.filters.year}</h3>
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
            {ru.filters.yearFrom}
            <input name="year_from" type="number" min={1900} max={2100} defaultValue={f.yearFrom ?? ""} className={input} />
          </label>
          <label className="flex items-center gap-1">
            {ru.filters.yearTo}
            <input name="year_to" type="number" min={1900} max={2100} defaultValue={f.yearTo ?? ""} className={input} />
          </label>
        </div>
        <button
          type="submit"
          className="mt-3 rounded-full border border-line px-4 py-1 text-sm hover:border-accent hover:text-accent"
        >
          {ru.filters.apply}
        </button>
      </form>

      <FacetList
        title={ru.filters.field}
        values={facets.field}
        isActive={(v) => f.field === v}
        hrefFor={(v) => searchHref(f, { field: single(f.field, v) })}
        label={(v) => v}
      />
      <FacetList
        title={ru.filters.language}
        values={facets.language}
        isActive={(v) => f.language === v}
        hrefFor={(v) => searchHref(f, { language: single(f.language, v) })}
        label={languageName}
      />
      <FacetList
        title={ru.filters.license}
        values={facets.license}
        isActive={(v) => f.license === v}
        hrefFor={(v) => searchHref(f, { license: single(f.license, v) })}
        label={(v) => (v === "none" ? ru.filters.noLicense : licenseName(v))}
      />
    </aside>
  );
}
