import type { Metadata } from "next";
import { PasswordForm, ProfileForm } from "@/components/auth/ProfileForms";
import { WorkCard } from "@/components/WorkCard";
import { logout } from "@/lib/auth/actions";
import { requireUser } from "@/lib/auth/session";
import { fitDisplay } from "@/lib/fit";
import { formatDate } from "@/lib/format";
import { pageLang } from "@/lib/i18n/server";
import { getFavorites } from "@/lib/works";

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ saved?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { t } = await pageLang(params);
  return { title: t.profile.title, robots: { index: false } };
}

export default async function ProfilePage({ params, searchParams }: Props) {
  const { lang, t } = await pageLang(params);
  const user = await requireUser(lang);
  const [favorites, { saved }] = await Promise.all([getFavorites(user.id), searchParams]);
  const p = t.profile;

  return (
    <div className="py-12">
      <div className="fit flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0 flex-1">
          <p className="label">{p.title}</p>
          <h1 className="display mt-3" style={fitDisplay(user.name, 6)}>
            {user.name}
          </h1>
        </div>
        <form action={logout}>
          <input type="hidden" name="lang" value={lang} />
          <button type="submit" className="btn-outline">
            {t.auth.logout}
          </button>
        </form>
      </div>

      <div className="mt-10 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <section className="card p-6">
          <span aria-hidden className="dot" />
          <h2 className="display mt-6 text-3xl">{p.info}</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="label">{t.auth.email}</dt>
              <dd className="mt-1 break-all">{user.email}</dd>
            </div>
            <div>
              <dt className="label">{p.role}</dt>
              <dd className="mt-1">{p.roles[user.role]}</dd>
            </div>
            <div>
              <dt className="label">{p.memberSince}</dt>
              <dd className="mt-1">{formatDate(user.created_at, lang)}</dd>
            </div>
            {user.has_google && (
              <div>
                <dd className="chip">{p.google}</dd>
              </div>
            )}
          </dl>
        </section>

        <section className="card p-6">
          <span aria-hidden className="dot" />
          <h2 className="display mt-6 text-3xl">{p.settings}</h2>
          <div className="mt-4">
            <ProfileForm lang={lang} t={{ ...p, name: t.auth.name }} name={user.name} theme={user.theme} saved={saved === "1"} />
          </div>
          <h3 className="label mt-10">{p.password}</h3>
          <div className="mt-3">
            <PasswordForm lang={lang} t={p} hasPassword={user.has_password} />
          </div>
        </section>
      </div>

      <section className="mt-14">
        <h2 className="display text-5xl">{p.favorites}</h2>
        {favorites.length === 0 ? (
          <p className="card mt-6 p-8 text-muted">{p.noFavorites}</p>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {favorites.map((w) => (
              <WorkCard key={w.id} work={w} lang={lang} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
