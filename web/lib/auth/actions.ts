"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { pool } from "@/lib/db";
import { getDict, href, isLang, DEFAULT_LANG, type Lang } from "@/lib/i18n";
import { clientIp, hit, isLimited } from "@/lib/rateLimit";
import { dummyPasswordHash, hashPassword, PASSWORD_MAX, PASSWORD_MIN, verifyPassword } from "./password";
import { endAllSessions, endSession, getCurrentUser, startSession, type Theme } from "./session";
import { createUser, findUserForLogin, normalizeEmail, normalizeName } from "./users";

export type FormState = { error?: string; ok?: string } | null;

const LOGIN_WINDOW_MS = 15 * 60 * 1000;

function str(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

function formLang(form: FormData): Lang {
  const value = str(form, "lang");
  return isLang(value) ? value : DEFAULT_LANG;
}

function validPassword(password: string): boolean {
  return password.length >= PASSWORD_MIN && password.length <= PASSWORD_MAX;
}

/**
 * Счётчики неудачных попыток за 15 минут. Считаем только неудачи, и строже всего — пару
 * «IP + почта»: иначе любой мог бы заблокировать вход чужому аккаунту, нарочно ошибаясь в пароле.
 * Лимит на одну почту со всех адресов высокий — только против перебора с многих IP.
 */
async function attemptKeys(kind: string, subject: string): Promise<[string, number][]> {
  const ip = clientIp(await headers());
  return [
    [`${kind}:ip:${ip}`, 30],
    [`${kind}:pair:${ip}:${subject}`, 10],
    [`${kind}:subject:${subject}`, 100],
  ];
}

const limited = (keys: [string, number][]) => keys.some(([key, limit]) => isLimited(key, limit));
const recordFailure = (keys: [string, number][]) => keys.forEach(([key]) => hit(key, LOGIN_WINDOW_MS));

async function rememberLang(lang: Lang) {
  (await cookies()).set("maqala-lang", lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}

export async function register(_: FormState, form: FormData): Promise<FormState> {
  const lang = formLang(form);
  const t = getDict(lang).auth.errors;
  const name = normalizeName(str(form, "name"));
  const email = normalizeEmail(str(form, "email"));
  const password = str(form, "password");
  if (!name) return { error: t.badName };
  if (!email) return { error: t.badEmail };
  if (!validPassword(password)) return { error: t.weakPassword };
  // Регистрации считаем все: каждая — хеширование пароля и новая запись в базе.
  const ipKey = `register:ip:${clientIp(await headers())}`;
  if (isLimited(ipKey, 10)) return { error: t.tooMany };
  hit(ipKey, LOGIN_WINDOW_MS);

  const userId = await createUser(name, email, await hashPassword(password), lang);
  if (userId === null) return { error: t.emailTaken };
  await startSession(userId);
  redirect(href(lang, "/profile"));
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const lang = formLang(form);
  const t = getDict(lang).auth.errors;
  const email = normalizeEmail(str(form, "email"));
  const password = str(form, "password");
  if (!email || !password || password.length > PASSWORD_MAX) return { error: t.invalid };
  const keys = await attemptKeys("login", email);
  if (limited(keys)) return { error: t.tooMany };

  const user = await findUserForLogin(email);
  // Для неизвестной почты всё равно считаем хеш: время ответа не выдаёт, есть ли аккаунт.
  const valid = await verifyPassword(password, user?.password_hash ?? (await dummyPasswordHash()));
  if (!user || !user.password_hash || !valid) {
    recordFailure(keys);
    return { error: t.invalid };
  }
  if (user.is_blocked) return { error: t.blocked };

  await startSession(user.id);
  const { rows } = await pool.query<{ lang: Lang }>("select lang from users where id = $1", [user.id]);
  const userLang = rows[0]?.lang ?? lang;
  await rememberLang(userLang);
  redirect(href(userLang, "/profile"));
}

export async function logout(form: FormData): Promise<void> {
  await endSession();
  redirect(href(formLang(form)));
}

const THEMES: Theme[] = ["system", "light", "dark"];

export async function updateProfile(_: FormState, form: FormData): Promise<FormState> {
  const lang = formLang(form);
  const user = await getCurrentUser();
  if (!user) redirect(href(lang, "/login"));
  const name = normalizeName(str(form, "name"));
  const newLang = str(form, "interface_lang");
  const theme = str(form, "theme") as Theme;
  if (!name) return { error: getDict(lang).auth.errors.badName };
  if (!isLang(newLang) || !THEMES.includes(theme)) return { error: getDict(lang).admin.errors.forbidden };

  await pool.query("update users set name = $2, lang = $3, theme = $4, updated_at = now() where id = $1", [
    user.id,
    name,
    newLang,
    theme,
  ]);
  await rememberLang(newLang);
  if (newLang !== lang) redirect(href(newLang, "/profile?saved=1"));
  revalidatePath(href(lang, "/profile"));
  return { ok: getDict(lang).profile.saved };
}

export async function changePassword(_: FormState, form: FormData): Promise<FormState> {
  const lang = formLang(form);
  const t = getDict(lang);
  const user = await getCurrentUser();
  if (!user) redirect(href(lang, "/login"));
  const current = str(form, "current_password");
  const next = str(form, "new_password");
  if (!validPassword(next)) return { error: t.auth.errors.weakPassword };
  const keys = await attemptKeys("password", String(user.id));
  if (limited(keys)) return { error: t.auth.errors.tooMany };

  const { rows } = await pool.query<{ password_hash: string | null }>("select password_hash from users where id = $1", [user.id]);
  const stored = rows[0]?.password_hash;
  // Аккаунт только с Google задаёт пароль без старого: личность уже подтвердил Google.
  if (stored && !(await verifyPassword(current, stored))) {
    recordFailure(keys);
    return { error: t.auth.errors.wrongPassword };
  }

  await pool.query("update users set password_hash = $2, updated_at = now() where id = $1", [user.id, await hashPassword(next)]);
  await endAllSessions(user.id, true);
  return { ok: t.profile.passwordChanged };
}

export async function toggleFavorite(form: FormData): Promise<void> {
  const lang = formLang(form);
  const user = await getCurrentUser();
  if (!user) redirect(href(lang, "/login"));
  const workId = Number(str(form, "work_id"));
  if (!Number.isSafeInteger(workId) || workId < 1) return;

  const removed = await pool.query("delete from favorites where user_id = $1 and work_id = $2", [user.id, workId]);
  if (removed.rowCount === 0) {
    await pool.query(
      `insert into favorites (user_id, work_id)
       select $1, id from works where id = $2 and not is_hidden on conflict do nothing`,
      [user.id, workId],
    );
  }
  revalidatePath(href(lang, `/works/${workId}`));
}
