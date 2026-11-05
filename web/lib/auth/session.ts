import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { pool } from "@/lib/db";
import { href, type Lang } from "@/lib/i18n";

export const SESSION_COOKIE = "maqala_session";
const SESSION_DAYS = 30;

export type Role = "user" | "editor" | "superadmin";
export type Theme = "system" | "light" | "dark";

export type User = {
  id: number;
  email: string;
  email_verified: boolean;
  name: string;
  role: Role;
  lang: Lang;
  theme: Theme;
  has_password: boolean;
  has_google: boolean;
  created_at: string;
};

const ROLE_RANK: Record<Role, number> = { user: 0, editor: 1, superadmin: 2 };

export function hasRole(user: Pick<User, "role"> | null, role: Role): boolean {
  return !!user && ROLE_RANK[user.role] >= ROLE_RANK[role];
}

/** В базе хранится только хеш токена: утечка таблицы sessions не даёт войти в чужой аккаунт. */
function sessionId(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Создаёт сессию и ставит cookie. Вызывать только из server action или route handler. */
export async function startSession(userId: number): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await pool.query("insert into sessions (id, user_id, expires_at) values ($1, $2, $3)", [sessionId(token), userId, expires]);
  await pool.query("update users set last_login_at = now() where id = $1", [userId]);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await pool.query("delete from sessions where id = $1", [sessionId(token)]);
  jar.delete(SESSION_COOKIE);
}

/** Завершает все сессии пользователя (смена пароля, блокировка, привязка Google). */
export async function endAllSessions(userId: number, exceptCurrent = false): Promise<void> {
  const token = exceptCurrent ? (await cookies()).get(SESSION_COOKIE)?.value : undefined;
  await pool.query("delete from sessions where user_id = $1 and id <> $2", [userId, token ? sessionId(token) : ""]);
}

/** Текущий пользователь или null. Один запрос к базе на всю страницу благодаря cache(). */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const { rows } = await pool.query<User>(
    `select u.id, u.email, u.email_verified, u.name, u.role, u.lang, u.theme,
            u.password_hash is not null as has_password, u.google_sub is not null as has_google,
            u.created_at::text
     from sessions s join users u on u.id = s.user_id
     where s.id = $1 and s.expires_at > now() and not u.is_blocked`,
    [sessionId(token)],
  );
  return rows[0] ?? null;
});

/** Для страниц: без входа — на страницу входа, без нужной роли — 404 (не раскрываем, что страница есть). */
export async function requireUser(lang: Lang, role: Role = "user"): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(href(lang, "/login"));
  if (!hasRole(user, role)) notFound();
  return user;
}
