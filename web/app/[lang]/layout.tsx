import type { Metadata } from "next";
import { Inter, Oswald } from "next/font/google";
import { Footer, Header } from "@/components/Header";
import { getCurrentUser } from "@/lib/auth/session";
import { LANGS } from "@/lib/i18n";
import { alternates, pageLang, type LangParams } from "@/lib/i18n/server";
import { THEME_KEY } from "@/lib/theme";
import "../globals.css";

// Оба шрифта поддерживают кириллицу, включая казахские буквы (ә, ғ, қ, ң, ө, ұ, ү, һ, і).
const sans = Inter({ subsets: ["latin", "cyrillic", "cyrillic-ext"], variable: "--font-sans" });
const display = Oswald({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  weight: ["500", "600"],
  variable: "--font-display",
});

// Выставляет сохранённую тему до отрисовки, чтобы страница не мигала другой темой.
const themeScript = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LangParams): Promise<Metadata> {
  const { lang, t } = await pageLang(params);
  return {
    title: { default: `Maqala — ${t.tagline}`, template: "%s — Maqala" },
    description: t.heroText,
    alternates: alternates(lang),
  };
}

export default async function RootLayout({ children, params }: LangParams & { children: React.ReactNode }) {
  const { lang, t } = await pageLang(params);
  // Тема из профиля; выбор переключателем в этом браузере (localStorage) всё равно главнее.
  const user = await getCurrentUser();
  const theme = user && user.theme !== "system" ? user.theme : undefined;
  return (
    <html lang={lang} data-theme={theme} className={`${sans.variable} ${display.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen font-sans">
        <a href="#main" className="btn sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-20">
          {t.skipToContent}
        </a>
        <Header lang={lang} />
        <main id="main" className="mx-auto max-w-6xl break-words px-4">
          {children}
        </main>
        <Footer lang={lang} />
      </body>
    </html>
  );
}
