import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LicenseBadge } from "@/components/WorkCard";
import { countryName, formatDate, formatNumber, languageName, licenseName, truncate } from "@/lib/format";
import { ru } from "@/lib/i18n";
import { getWork } from "@/lib/works";

type Props = { params: Promise<{ id: string }> };

const SOURCE_NAMES: Record<string, { name: string; url: (id: string) => string }> = {
  openalex: { name: "OpenAlex", url: (id) => `https://openalex.org/${id}` },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const work = await getWork(Number((await params).id));
  if (!work) return {};
  return { title: work.title, description: work.abstract ? truncate(work.abstract, 160) : undefined };
}

export default async function WorkPage({ params }: Props) {
  const work = await getWork(Number((await params).id));
  if (!work) notFound();

  const source = SOURCE_NAMES[work.source];
  const details: [string, React.ReactNode][] = [
    [ru.work.journal, work.journal],
    [ru.work.date, formatDate(work.publication_date) ?? work.publication_year],
    [ru.work.type, work.work_type],
    [ru.work.language, work.language ? languageName(work.language) : ru.filters.unknown],
    [ru.work.license, work.license ? licenseName(work.license) : ru.work.noLicense],
    [ru.work.field, [work.field, work.subfield].filter(Boolean).join(" → ") || null],
    [ru.work.topic, work.topic],
    [ru.work.citations, formatNumber(work.cited_by_count)],
    ["DOI", work.doi && <a href={`https://doi.org/${work.doi}`} className="break-all text-accent underline">{work.doi}</a>],
    [ru.work.countries, work.countries.map(countryName).join(", ")],
    [
      ru.work.source,
      source ? (
        <a href={source.url(work.source_id)} className="text-accent underline">
          {source.name}
        </a>
      ) : (
        work.source
      ),
    ],
  ];

  return (
    <article className="mx-auto max-w-4xl py-10">
      <Link href="/search" className="text-sm text-muted hover:text-accent">
        {ru.work.back}
      </Link>

      <div className="mt-6 flex flex-wrap items-center gap-2 text-sm text-muted">
        <LicenseBadge license={work.license} />
        {work.publication_year && <span>{work.publication_year}</span>}
        {work.journal && <span>· {work.journal}</span>}
      </div>
      <h1 className="mt-3 font-serif text-3xl font-bold leading-tight sm:text-4xl">{work.title}</h1>

      <div className="mt-6 flex flex-wrap gap-3">
        {work.landing_url && (
          <a
            href={work.landing_url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-accent px-6 py-3 font-medium text-white hover:bg-accent/90"
          >
            {ru.work.readOriginal} ↗
          </a>
        )}
        {work.oa_url && work.oa_url !== work.landing_url && (
          <a
            href={work.oa_url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-line px-6 py-3 font-medium hover:border-accent hover:text-accent"
          >
            {ru.work.freeVersion} ↗
          </a>
        )}
      </div>

      <section className="mt-10">
        <h2 className="font-serif text-xl font-bold">{ru.work.abstract}</h2>
        <p className={`mt-3 leading-relaxed ${work.abstract ? "" : "text-muted"}`}>
          {work.abstract ?? ru.work.noAbstract}
        </p>
      </section>

      {work.authors.length > 0 && (
        <section className="mt-10">
          <h2 className="font-serif text-xl font-bold">
            {ru.work.authors} <span className="text-base font-normal text-muted">({work.authors_total})</span>
          </h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {work.authors.slice(0, 30).map((a, i) => (
              <li key={i} className="rounded-xl border border-line bg-surface p-3 text-sm">
                <p className="font-medium">
                  {a.name}
                  {a.orcid && (
                    <a href={`https://orcid.org/${a.orcid}`} className="ml-2 text-xs text-accent underline">
                      ORCID
                    </a>
                  )}
                </p>
                {a.institutions.map((inst, j) => (
                  <p key={j} className="mt-1 text-muted">
                    {inst.name}
                    {inst.country && ` · ${countryName(inst.country)}`}
                  </p>
                ))}
              </li>
            ))}
          </ul>
          {work.authors_total > 30 && (
            <p className="mt-3 text-sm text-muted">{ru.work.moreAuthors(work.authors_total - 30)}</p>
          )}
        </section>
      )}

      <section className="mt-10">
        <h2 className="font-serif text-xl font-bold">{ru.work.details}</h2>
        <dl className="mt-3 divide-y divide-line rounded-2xl border border-line bg-surface">
          {details
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <div key={label} className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[200px_1fr]">
                <dt className="text-muted">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
        </dl>
      </section>
    </article>
  );
}
