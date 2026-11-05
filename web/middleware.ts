import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LANG, isLang, type Lang } from "@/lib/i18n";
import { clientIp, rateLimit } from "@/lib/rateLimit";

const COOKIE = "maqala-lang";

// Запросов в минуту с одного IP (ТЗ §5). Каждая страница поиска — 5–6 запросов к базе.
const LIMITS = { api: 60, page: 120 };
const WINDOW_MS = 60_000;

/** Язык для адреса без префикса: выбор из cookie, затем язык браузера, иначе русский. */
function detect(request: NextRequest): Lang {
  const saved = request.cookies.get(COOKIE)?.value;
  if (isLang(saved)) return saved;
  const accepted = request.headers.get("accept-language") ?? "";
  for (const part of accepted.split(",")) {
    const code = part.split(";")[0].trim().slice(0, 2).toLowerCase();
    if (isLang(code)) return code;
  }
  return DEFAULT_LANG;
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const first = pathname.split("/")[1];

  const kind = first === "api" ? "api" : "page";
  const { allowed, retryAfter } = rateLimit(`${kind}:${clientIp(request.headers)}`, LIMITS[kind], WINDOW_MS);
  if (!allowed) {
    const headers = { "Retry-After": String(retryAfter) };
    return kind === "api"
      ? NextResponse.json({ error: { code: "rate_limited", message: "Слишком много запросов" } }, { status: 429, headers })
      : new NextResponse("Too many requests", { status: 429, headers });
  }
  if (kind === "api") return NextResponse.next();

  if (isLang(first)) {
    // Язык передаётся в заголовке, чтобы его знали страницы без параметров (например, 404).
    const headers = new Headers(request.headers);
    headers.set("x-lang", first);
    const response = NextResponse.next({ request: { headers } });
    response.cookies.set(COOKIE, first, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    return response;
  }

  const url = request.nextUrl.clone();
  url.pathname = `/${detect(request)}${pathname === "/" ? "" : pathname}`;
  url.search = search;
  return NextResponse.redirect(url);
}

export const config = {
  // Всё, кроме служебных файлов Next.js, картинок и иконок.
  matcher: ["/((?!_next|art|icon|apple-icon|favicon|robots.txt|sitemap.xml).*)"],
};
