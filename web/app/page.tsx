import Link from "next/link";
import { SearchBox } from "@/components/SearchBox";
import { WorkCard } from "@/components/WorkCard";
import { formatNumber } from "@/lib/format";
import { ru } from "@/lib/i18n";
import { getStats, getTopCited } from "@/lib/works";

export const dynamic = "force-dynamic";

const EXAMPLES = ["climate change", "COVID-19", "Каспийское море", "нефть", "machine learning"];

export default async function HomePage() {
  const [stats, top] = await Promise.all([getStats(), getTopCited(4, "KZ")]);
  return (
    <>
      <section className="py-16 sm:py-24">
        <p className="text-sm font-medium uppercase tracking-widest text-accent">{ru.tagline}</p>
        <h1 className="mt-4 max-w-3xl font-serif text-4xl font-bold leading-tight sm:text-6xl">
          {ru.heroTitle}
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted">{ru.heroText}</p>
        <div className="mt-8 max-w-2xl">
          <SearchBox large />
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          {EXAMPLES.map((q) => (
            <Link
              key={q}
              href={`/search?q=${encodeURIComponent(q)}`}
              className="rounded-full border border-line px-3 py-1 text-muted hover:border-accent hover:text-accent"
            >
              {q}
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          [stats.total, ru.home.stats.works],
          [stats.kz, ru.home.stats.kz],
          [stats.oa, ru.home.stats.oa],
        ].map(([value, label]) => (
          <div key={label} className="rounded-2xl border border-line bg-surface p-6">
            <p className="font-serif text-4xl font-bold">{formatNumber(value as number)}</p>
            <p className="mt-1 text-muted">{label}</p>
          </div>
        ))}
      </section>

      <section className="mt-12">
        <Link
          href="/countries/kz"
          className="group block rounded-3xl bg-gradient-to-br from-accent to-accent/70 p-8 text-white sm:p-10"
        >
          <p className="text-sm uppercase tracking-widest opacity-80">Қазақстан</p>
          <h2 className="mt-2 font-serif text-3xl font-bold">{ru.home.kzCard}</h2>
          <p className="mt-2 max-w-xl opacity-90">{ru.home.kzCardText}</p>
          <span className="mt-6 inline-block rounded-full bg-white/20 px-5 py-2 font-medium transition group-hover:bg-white/30">
            {ru.home.open} →
          </span>
        </Link>
      </section>

      <section className="mt-12">
        <h2 className="font-serif text-2xl font-bold">{ru.home.topCited}</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {top.map((w) => (
            <WorkCard key={w.id} work={w} />
          ))}
        </div>
      </section>
    </>
  );
}
