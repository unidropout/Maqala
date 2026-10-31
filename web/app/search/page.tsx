import type { Metadata } from "next";
import Link from "next/link";
import { Filters } from "@/components/Filters";
import { FiltersToggle } from "@/components/FiltersToggle";
import { Pagination } from "@/components/Pagination";
import { SearchBox } from "@/components/SearchBox";
import { WorkCard } from "@/components/WorkCard";
import { ru } from "@/lib/i18n";
import { searchHref } from "@/lib/url";
import { getFacets, parseFilters, searchWorks, type Sort } from "@/lib/works";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = parseFilters(await searchParams);
  return { title: q ? `«${q}»` : ru.nav.search, robots: { index: false } };
}

export default async function SearchPage({ searchParams }: Props) {
  const filters = parseFilters(await searchParams);
  const [{ total, items }, facets] = await Promise.all([searchWorks(filters), getFacets(filters)]);
  const activeFilters =
    filters.countries.length +
    [filters.yearFrom || filters.yearTo, filters.field, filters.language, filters.license].filter(Boolean).length;
  const sorts: Sort[] = filters.q ? ["relevance", "date", "cited"] : ["cited", "date"];

  return (
    <div className="py-8">
      <div className="max-w-3xl">
        <SearchBox defaultValue={filters.q} />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[280px_1fr]">
        <FiltersToggle active={activeFilters}>
          <Filters filters={filters} facets={facets} />
        </FiltersToggle>

        <section aria-live="polite" className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-lg font-semibold">{ru.search.results(total)}</h1>
            <div className="flex flex-wrap items-center gap-1 text-sm">
              <span className="mr-1 text-muted">{ru.sort.label}:</span>
              {sorts.map((s) => (
                <Link
                  key={s}
                  href={searchHref(filters, { sort: s })}
                  aria-current={filters.sort === s ? "true" : undefined}
                  className={`rounded-full px-3 py-1 ${filters.sort === s ? "bg-fg text-bg" : "hover:bg-surface"}`}
                >
                  {ru.sort[s]}
                </Link>
              ))}
            </div>
          </div>

          {items.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-line p-10 text-center">
              <p className="font-serif text-xl font-semibold">{ru.search.nothing}</p>
              <p className="mt-2 text-muted">{ru.search.nothingHint}</p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {items.map((w) => (
                <WorkCard key={w.id} work={w} />
              ))}
            </div>
          )}

          <Pagination filters={filters} total={total} />
        </section>
      </div>
    </div>
  );
}
