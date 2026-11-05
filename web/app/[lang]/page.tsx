import Image from "next/image";
import Link from "next/link";
import { SearchBox } from "@/components/SearchBox";
import { WorkCard } from "@/components/WorkCard";
import { formatNumber } from "@/lib/format";
import { fitDisplay } from "@/lib/fit";
import { href } from "@/lib/i18n";
import { pageLang, type LangParams } from "@/lib/i18n/server";
import { getStats, getTopCited } from "@/lib/works";

export const dynamic = "force-dynamic";

const EXAMPLES = ["ғылыми мақалалар", "Каспийское море", "нефть", "climate change", "COVID-19"];

export default async function HomePage({ params }: LangParams) {
  const { lang, t } = await pageLang(params);
  const [stats, top] = await Promise.all([getStats(), getTopCited(4, "KZ")]);
  const tiles = [
    { value: stats.total, label: t.home.stats.works, href: href(lang, "/search") },
    { value: stats.kk, label: t.home.stats.kk, href: href(lang, "/search?language=kk") },
    { value: stats.ru, label: t.home.stats.ru, href: href(lang, "/search?language=ru") },
  ];

  return (
    <>
      <section className="grid items-center gap-10 pb-12 pt-10 sm:pt-16 lg:grid-cols-[1.25fr_1fr]">
        <div className="fit min-w-0">
          <p className="label">{t.tagline}</p>
          <h1 className="display mt-4" style={fitDisplay(t.heroTitle, 6)}>
            {t.heroTitle}
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted">{t.heroText}</p>
          <div className="mt-8 max-w-xl">
            <SearchBox lang={lang} large />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="label mr-1">{t.home.examples}:</span>
            {EXAMPLES.map((q) => (
              <Link
                key={q}
                href={href(lang, `/search?q=${encodeURIComponent(q)}`)}
                className="rounded-full border border-line/30 px-3 py-1 text-muted transition hover:border-ink hover:text-fg"
              >
                {q}
              </Link>
            ))}
          </div>
        </div>

        <div className="relative mx-auto aspect-square w-full max-w-md">
          <Image src="/art/globe.webp" alt="" fill priority sizes="(min-width: 1024px) 28rem, 80vw" className="sticker object-contain" />
          <Image src="/art/magnifier.webp" alt="" width={734} height={734} className="sticker absolute -bottom-6 -left-4 w-2/5 -rotate-12" />
          <div className="card absolute -right-2 top-2 hidden w-40 p-4 sm:block">
            <span aria-hidden className="dot" />
            <p className="mt-10 text-xs font-semibold uppercase leading-tight text-ink">{t.home.heroNote}</p>
          </div>
        </div>
      </section>

      <section aria-label={t.home.stats.label} className="grid gap-4 sm:grid-cols-3">
        {tiles.map((tile) => (
          <Link key={tile.label} href={tile.href} className="card group flex flex-col p-6 transition hover:border-line/70">
            <span aria-hidden className="dot" />
            <span className="display mt-8 text-5xl sm:text-6xl">{formatNumber(tile.value, lang)}</span>
            <span className="label mt-2 group-hover:text-fg">{tile.label} →</span>
          </Link>
        ))}
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <Link href={href(lang, "/search?language=kk")} className="card group relative overflow-hidden p-8 transition hover:border-line/70">
          <p className="label">{t.home.kkLabel}</p>
          <h2 className="display mt-3 max-w-[14rem] text-4xl">{t.home.kkCard}</h2>
          <p className="mt-3 max-w-[16rem] text-sm text-muted">{t.home.kkCardText}</p>
          <span className="btn mt-6">{t.home.open} →</span>
          <Image src="/art/letter-q.webp" alt="" width={412} height={660} className="sticker absolute -bottom-6 right-6 w-28 rotate-6 sm:w-36" />
        </Link>
        <Link href={href(lang, "/countries/kz")} className="card group relative overflow-hidden p-8 transition hover:border-line/70">
          <p className="label">{t.home.kzLabel}</p>
          <h2 className="display mt-3 max-w-[14rem] text-4xl">{t.home.kzCard}</h2>
          <p className="mt-3 max-w-[16rem] text-sm text-muted">{t.home.kzCardText}</p>
          <span className="btn mt-6">{t.home.open} →</span>
          <Image src="/art/book.webp" alt="" width={868} height={514} className="sticker absolute -bottom-4 -right-10 w-56 -rotate-6 sm:w-64" />
        </Link>
      </section>

      <section className="mt-20">
        <div className="flex items-end justify-between gap-4">
          <h2 className="display text-5xl sm:text-6xl">{t.home.topCited}</h2>
          <Link href={href(lang, "/search?country=KZ&sort=cited")} className="label hidden hover:text-fg sm:block">
            {t.home.all} →
          </Link>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {top.map((w) => (
            <WorkCard key={w.id} work={w} lang={lang} />
          ))}
        </div>
      </section>
    </>
  );
}
