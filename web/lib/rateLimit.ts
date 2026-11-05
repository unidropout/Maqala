/**
 * Простое ограничение частоты запросов: не больше `limit` запросов за окно `windowMs` с одного IP.
 *
 * Счётчики живут в памяти одного экземпляра сервера. Этого хватает против одиночного скрипта,
 * который заваливает сайт запросами, но не против распределённой атаки: в продакшене поверх
 * нужно включить ограничение на уровне хостинга (Vercel Firewall), см. docs/security.md.
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 10_000;

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()) {
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size >= MAX_KEYS) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    }
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  return {
    allowed: bucket.count <= limit,
    retryAfter: Math.ceil((bucket.resetAt - now) / 1000),
  };
}

/** IP клиента. За Vercel и другими прокси он в первом значении X-Forwarded-For. */
export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0].trim() || headers.get("x-real-ip") || "local";
}
