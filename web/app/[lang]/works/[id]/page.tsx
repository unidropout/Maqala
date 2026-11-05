import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LicenseBadge } from "@/components/WorkCard";
import { countryName, formatDate, formatNumber, languageName, licenseName, safeUrl, truncate } from "@/lib/format";
import { href } from "@/lib/i18n";
import { alternates, pageLang } from "@/lib/i18n/server";
import { getWork } from "@/lib/works";

type Props = { params: Promise<{ lang: string; id: string }> };

const SOURCE_NAMES: Record<string, { name: string; url: (id: string) => string }> = {
  openalex: { name: "OpenAlex", url: (id) => `https://openalex.org/${id}` },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await pageLang(params);
  const { id } = await params;
  const work = await getWork(Number(id));
  if (!work) return {};
  return {
    title: work.title,
    description: work.abstract ? truncate(work.abstract, 160) : undefined,
    alternates: alternates(lang, `/works/${id}`),
  };
}

export default async function WorkPage({ params }: Props) {
  const { lang, t } = await pageLang(params);
  const work = await getWork(Number((await params).id));
  if (!work) notFound();

  const source = SOURCE_NAMES[work.source];
  const landingUrl = safeUrl(work.landing_url);
  const oaUrl = safeUrl(work.oa_url);
  const details: [string, React.ReactNode][] = [
    [t.work.journal, work.journal],
    [t.work.date, formatDate(work.publication_date, lang) ?? work.publication_year],
    [t.work.type, work.work_type],
    [t.work.language, work.language ? languageName(work.language, lang) : t.filters.unknown],
    [t.work.license, work.license ? licenseName(work.license) : t.work.noLicense],
    [t.work.field, [work.field, work.subfield].filter(Boolean).join(" → ") || null],
    [t.work.topic, work.topic],
    [t.work.citations, formatNumber(work.cited_by_count, lang)],
    ["DOI", work.doi && <a href={`https://doi.org/${work.doi}`} className="break-all underline underline-offset-2">{work.doi}</a>],
    [t.work.countries, work.countries.map((c) => countryName(c, lang)).join(", ")],
    [
      t.work.source,
      source ? (
        <a href={source.url(work.source_id)} className="underline underline-offset-2">
          {source.name}
        </a>
      ) : (
        work.source
      ),
    ],
  ];

  return (
    <article className="mx-auto max-w-4xl py-10">
      <Link href={href(lang, "/search")} className="label hover:text-fg">
        {t.work.back}
      </Link>

      <div className="label mt-8 flex flex-wrap items-center gap-2">
        <LicenseBadge license={work.license} lang={lang} />
        {work.publication_year && <span>{work.publication_year}</span>}
        {work.journal && <span>· {work.journal}</span>}
      </div>
      <h1 className="mt-4 text-3xl font-semibold leading-tight text-fg sm:text-4xl">{work.title}</h1>

      <div className="mt-6 flex flex-wrap gap-3">
        {landingUrl && (
          <a
            href={landingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn"
          >
            {t.work.readOriginal} ↗
          </a>
        )}
        {oaUrl && oaUrl !== landingUrl && (
          <a
            href={oaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline"
          >
            {t.work.freeVersion} ↗
          </a>
        )}
      </div>

      <section className="mt-10">
        <h2 className="display text-3xl">{t.work.abstract}</h2>
        <p className={`mt-3 leading-relaxed ${work.abstract ? "" : "text-muted"}`}>
          {work.abstract ?? t.work.noAbstract}
        </p>
      </section>

      {work.authors.length > 0 && (
        <section className="mt-10">
          <h2 className="display text-3xl">
            {t.work.authors} <span className="text-base font-normal text-muted">({work.authors_total})</span>
          </h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {work.authors.slice(0, 30).map((a, i) => (
              <li key={i} className="rounded-2xl border border-line/30 bg-surface p-4 text-sm">
                <p className="font-medium">
                  {a.name}
                  {a.orcid && (
                    <a href={`https://orcid.org/${a.orcid}`} className="ml-2 text-xs text-muted underline underline-offset-2">
                      ORCID
                    </a>
                  )}
                </p>
                {a.institutions.map((inst, j) => (
                  <p key={j} className="mt-1 text-muted">
                    {inst.name}
                    {inst.country && ` · ${countryName(inst.country, lang)}`}
                  </p>
                ))}
              </li>
            ))}
          </ul>
          {work.authors_total > 30 && (
            <p className="mt-3 text-sm text-muted">{t.work.moreAuthors(work.authors_total - 30)}</p>
          )}
        </section>
      )}

      <section className="mt-10">
        <h2 className="display text-3xl">{t.work.details}</h2>
        <dl className="card mt-4 divide-y divide-line/20 overflow-hidden">
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
