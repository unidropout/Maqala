import Link from "next/link";
import { ADMIN_PAGE_SIZE, listAudit, parsePage } from "@/lib/admin/queries";
import { requireUser } from "@/lib/auth/session";
import { INTL_LOCALES, href } from "@/lib/i18n";
import { pageLang } from "@/lib/i18n/server";

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ page?: string }>;
};

export default async function AdminAuditPage({ params, searchParams }: Props) {
  const { lang, t } = await pageLang(params);
  await requireUser(lang, "superadmin");
  const page = parsePage((await searchParams).page);
  const rows = await listAudit(page);
  const a = t.admin.audit;
  const time = (value: string) => new Date(value).toLocaleString(INTL_LOCALES[lang], { dateStyle: "medium", timeStyle: "short" });

  return (
    <div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="label">
            <tr>
              <th className="px-4 py-3 font-medium">{a.when}</th>
              <th className="px-4 py-3 font-medium">{a.actor}</th>
              <th className="px-4 py-3 font-medium">{a.action}</th>
              <th className="px-4 py-3 font-medium">{a.target}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/20">
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-muted">
                  {t.admin.empty}
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="whitespace-nowrap px-4 py-3 text-muted">{time(row.created_at)}</td>
                <td className="px-4 py-3">{row.actor_name ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-xs">{row.action}</td>
                <td className="px-4 py-3">
                  {row.target_type === "work" && row.target_id ? (
                    <Link href={href(lang, `/admin/works/${row.target_id}`)} className="underline underline-offset-2">
                      work #{row.target_id}
                    </Link>
                  ) : (
                    `${row.target_type} #${row.target_id ?? "—"}`
                  )}
                  {Object.keys(row.details).length > 0 && (
                    <span className="block text-xs text-muted">{JSON.stringify(row.details).slice(0, 200)}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <nav className="mt-6 flex justify-between text-sm">
        {page > 1 ? <Link href={href(lang, `/admin/audit?page=${page - 1}`)} className="btn-outline px-4 py-2">{t.pagination.prev}</Link> : <span />}
        {rows.length === ADMIN_PAGE_SIZE ? <Link href={href(lang, `/admin/audit?page=${page + 1}`)} className="btn-outline px-4 py-2">{t.pagination.next}</Link> : <span />}
      </nav>
    </div>
  );
}
