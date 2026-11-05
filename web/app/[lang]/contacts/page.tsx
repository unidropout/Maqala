import type { Metadata } from "next";
import Image from "next/image";
import { fitDisplay } from "@/lib/fit";
import { alternates, pageLang, type LangParams } from "@/lib/i18n/server";
import { SITE } from "@/lib/site";

export async function generateMetadata({ params }: LangParams): Promise<Metadata> {
  const { lang, t } = await pageLang(params);
  return { title: t.contacts.title, alternates: alternates(lang, "/contacts") };
}

const ICONS = {
  telegram: (
    <path d="M21.5 4.3 2.9 11.5c-1.3.5-1.2 1.3-.2 1.6l4.8 1.5 1.8 5.6c.2.6.4.8.9.8.4 0 .6-.2.9-.4l2.3-2.2 4.7 3.5c.9.5 1.5.2 1.7-.8l3.1-14.6c.3-1.3-.5-1.9-1.4-1.5ZM9.6 14l8.2-7.5c.4-.3-.1-.5-.6-.2l-10 6.4" />
  ),
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </>
  ),
};

function SocialCard({
  name,
  icon,
  url,
  text,
  soon,
  open,
}: {
  name: string;
  icon: keyof typeof ICONS;
  url: string | null;
  text: string;
  soon: string;
  open: string;
}) {
  const body = (
    <>
      <span className="grid h-14 w-14 place-items-center rounded-full bg-ink text-bg">
        <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
          {ICONS[icon]}
        </svg>
      </span>
      <h2 className="display mt-8 text-4xl">{name}</h2>
      <p className="mt-2 text-sm text-muted">{text}</p>
      <span className={`mt-6 ${url ? "btn" : "chip px-4 py-2 text-sm"}`}>{url ? `${open} ↗` : soon}</span>
    </>
  );
  return url ? (
    <a href={url} target="_blank" rel="noopener noreferrer" className="card flex flex-col items-start p-8 transition hover:border-line/70">
      {body}
    </a>
  ) : (
    <div className="card flex flex-col items-start p-8">{body}</div>
  );
}

export default async function ContactsPage({ params }: LangParams) {
  const { t } = await pageLang(params);
  const c = t.contacts;
  return (
    <div className="fit py-12">
      <p className="label">{c.label}</p>
      <h1 className="display mt-3" style={fitDisplay(c.title, 8)}>
        {c.title}
      </h1>
      <p className="mt-6 max-w-xl text-lg text-muted">{c.intro}</p>

      <div className="mt-12 grid gap-4 md:grid-cols-2">
        <SocialCard name="Telegram" icon="telegram" url={SITE.telegram} text={c.telegram} soon={c.soon} open={c.open} />
        <SocialCard name="Instagram" icon="instagram" url={SITE.instagram} text={c.instagram} soon={c.soon} open={c.open} />
      </div>

      <section className="card relative mt-4 overflow-hidden p-8 sm:p-10">
        <div className="max-w-lg">
          <span aria-hidden className="dot" />
          <h2 className="display mt-6 text-4xl sm:text-5xl">{c.github.title}</h2>
          <p className="mt-3 text-muted">{c.github.text}</p>
          <a href={SITE.github} target="_blank" rel="noopener noreferrer" className="btn mt-6">
            <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
              <path d="m12 2 2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17l-6.1 3.4 1.5-6.8L2.2 9l6.9-.7L12 2Z" />
            </svg>
            {c.github.button}
          </a>
        </div>
        <Image
          src="/art/globe.webp"
          alt=""
          width={765}
          height={765}
          className="sticker absolute -bottom-16 -right-10 hidden w-64 rotate-12 md:block"
        />
      </section>
    </div>
  );
}
