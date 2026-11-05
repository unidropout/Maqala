import type { Metadata } from "next";
import Image from "next/image";
import { fitDisplay } from "@/lib/fit";
import { alternates, pageLang, type LangParams } from "@/lib/i18n/server";

export async function generateMetadata({ params }: LangParams): Promise<Metadata> {
  const { lang, t } = await pageLang(params);
  return { title: t.about.title, alternates: alternates(lang, "/about") };
}

export default async function AboutPage({ params }: LangParams) {
  const { t } = await pageLang(params);
  return (
    <article className="py-12">
      <div className="grid items-center gap-8 md:grid-cols-[1.5fr_1fr]">
        <div className="fit min-w-0">
          <p className="label">{t.about.label}</p>
          <h1 className="display mt-3" style={fitDisplay(t.about.title, 7)}>
            {t.about.title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed">{t.about.intro}</p>
        </div>
        <Image src="/art/book.webp" alt="" width={868} height={514} className="sticker mx-auto w-72 -rotate-3" />
      </div>

      <div className="mt-14 grid gap-4 md:grid-cols-3">
        {t.about.sections.map((section) => (
          <section key={section.title} className="card p-6">
            <span aria-hidden className="dot" />
            <h2 className="display mt-6 text-3xl">{section.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">{section.text}</p>
          </section>
        ))}
      </div>
    </article>
  );
}
