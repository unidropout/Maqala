import Link from "next/link";
import { ru } from "@/lib/i18n";

export function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4">
        <Link href="/" className="font-serif text-2xl font-semibold tracking-tight">
          Maqala<span className="text-gold">.</span>
        </Link>
        <nav aria-label="Основная навигация" className="flex items-center text-sm sm:gap-2">
          <Link href="/search" className="rounded-full px-2 py-2 hover:bg-surface sm:px-3">
            {ru.nav.search}
          </Link>
          <Link href="/countries/kz" className="rounded-full px-2 py-2 hover:bg-surface sm:px-3">
            {ru.nav.kazakhstan}
          </Link>
          <Link href="/about" className="rounded-full px-2 py-2 hover:bg-surface sm:px-3">
            {ru.nav.about}
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-20 border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted sm:flex-row sm:justify-between">
        <p>Maqala — {ru.tagline.toLowerCase()}</p>
        <p>
          Данные:{" "}
          <a href="https://openalex.org" className="underline hover:text-fg">
            OpenAlex
          </a>{" "}
          (CC0) · <Link href="/about" className="underline hover:text-fg">{ru.nav.about}</Link>
        </p>
      </div>
    </footer>
  );
}
