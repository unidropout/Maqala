import Image from "next/image";
import Link from "next/link";
import { googleConfigured } from "@/lib/auth/google";
import { fitDisplay } from "@/lib/fit";
import { getDict, href, type Lang } from "@/lib/i18n";

/** Общий вид страниц входа и регистрации: заголовок, кнопка Google, форма, ссылка на вторую страницу. */
export function AuthCard({
  lang,
  title,
  children,
  switchText,
  switchLink,
  switchHref,
}: {
  lang: Lang;
  title: string;
  children: React.ReactNode;
  switchText: string;
  switchLink: string;
  switchHref: string;
}) {
  const t = getDict(lang).auth;
  return (
    <div className="mx-auto grid max-w-5xl items-center gap-10 py-12 md:grid-cols-[1fr_1fr]">
      <div className="fit hidden min-w-0 md:block">
        <h1 className="display" style={fitDisplay(title, 6)}>
          {title}
        </h1>
        <Image src="/art/book.webp" alt="" width={868} height={514} className="sticker mt-10 w-72 -rotate-3" />
      </div>
      <div className="card p-6 sm:p-8">
        <h1 className="display text-4xl md:hidden">{title}</h1>
        {googleConfigured() && (
          <>
            <a href={`/api/auth/google?lang=${lang}`} className="btn-outline mt-6 w-full md:mt-0">
              <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5">
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7Z" />
                <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1 .7-2.4 1.1-4 1.1-3.1 0-5.7-2.1-6.6-4.9h-4v3.1A12 12 0 0 0 12 24Z" />
                <path fill="#FBBC05" d="M5.4 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
                <path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z" />
              </svg>
              {t.withGoogle}
            </a>
            <p className="label my-5 text-center">{t.or}</p>
          </>
        )}
        <div className={googleConfigured() ? "" : "mt-6 md:mt-0"}>{children}</div>
        <p className="mt-6 text-center text-sm text-muted">
          {switchText}{" "}
          <Link href={href(lang, switchHref)} className="font-medium text-fg underline underline-offset-2">
            {switchLink}
          </Link>
        </p>
      </div>
    </div>
  );
}
