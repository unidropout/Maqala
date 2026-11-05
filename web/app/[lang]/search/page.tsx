import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Filters } from "@/components/Filters";
import { FiltersToggle } from "@/components/FiltersToggle";
import { Pagination } from "@/components/Pagination";
import { SearchBox } from "@/components/SearchBox";
import { WorkCard } from "@/components/WorkCard";
import { formatNumber } from "@/lib/format";
import { pageLang } from "@/lib/i18n/server";
import { searchHref } from "@/lib/url";
import { getFacets, parseFilters, searchWorks, type Sort } from "@/lib/works";

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { t } = await pageLang(params);
  const { q } = parseFilters(await searchParams);
  return { title: q ? `«${q}»` : t.nav.search, robots: { index: false } };
}

export default async function SearchPage({ params, searchParams }: Props) {
  const { lang, t } = await pageLang(params);
  const filters = parseFilters(await searchParams);
  const [{ total, items }, facets] = await Promise.all([searchWorks(filters), getFacets(filters)]);
  const activeFilters =
    filters.countries.length +
    [filters.yearFrom || filters.yearTo, filters.field, filters.language, filters.license].filter(Boolean).length;
  const sorts: Sort[] = filters.q ? ["relevance", "date", "cited"] : ["cited", "date"];

  return (
    <div className="py-8">
      <div className="max-w-3xl">
        <SearchBox lang={lang} defaultValue={filters.q} />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[280px_1fr]">
        <FiltersToggle label={t.filters.title} active={activeFilters}>
          <Filters filters={filters} facets={facets} lang={lang} />
        </FiltersToggle>

        <section aria-live="polite" className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="display text-4xl">{t.search.results(formatNumber(total, lang), total)}</h1>
            <div className="flex flex-wrap items-center gap-1 text-sm">
              <span className="label mr-1">{t.sort.label}</span>
              {sorts.map((s) => (
                <Link
                  key={s}
                  href={searchHref(lang, filters, { sort: s })}
                  aria-current={filters.sort === s ? "true" : undefined}
                  className={`rounded-full border px-3.5 py-1.5 transition ${filters.sort === s ? "border-ink bg-ink text-bg" : "border-line/30 hover:border-ink"}`}
                >
                  {t.sort[s]}
                </Link>
              ))}
            </div>
          </div>

          {items.length === 0 ? (
            <div className="card mt-6 flex flex-col items-center p-10 text-center">
              <Image src="/art/magnifier.webp" alt="" width={734} height={734} className="sticker w-28 -rotate-12" />
              <p className="display mt-6 text-3xl">{t.search.nothing}</p>
              <p className="mt-2 text-muted">{t.search.nothingHint}</p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {items.map((w) => (
                <WorkCard key={w.id} work={w} lang={lang} />
              ))}
            </div>
          )}

          <Pagination filters={filters} total={total} lang={lang} />
        </section>
      </div>
    </div>
  );
}
