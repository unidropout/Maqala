import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { RegisterForm } from "@/components/auth/AuthForms";
import { getCurrentUser } from "@/lib/auth/session";
import { href } from "@/lib/i18n";
import { pageLang, type LangParams } from "@/lib/i18n/server";

export async function generateMetadata({ params }: LangParams): Promise<Metadata> {
  const { t } = await pageLang(params);
  return { title: t.auth.register, robots: { index: false } };
}

export default async function RegisterPage({ params }: LangParams) {
  const { lang, t } = await pageLang(params);
  if (await getCurrentUser()) redirect(href(lang, "/profile"));
  return (
    <AuthCard lang={lang} title={t.auth.registerTitle} switchText={t.auth.haveAccount} switchLink={t.auth.login} switchHref="/login">
      <RegisterForm lang={lang} t={t.auth} />
    </AuthCard>
  );
}
