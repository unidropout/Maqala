import type { Metadata } from "next";
import { Inter, PT_Serif } from "next/font/google";
import { Footer, Header } from "@/components/Header";
import { ru } from "@/lib/i18n";
import "./globals.css";

// Оба шрифта поддерживают кириллицу, включая казахские буквы (ә, ғ, қ, ң, ө, ұ, ү, һ, і).
const sans = Inter({ subsets: ["latin", "cyrillic", "cyrillic-ext"], variable: "--font-sans" });
const serif = PT_Serif({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  weight: ["400", "700"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: { default: `${ru.siteName} — ${ru.tagline}`, template: `%s — ${ru.siteName}` },
  description: ru.heroText,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${sans.variable} ${serif.variable}`}>
      <body className="min-h-screen font-sans">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-20">
          К содержанию
        </a>
        <Header />
        <main id="main" className="mx-auto max-w-6xl break-words px-4">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
