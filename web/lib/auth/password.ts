import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

// Параметры scrypt по рекомендации OWASP (N = 2^15). Хранятся вместе с хешем, чтобы их можно было
// усилить позже, не ломая старые пароли.
const N = 2 ** 15;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

// Каждый расчёт scrypt занимает ~32 МБ памяти: без ограничения сотня одновременных попыток входа
// съела бы память сервера. Остальные запросы ждут своей очереди.
const MAX_PARALLEL = 4;
let running = 0;
const waiting: (() => void)[] = [];

async function withSlot<T>(task: () => Promise<T>): Promise<T> {
  // Освободившееся место передаётся первому в очереди напрямую (running не уменьшается),
  // иначе новый запрос мог бы проскочить вперёд и превысить лимит.
  if (running >= MAX_PARALLEL) await new Promise<void>((resolve) => waiting.push(resolve));
  else running += 1;
  try {
    return await task();
  } finally {
    const next = waiting.shift();
    if (next) next();
    else running -= 1;
  }
}

function derive(password: string, salt: Buffer, options: ScryptOptions, length: number): Promise<Buffer> {
  return withSlot(
    () =>
      new Promise((resolve, reject) =>
        scrypt(password.normalize("NFKC"), salt, length, { ...options, maxmem: 128 * 1024 * 1024 }, (err, key) =>
          err ? reject(err) : resolve(key),
        ),
      ),
  );
}

/** Хеш вида scrypt$N$r$p$соль$ключ (base64). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt, { N, r: R, p: P }, KEY_LENGTH);
  return ["scrypt", N, R, P, salt.toString("base64"), key.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, salt, key] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !key) return false;
  const expected = Buffer.from(key, "base64");
  const actual = await derive(password, Buffer.from(salt, "base64"), { N: Number(n), r: Number(r), p: Number(p) }, expected.length);
  return timingSafeEqual(actual, expected);
}

/**
 * Хеш несуществующего пароля: проверка для неизвестной почты занимает столько же времени,
 * сколько для известной, поэтому по времени ответа нельзя узнать, зарегистрирована ли почта.
 */
let dummyHash: Promise<string> | null = null;
export function dummyPasswordHash(): Promise<string> {
  dummyHash ??= hashPassword(randomBytes(16).toString("hex"));
  return dummyHash;
}
