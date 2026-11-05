import { WorkForm } from "@/components/admin/AdminForms";
import { requireUser } from "@/lib/auth/session";
import { pageLang, type LangParams } from "@/lib/i18n/server";

export default async function AdminNewWorkPage({ params }: LangParams) {
  const { lang, t } = await pageLang(params);
  await requireUser(lang, "editor");
  return (
    <div className="card max-w-3xl p-6 sm:p-8">
      <h2 className="display text-3xl">{t.admin.tabs.add}</h2>
      <div className="mt-6">
        <WorkForm lang={lang} t={t.admin} />
      </div>
    </div>
  );
}
