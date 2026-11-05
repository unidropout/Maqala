import Link from "next/link";
import { notFound } from "next/navigation";
import { WorkForm } from "@/components/admin/AdminForms";
import { requireUser } from "@/lib/auth/session";
import { href } from "@/lib/i18n";
import { pageLang } from "@/lib/i18n/server";
import { getWork } from "@/lib/works";

type Props = {
  params: Promise<{ lang: string; id: string }>;
  searchParams: Promise<{ created?: string }>;
};

export default async function AdminWorkPage({ params, searchParams }: Props) {
  const { lang, t } = await pageLang(params);
  await requireUser(lang, "editor");
  const work = await getWork(Number((await params).id), true);
  if (!work) notFound();
  const { created } = await searchParams;

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={href(lang, "/admin")} className="label hover:text-fg">
          {t.admin.back}
        </Link>
        <Link href={href(lang, `/works/${work.id}`)} className="label hover:text-fg">
          {t.admin.open} ↗
        </Link>
      </div>
      <p className="label mt-6">
        #{work.id} · {work.source}
      </p>
      <div className="card mt-3 p-6 sm:p-8">
        <WorkForm lang={lang} t={t.admin} values={work} initialOk={created ? t.admin.created : undefined} />
      </div>
    </div>
  );
}
