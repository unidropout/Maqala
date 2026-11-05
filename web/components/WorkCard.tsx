import Link from "next/link";
import { countryName, formatNumber, languageName, licenseName, truncate } from "@/lib/format";
import { getDict, href, type Lang } from "@/lib/i18n";
import type { WorkCard as WorkCardData } from "@/lib/works";

export function LicenseBadge({ license, lang }: { license: string | null; lang: Lang }) {
  return license ? (
    <span className="inline-flex items-center rounded-full bg-ink px-2.5 py-0.5 text-xs font-medium text-bg">
      {licenseName(license)}
    </span>
  ) : (
    <span className="chip">{getDict(lang).work.noLicense}</span>
  );
}

// Казахстан — фокус проекта, поэтому в карточке он всегда первым.
function sortCountries(countries: string[]): string[] {
  return [...countries].sort((a, b) => Number(b === "KZ") - Number(a === "KZ"));
}

export function WorkCard({ work, lang }: { work: WorkCardData; lang: Lang }) {
  const t = getDict(lang).work;
  const more = work.authors_total - work.authors.length;
  const countries = sortCountries(work.countries);
  return (
    <article className="card group relative p-5 transition hover:border-line/70 sm:p-6">
      <div className="label flex flex-wrap items-center gap-x-3 gap-y-1">
        <span aria-hidden className="dot h-2 w-2" />
        {work.publication_year && <span>{work.publication_year}</span>}
        {work.language && <span>{languageName(work.language, lang)}</span>}
        {work.journal && <span className="normal-case tracking-normal">{truncate(work.journal, 60)}</span>}
      </div>
      <h3 className="mt-3 text-lg font-semibold leading-snug text-fg">
        <Link
          href={href(lang, `/works/${work.id}`)}
          className="after:absolute after:inset-0 group-hover:underline group-hover:underline-offset-4"
        >
          {work.title}
        </Link>
      </h3>
      {work.authors.length > 0 && (
        <p className="mt-2 text-sm text-muted">
          {work.authors.map((a) => a.name).join(", ")}
          {more > 0 && ` ${t.moreAuthors(more)}`}
        </p>
      )}
      {work.abstract && <p className="mt-3 text-sm leading-relaxed text-fg/80">{truncate(work.abstract, 260)}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <LicenseBadge license={work.license} lang={lang} />
        {countries.slice(0, 4).map((c) => (
          <span key={c} className="chip">
            {countryName(c, lang)}
          </span>
        ))}
        {countries.length > 4 && <span className="text-xs text-muted">+{countries.length - 4}</span>}
        {work.cited_by_count > 0 && (
          <span className="ml-auto text-xs text-muted">
            {t.citations}: {formatNumber(work.cited_by_count, lang)}
          </span>
        )}
      </div>
    </article>
  );
}
