import Link from "next/link";
import { countryName, formatNumber, licenseName, truncate } from "@/lib/format";
import { ru } from "@/lib/i18n";
import type { WorkCard as WorkCardData } from "@/lib/works";

export function LicenseBadge({ license }: { license: string | null }) {
  return license ? (
    <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
      {licenseName(license)}
    </span>
  ) : (
    <span className="rounded-full border border-line px-2 py-0.5 text-xs text-muted">{ru.work.noLicense}</span>
  );
}

// Казахстан — фокус проекта, поэтому в карточке он всегда первым.
function sortCountries(countries: string[]): string[] {
  return [...countries].sort((a, b) => Number(b === "KZ") - Number(a === "KZ"));
}

export function WorkCard({ work }: { work: WorkCardData }) {
  const more = work.authors_total - work.authors.length;
  const countries = sortCountries(work.countries);
  return (
    <article className="group relative rounded-2xl border border-line bg-surface p-5 transition hover:border-accent/50">
      <h3 className="font-serif text-lg font-semibold leading-snug">
        <Link href={`/works/${work.id}`} className="after:absolute after:inset-0 group-hover:text-accent">
          {work.title}
        </Link>
      </h3>
      {work.authors.length > 0 && (
        <p className="mt-2 text-sm text-muted">
          {work.authors.map((a) => a.name).join(", ")}
          {more > 0 && ` ${ru.work.moreAuthors(more)}`}
        </p>
      )}
      <p className="mt-1 text-sm text-muted">
        {[work.publication_year, work.journal].filter(Boolean).join(" · ")}
      </p>
      {work.abstract && <p className="mt-3 text-sm leading-relaxed">{truncate(work.abstract, 280)}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        <LicenseBadge license={work.license} />
        {countries.slice(0, 4).map((c) => (
          <span key={c} className="rounded-full border border-line px-2 py-0.5 text-muted">
            {countryName(c)}
          </span>
        ))}
        {work.countries.length > 4 && <span className="text-muted">+{work.countries.length - 4}</span>}
        {work.cited_by_count > 0 && (
          <span className="ml-auto text-muted">
            {ru.work.citations}: {formatNumber(work.cited_by_count)}
          </span>
        )}
      </div>
    </article>
  );
}
