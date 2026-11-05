import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { LoginForm } from "@/components/auth/AuthForms";
import { getCurrentUser } from "@/lib/auth/session";
import { href } from "@/lib/i18n";
import { pageLang } from "@/lib/i18n/server";

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ error?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { t } = await pageLang(params);
  return { title: t.auth.login, robots: { index: false } };
}

export default async function LoginPage({ params, searchParams }: Props) {
  const { lang, t } = await pageLang(params);
  if (await getCurrentUser()) redirect(href(lang, "/profile"));
  const { error } = await searchParams;
  const initialError = error === "blocked" ? t.auth.errors.blocked : error === "google" ? t.auth.errors.google : undefined;
  return (
    <AuthCard lang={lang} title={t.auth.loginTitle} switchText={t.auth.noAccount} switchLink={t.auth.register} switchHref="/register">
      <LoginForm lang={lang} t={t.auth} initialError={initialError} />
    </AuthCard>
  );
}
