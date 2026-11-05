import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/AdminNav";
import { hasRole, requireUser } from "@/lib/auth/session";
import { href } from "@/lib/i18n";
import { pageLang, type LangParams } from "@/lib/i18n/server";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children, params }: LangParams & { children: React.ReactNode }) {
  const { lang, t } = await pageLang(params);
  const user = await requireUser(lang, "editor");
  const tabs = t.admin.tabs;
  const items = [
    { href: href(lang, "/admin"), label: tabs.works },
    { href: href(lang, "/admin/new"), label: tabs.add },
    ...(hasRole(user, "superadmin")
      ? [
          { href: href(lang, "/admin/users"), label: tabs.users },
          { href: href(lang, "/admin/ingest"), label: tabs.ingest },
          { href: href(lang, "/admin/audit"), label: tabs.audit },
        ]
      : []),
  ];
  return (
    <div className="py-10">
      <p className="label">{t.profile.roles[user.role]}</p>
      <h1 className="display mt-2 text-6xl">{t.admin.title}</h1>
      <div className="mt-6">
        <AdminNav items={items} />
      </div>
      <div className="mt-8">{children}</div>
    </div>
  );
}
