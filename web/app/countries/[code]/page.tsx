import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { WorkCard } from "@/components/WorkCard";
import { countryName, formatNumber } from "@/lib/format";
import { ru } from "@/lib/i18n";
import { getCountryStats } from "@/lib/works";

type Props = { params: Promise<{ code: string }> };

function parseCode(code: string): string | null {
  return /^[a-z]{2}$/i.test(code) ? code.toUpperCase() : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const code = parseCode((await params).code);
  return code ? { title: `Наука: ${countryName(code)}` } : {};
}

export default async function CountryPage({ params }: Props) {
  const code = parseCode((await params).code);
  if (!code) notFound();
  const stats = await getCountryStats(code);
  if (stats.total === 0) notFound();

  const maxYear = Math.max(...stats.byYear.map((y) => y.count));
  const maxField = Math.max(...stats.byField.map((f) => f.count), 1);

  return (
    <div className="py-10">
      <p className="text-sm uppercase tracking-widest text-accent">{code}</p>
      <h1 className="mt-2 font-serif text-4xl font-bold sm:text-5xl">{countryName(code)}</h1>
      <p className="mt-4 text-lg">
        <span className="font-serif text-3xl font-bold">{formatNumber(stats.total)}</span>{" "}
        <span className="text-muted">{ru.country.total}</span>
      </p>
      <Link
        href={`/search?country=${code}`}
        className="mt-6 inline-block rounded-full bg-accent px-6 py-3 font-medium text-white hover:bg-accent/90"
      >
        {ru.country.all} →
      </Link>

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-surface p-6">
          <h2 className="font-serif text-xl font-bold">{ru.country.byYear}</h2>
          <div className="mt-6 flex h-48 items-end gap-0.5" role="img" aria-label={ru.country.byYear}>
            {stats.byYear.map((y) => (
              <Link
                key={y.year}
                href={`/search?country=${code}&year_from=${y.year}&year_to=${y.year}`}
                title={`${y.year}: ${formatNumber(y.count)}`}
                className="group relative flex-1 rounded-t bg-accent/70 hover:bg-gold"
                style={{ height: `${Math.max((y.count / maxYear) * 100, 2)}%` }}
              >
                <span className="sr-only">
                  {y.year}: {y.count}
                </span>
              </Link>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted">
            <span>{stats.byYear[0]?.year}</span>
            <span>{stats.byYear.at(-1)?.year}</span>
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-6">
          <h2 className="font-serif text-xl font-bold">{ru.country.byField}</h2>
          <ul className="mt-4 space-y-2">
            {stats.byField.map((f) => (
              <li key={f.value}>
                <Link
                  href={`/search?country=${code}&field=${encodeURIComponent(f.value)}`}
                  className="group block text-sm"
                >
                  <span className="flex justify-between">
                    <span className="group-hover:text-accent">{f.value}</span>
                    <span className="text-muted">{formatNumber(f.count)}</span>
                  </span>
                  <span className="mt-1 block h-1.5 rounded-full bg-line">
                    <span
                      className="block h-full rounded-full bg-accent group-hover:bg-gold"
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
          <h2 className="font-serif text-2xl font-bold">{ru.country.topCited}</h2>
          <div className="mt-4 space-y-4">
            {stats.topCited.map((w) => (
              <WorkCard key={w.id} work={w} />
            ))}
          </div>
        </section>
        <section>
          <h2 className="font-serif text-2xl font-bold">{ru.country.recent}</h2>
          <div className="mt-4 space-y-4">
            {stats.recent.map((w) => (
              <WorkCard key={w.id} work={w} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
