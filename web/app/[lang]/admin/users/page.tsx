import Link from "next/link";
import { setUserBlocked, setUserRole } from "@/lib/admin/actions";
import { ADMIN_PAGE_SIZE, listUsers, parsePage } from "@/lib/admin/queries";
import { requireUser, type Role } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { href } from "@/lib/i18n";
import { pageLang } from "@/lib/i18n/server";

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
};

const ROLES: Role[] = ["user", "editor", "superadmin"];

export default async function AdminUsersPage({ params, searchParams }: Props) {
  const { lang, t } = await pageLang(params);
  const me = await requireUser(lang, "superadmin");
  const sp = await searchParams;
  const q = sp.q ?? "";
  const page = parsePage(sp.page);
  const users = await listUsers(q, page);
  const u = t.admin.users;
  const pageLink = (p: number) => href(lang, `/admin/users?${new URLSearchParams({ ...(q && { q }), page: String(p) })}`);

  return (
    <div>
      <form className="flex flex-wrap gap-2" action={href(lang, "/admin/users")}>
        <input name="q" defaultValue={q} placeholder={t.admin.searchUsers} className="min-w-0 flex-1 rounded-full border border-line/40 bg-surface px-5 py-2.5 focus:border-ink focus:outline-none" />
        <button type="submit" className="btn py-2.5">
          {t.admin.find}
        </button>
      </form>

      <div className="mt-6 space-y-3">
        {users.length === 0 && <p className="card p-6 text-muted">{t.admin.empty}</p>}
        {users.map((user) => {
          const self = user.id === me.id;
          return (
            <article key={user.id} className="card flex flex-col gap-3 p-5 lg:flex-row lg:items-center">
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {user.name} {user.is_blocked && <span className="chip ml-2">{u.blocked}</span>}
                </p>
                <p className="break-all text-sm text-muted">
                  {user.email}
                  {user.has_google && " · Google"}
                </p>
                <p className="label mt-1">
                  {u.registered}: {formatDate(user.created_at, lang)}
                  {user.last_login_at && ` · ${u.lastLogin}: ${formatDate(user.last_login_at, lang)}`}
                </p>
              </div>
              {self ? (
                <span className="chip">{t.profile.roles[user.role]}</span>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <form action={setUserRole} className="flex gap-2">
                    <input type="hidden" name="lang" value={lang} />
                    <input type="hidden" name="id" value={user.id} />
                    <select name="role" defaultValue={user.role} aria-label={u.role} className="rounded-full border border-line/40 bg-bg px-3 py-2 text-sm">
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {t.profile.roles[role]}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="btn-outline px-4 py-2 text-sm">
                      {u.change}
                    </button>
                  </form>
                  <form action={setUserBlocked}>
                    <input type="hidden" name="lang" value={lang} />
                    <input type="hidden" name="id" value={user.id} />
                    <input type="hidden" name="blocked" value={user.is_blocked ? "0" : "1"} />
                    <button type="submit" className="btn px-4 py-2 text-sm">
                      {user.is_blocked ? u.unblock : u.block}
                    </button>
                  </form>
                </div>
              )}
            </article>
          );
        })}
      </div>

      <nav className="mt-6 flex justify-between text-sm">
        {page > 1 ? <Link href={pageLink(page - 1)} className="btn-outline px-4 py-2">{t.pagination.prev}</Link> : <span />}
        {users.length === ADMIN_PAGE_SIZE ? <Link href={pageLink(page + 1)} className="btn-outline px-4 py-2">{t.pagination.next}</Link> : <span />}
      </nav>
    </div>
  );
}
