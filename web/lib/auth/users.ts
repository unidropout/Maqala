import { pool } from "@/lib/db";
import type { Lang } from "@/lib/i18n";
import { endAllSessions } from "./session";
import type { GoogleProfile } from "./google";

export const NAME_MAX = 100;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

export function normalizeEmail(email: string): string | null {
  const value = email.trim().toLowerCase();
  return value.length <= 254 && EMAIL_RE.test(value) ? value : null;
}

export function normalizeName(name: string): string | null {
  const value = name.trim().replace(/\s+/g, " ");
  return value && value.length <= NAME_MAX ? value : null;
}

export async function findUserForLogin(email: string) {
  const { rows } = await pool.query<{ id: number; password_hash: string | null; is_blocked: boolean }>(
    "select id, password_hash, is_blocked from users where lower(email) = $1",
    [email],
  );
  return rows[0] ?? null;
}

/** null — почта уже занята. */
export async function createUser(name: string, email: string, passwordHash: string, lang: Lang): Promise<number | null> {
  try {
    const { rows } = await pool.query<{ id: number }>(
      "insert into users (name, email, password_hash, lang) values ($1, $2, $3, $4) returning id",
      [name, email, passwordHash, lang],
    );
    return rows[0].id;
  } catch (error) {
    if ((error as { code?: string }).code === "23505") return null;
    throw error;
  }
}

/**
 * Пользователь после входа через Google: находит по google_sub или по подтверждённой почте,
 * иначе создаёт. Возвращает null, если аккаунт заблокирован.
 *
 * Если аккаунт с этой почтой создан с паролем, а почта не была подтверждена, пароль сбрасывается:
 * иначе тот, кто зарегистрировал чужую почту раньше владельца, сохранил бы доступ к аккаунту.
 */
export async function upsertGoogleUser(profile: GoogleProfile, lang: Lang): Promise<number | null> {
  const email = normalizeEmail(profile.email);
  if (!email || !profile.email_verified) throw new Error("Google: почта не подтверждена");

  const bySub = await pool.query<{ id: number; is_blocked: boolean }>(
    "select id, is_blocked from users where google_sub = $1",
    [profile.sub],
  );
  if (bySub.rows[0]) return bySub.rows[0].is_blocked ? null : bySub.rows[0].id;

  const byEmail = await pool.query<{ id: number; is_blocked: boolean; email_verified: boolean }>(
    "select id, is_blocked, email_verified from users where lower(email) = $1",
    [email],
  );
  const existing = byEmail.rows[0];
  if (existing) {
    if (existing.is_blocked) return null;
    await pool.query(
      `update users set google_sub = $2, email_verified = true, updated_at = now(),
              password_hash = case when email_verified then password_hash else null end
       where id = $1`,
      [existing.id, profile.sub],
    );
    if (!existing.email_verified) await endAllSessions(existing.id);
    return existing.id;
  }

  const { rows } = await pool.query<{ id: number }>(
    `insert into users (name, email, email_verified, google_sub, lang)
     values ($1, $2, true, $3, $4) returning id`,
    [normalizeName(profile.name) ?? email.split("@")[0], email, profile.sub, lang],
  );
  return rows[0].id;
}
