import { ru } from "@/lib/i18n";

export function SearchBox({ defaultValue = "", large = false }: { defaultValue?: string; large?: boolean }) {
  return (
    <form action="/search" method="get" role="search" className="flex w-full gap-2">
      <label htmlFor="q" className="sr-only">
        {ru.search.placeholder}
      </label>
      <input
        id="q"
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder={ru.search.placeholder}
        autoComplete="off"
        className={`min-w-0 flex-1 rounded-full border border-line bg-surface px-5 text-fg placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 ${large ? "h-14 text-lg" : "h-11"}`}
      />
      <button
        type="submit"
        className={`shrink-0 rounded-full bg-accent font-medium text-white transition hover:bg-accent/90 ${large ? "h-14 px-5 text-lg sm:px-7" : "h-11 px-4 sm:px-5"}`}
      >
        {ru.search.button}
      </button>
    </form>
  );
}
