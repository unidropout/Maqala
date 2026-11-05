import Link from "next/link";
import { setWorkHidden } from "@/lib/admin/actions";
import { ADMIN_PAGE_SIZE, listWorks, parsePage, type AdminWorkFilter } from "@/lib/admin/queries";
import { requireUser } from "@/lib/auth/session";
import { languageName } from "@/lib/format";
import { href } from "@/lib/i18n";
import { pageLang } from "@/lib/i18n/server";

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ q?: string; filter?: string; page?: string }>;
};

const FILTERS: AdminWorkFilter[] = ["all", "hidden", "edited", "manual"];

export default async function AdminWorksPage({ params, searchParams }: Props) {
  const { lang, t } = await pageLang(params);
  await requireUser(lang, "editor");
  const sp = await searchParams;
  const q = sp.q ?? "";
  const filter = FILTERS.includes(sp.filter as AdminWorkFilter) ? (sp.filter as AdminWorkFilter) : "all";
  const page = parsePage(sp.page);
  const works = await listWorks(q, filter, page);
  const a = t.admin;
  const link = (changes: Record<string, string | number>) => {
    const query = new URLSearchParams({ ...(q && { q }), filter, page: String(page), ...Object.fromEntries(Object.entries(changes).map(([k, v]) => [k, String(v)])) });
    return href(lang, `/admin?${query}`);
  };

  return (
    <div>
      <form className="flex flex-wrap gap-2" action={href(lang, "/admin")}>
        <input type="hidden" name="filter" value={filter} />
        <input name="q" defaultValue={q} placeholder={a.search} className="min-w-0 flex-1 rounded-full border border-line/40 bg-surface px-5 py-2.5 focus:border-ink focus:outline-none" />
        <button type="submit" className="btn py-2.5">
          {a.find}
        </button>
      </form>
      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        {FILTERS.map((f) => (
          <Link key={f} href={link({ filter: f, page: 1 })} className={`chip px-3 py-1 text-sm ${f === filter ? "border-ink text-fg" : ""}`}>
            {a.filter[f]}
          </Link>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {works.length === 0 && <p className="card p-6 text-muted">{a.empty}</p>}
        {works.map((w) => (
          <article key={w.id} className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <div className="label flex flex-wrap gap-x-3">
                <span>#{w.id}</span>
                {w.publication_year && <span>{w.publication_year}</span>}
                {w.language && <span>{languageName(w.language, lang)}</span>}
                <span>{w.source}</span>
                {w.is_hidden && <span className="text-fg">● {a.hidden}</span>}
                {w.edited_at && <span className="text-fg">● {a.edited}</span>}
              </div>
              <p className="mt-1 font-medium">{w.title}</p>
              {w.hidden_reason && <p className="mt-1 text-sm text-muted">{w.hidden_reason}</p>}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Link href={href(lang, `/admin/works/${w.id}`)} className="btn-outline px-4 py-2 text-sm">
                {a.edit}
              </Link>
              <form action={setWorkHidden} className="flex gap-2">
                <input type="hidden" name="lang" value={lang} />
                <input type="hidden" name="id" value={w.id} />
                <input type="hidden" name="hidden" value={w.is_hidden ? "0" : "1"} />
                {!w.is_hidden && (
                  <input name="reason" placeholder={a.reason} maxLength={500} className="w-36 rounded-full border border-line/40 bg-bg px-3 py-2 text-sm focus:border-ink focus:outline-none" />
                )}
                <button type="submit" className="btn px-4 py-2 text-sm">
                  {w.is_hidden ? a.unhide : a.hide}
                </button>
              </form>
            </div>
          </article>
        ))}
      </div>

      <nav className="mt-6 flex justify-between text-sm">
        {page > 1 ? <Link href={link({ page: page - 1 })} className="btn-outline px-4 py-2">{t.pagination.prev}</Link> : <span />}
        {works.length === ADMIN_PAGE_SIZE ? <Link href={link({ page: page + 1 })} className="btn-outline px-4 py-2">{t.pagination.next}</Link> : <span />}
      </nav>
    </div>
  );
}
