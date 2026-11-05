import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { WorkCard } from "@/components/WorkCard";
import { countryName, formatNumber } from "@/lib/format";
import { fitDisplay } from "@/lib/fit";
import { href } from "@/lib/i18n";
import { alternates, pageLang } from "@/lib/i18n/server";
import { getCountryStats } from "@/lib/works";

type Props = { params: Promise<{ lang: string; code: string }> };

function parseCode(code: string): string | null {
  return /^[a-z]{2}$/i.test(code) ? code.toUpperCase() : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, t } = await pageLang(params);
  const code = parseCode((await params).code);
  if (!code) return {};
  return { title: t.country.title(countryName(code, lang)), alternates: alternates(lang, `/countries/${code.toLowerCase()}`) };
}

export default async function CountryPage({ params }: Props) {
  const { lang, t } = await pageLang(params);
  const code = parseCode((await params).code);
  if (!code) notFound();
  const stats = await getCountryStats(code);
  if (stats.total === 0) notFound();

  const maxYear = Math.max(...stats.byYear.map((y) => y.count));
  const maxField = Math.max(...stats.byField.map((f) => f.count), 1);

  return (
    <div className="py-10">
      <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.1fr]">
        <div className="fit min-w-0">
          <p className="label">{code}</p>
          <h1 className="display mt-3" style={fitDisplay(countryName(code, lang), 8)}>
            {countryName(code, lang)}
          </h1>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <div className="card flex items-center gap-4 px-6 py-4">
              <span aria-hidden className="dot" />
              <span className="display text-4xl">{formatNumber(stats.total, lang)}</span>
              <span className="label">{t.country.total}</span>
            </div>
            <Link href={href(lang, `/search?country=${code}`)} className="btn">
              {t.country.all} →
            </Link>
          </div>
        </div>
        {code === "KZ" ? (
          <Image
            src="/art/kazakhstan.webp"
            alt={t.country.mapAlt}
            width={1260}
            height={704}
            priority
            className="sticker mx-auto w-full max-w-lg -rotate-2"
          />
        ) : (
          <Image src="/art/globe.webp" alt="" width={765} height={765} className="sticker mx-auto w-56 rotate-6 md:w-72" />
        )}
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        <section className="card flex flex-col p-6">
          <h2 className="display text-3xl">{t.country.byYear}</h2>
          <div className="mt-6 flex min-h-48 flex-1 items-end gap-0.5" role="img" aria-label={t.country.byYear}>
            {stats.byYear.map((y) => (
              <Link
                key={y.year}
                href={href(lang, `/search?country=${code}&year_from=${y.year}&year_to=${y.year}`)}
                title={`${y.year}: ${formatNumber(y.count, lang)}`}
                className="group relative flex-1 rounded-t-full bg-ink/70 transition hover:bg-ink"
                style={{ height: `${Math.max((y.count / maxYear) * 100, 2)}%` }}
              >
                <span className="sr-only">
                  {y.year}: {y.count}
                </span>
              </Link>
            ))}
          </div>
          <div className="label mt-2 flex justify-between">
            <span>{stats.byYear[0]?.year}</span>
            <span>{stats.byYear.at(-1)?.year}</span>
          </div>
        </section>

        <section className="card p-6">
          <h2 className="display text-3xl">{t.country.byField}</h2>
          <ul className="mt-4 space-y-2">
            {stats.byField.map((f) => (
              <li key={f.value}>
                <Link
                  href={href(lang, `/search?country=${code}&field=${encodeURIComponent(f.value)}`)}
                  className="group block text-sm"
                >
                  <span className="flex justify-between">
                    <span className="group-hover:underline group-hover:underline-offset-2">{f.value}</span>
                    <span className="text-muted">{formatNumber(f.count, lang)}</span>
                  </span>
                  <span className="mt-1 block h-2 rounded-full bg-soft">
                    <span
                      className="block h-full rounded-full bg-ink/70 transition group-hover:bg-ink"
                      style={{ width: `${(f.count / maxField) * 100}%` }}
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="mt-12 grid gap-10 lg:grid-cols-2">
        <section>
          <h2 className="display text-4xl">{t.country.topCited}</h2>
          <div className="mt-4 space-y-4">
            {stats.topCited.map((w) => (
              <WorkCard key={w.id} work={w} lang={lang} />
            ))}
          </div>
        </section>
        <section>
          <h2 className="display text-4xl">{t.country.recent}</h2>
          <div className="mt-4 space-y-4">
            {stats.recent.map((w) => (
              <WorkCard key={w.id} work={w} lang={lang} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
