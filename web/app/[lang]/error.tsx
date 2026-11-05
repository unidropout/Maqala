"use client";

import { useParams } from "next/navigation";
import { DEFAULT_LANG, getDict, isLang } from "@/lib/i18n";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  const { lang } = useParams<{ lang: string }>();
  const t = getDict(isLang(lang) ? lang : DEFAULT_LANG).error;
  return (
    <div className="py-24 text-center">
      <h1 className="display text-4xl">{t.title}</h1>
      <button type="button" onClick={reset} className="btn mt-6">
        {t.retry}
      </button>
    </div>
  );
}
