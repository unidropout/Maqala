import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { fetchGoogleProfile, GOOGLE_STATE_COOKIE } from "@/lib/auth/google";
import { startSession } from "@/lib/auth/session";
import { upsertGoogleUser } from "@/lib/auth/users";
import { DEFAULT_LANG, href, isLang, type Lang } from "@/lib/i18n";

function sameString(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Возврат от Google: проверяем state (защита от подделки запроса), получаем профиль, входим. */
export async function GET(request: NextRequest) {
  let saved: { state?: string; verifier?: string; lang?: string } = {};
  try {
    saved = JSON.parse(request.cookies.get(GOOGLE_STATE_COOKIE)?.value ?? "{}");
  } catch {
    // Испорченный cookie — обрабатываем как отсутствующий.
  }
  const lang: Lang = isLang(saved.lang) ? saved.lang : DEFAULT_LANG;
  const fail = (code: string) => {
    const response = NextResponse.redirect(new URL(href(lang, `/login?error=${code}`), request.url));
    response.cookies.delete({ name: GOOGLE_STATE_COOKIE, path: "/api/auth/google" });
    return response;
  };

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  if (!code || !state || !saved.state || !saved.verifier || !sameString(state, saved.state)) return fail("google");

  try {
    const profile = await fetchGoogleProfile(code, saved.verifier);
    const userId = await upsertGoogleUser(profile, lang);
    if (userId === null) return fail("blocked");
    await startSession(userId);
  } catch (error) {
    console.error(error);
    return fail("google");
  }

  const response = NextResponse.redirect(new URL(href(lang, "/profile"), request.url));
  response.cookies.delete({ name: GOOGLE_STATE_COOKIE, path: "/api/auth/google" });
  return response;
}
