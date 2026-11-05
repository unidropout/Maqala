import { getDict, href, type Lang } from "@/lib/i18n";

export function SearchBox({
  lang,
  defaultValue = "",
  large = false,
}: {
  lang: Lang;
  defaultValue?: string;
  large?: boolean;
}) {
  const t = getDict(lang).search;
  return (
    <form
      action={href(lang, "/search")}
      method="get"
      role="search"
      className={`flex w-full items-center gap-2 rounded-full border border-line/40 bg-surface p-1.5 transition focus-within:border-ink ${large ? "sm:p-2" : ""}`}
    >
      <label htmlFor="q" className="sr-only">
        {t.placeholder}
      </label>
      <svg aria-hidden viewBox="0 0 24 24" className="ml-3 h-5 w-5 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" strokeLinecap="round" />
      </svg>
      <input
        id="q"
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder={t.placeholder}
        autoComplete="off"
        className={`min-w-0 flex-1 bg-transparent text-fg placeholder:text-muted focus:outline-none ${large ? "h-12 text-lg" : "h-10"}`}
      />
      <button type="submit" className={`btn shrink-0 ${large ? "h-12 px-5 sm:px-8" : "h-10 px-4 sm:px-5"}`}>
        {t.button}
      </button>
    </form>
  );
}
