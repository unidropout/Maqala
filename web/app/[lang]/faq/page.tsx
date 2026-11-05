import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { fitDisplay } from "@/lib/fit";
import { href } from "@/lib/i18n";
import { alternates, pageLang, type LangParams } from "@/lib/i18n/server";

export async function generateMetadata({ params }: LangParams): Promise<Metadata> {
  const { lang, t } = await pageLang(params);
  return { title: t.faq.title, description: t.faq.label, alternates: alternates(lang, "/faq") };
}

export default async function FaqPage({ params }: LangParams) {
  const { lang, t } = await pageLang(params);
  return (
    <div className="py-12">
      <div className="grid items-center gap-8 md:grid-cols-[1.5fr_1fr]">
        <div className="fit min-w-0">
          <p className="label">{t.faq.label}</p>
          <h1 className="display mt-3" style={fitDisplay(t.faq.title, 8)}>
            {t.faq.title}
          </h1>
        </div>
        <Image src="/art/magnifier.webp" alt="" width={734} height={734} className="sticker mx-auto w-48 rotate-6" />
      </div>

      {/* <details> раскрывается без JavaScript и доступен с клавиатуры. */}
      <div className="mt-12 space-y-3">
        {t.faq.items.map((item) => (
          <details key={item.q} className="card group p-0 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer list-none items-center gap-4 p-5 sm:p-6">
              <span aria-hidden className="dot" />
              <span className="flex-1 text-lg font-semibold">{item.q}</span>
              <span
                aria-hidden
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line/30 text-ink transition group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="px-5 pb-6 leading-relaxed text-muted sm:pl-[3.25rem] sm:pr-16">{item.a}</p>
          </details>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href={href(lang, "/search")} className="btn">
          {t.nav.search} →
        </Link>
        <Link href={href(lang, "/contacts")} className="btn-outline">
          {t.nav.contacts}
        </Link>
      </div>
    </div>
  );
}
