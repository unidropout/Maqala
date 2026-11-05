"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LANG_LABELS, LANGS, type Lang } from "@/lib/i18n";

/** Ссылки на ту же страницу на других языках, с сохранением поиска и фильтров. */
export function LangSwitcher({ lang, label }: { lang: Lang; label: string }) {
  const pathname = usePathname();
  const query = useSearchParams().toString();
  const rest = pathname.replace(/^\/(ru|kk|en)(?=\/|$)/, "");

  return (
    <nav aria-label={label} className="flex rounded-full border border-line/30 p-0.5 text-xs font-medium">
      {LANGS.map((code) => (
        <Link
          key={code}
          href={`/${code}${rest}${query ? `?${query}` : ""}`}
          hrefLang={code}
          lang={code}
          aria-current={code === lang ? "true" : undefined}
          className={`rounded-full px-2.5 py-1.5 transition ${code === lang ? "bg-ink text-bg" : "text-ink hover:bg-soft"}`}
        >
          {LANG_LABELS[code]}
        </Link>
      ))}
    </nav>
  );
}
