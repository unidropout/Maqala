import Link from "next/link";
import { Suspense } from "react";
import { LangSwitcher } from "@/components/LangSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getDict, href, type Lang } from "@/lib/i18n";
import { SITE } from "@/lib/site";

export function Logo() {
  return (
    <span className="flex items-center gap-1.5 font-display text-2xl font-semibold uppercase tracking-tight text-ink">
      Maqala
      <span aria-hidden className="dot h-2.5 w-2.5" />
    </span>
  );
}

function navItems(lang: Lang) {
  const t = getDict(lang).nav;
  return [
    { href: href(lang, "/search"), label: t.search },
    { href: href(lang, "/countries/kz"), label: t.kazakhstan },
    { href: href(lang, "/faq"), label: t.faq },
    { href: href(lang, "/contacts"), label: t.contacts },
    { href: href(lang, "/about"), label: t.about },
  ];
}

export function Header({ lang }: { lang: Lang }) {
  const t = getDict(lang);
  const items = navItems(lang);
  return (
    <header className="sticky top-0 z-10 bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link href={href(lang)} aria-label={t.nav.home}>
          <Logo />
        </Link>
        <div className="flex items-center gap-1">
          {/* На телефоне в шапке только поиск и Казахстан, остальные ссылки — в подвале. */}
          <nav aria-label={t.nav.main} className="flex items-center text-sm">
            {items.map((item, i) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3 py-2 font-medium text-ink transition hover:bg-soft ${i >= 2 ? "hidden lg:block" : "hidden sm:block"}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <Suspense fallback={null}>
            <LangSwitcher lang={lang} label={t.nav.language} />
          </Suspense>
          <ThemeToggle toLight={t.theme.toLight} toDark={t.theme.toDark} />
        </div>
      </div>
    </header>
  );
}

export function Footer({ lang }: { lang: Lang }) {
  const t = getDict(lang);
  return (
    <footer className="mt-24 border-t border-line/20">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-[1fr_auto]">
        <div>
          <Logo />
          <p className="label mt-2">{t.tagline}</p>
          <p className="mt-6 text-sm text-muted">
            {t.footer.data}:{" "}
            <a href="https://openalex.org" className="underline underline-offset-2 hover:text-fg">
              OpenAlex
            </a>{" "}
            (CC0) ·{" "}
            <a href={SITE.github} className="underline underline-offset-2 hover:text-fg">
              GitHub
            </a>
          </p>
        </div>
        <nav aria-label={t.nav.main} className="flex flex-wrap gap-2 sm:max-w-sm sm:justify-end">
          {navItems(lang).map((item) => (
            <Link key={item.href} href={item.href} className="rounded-full border border-line/30 px-4 py-2 text-sm text-ink transition hover:border-ink">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
