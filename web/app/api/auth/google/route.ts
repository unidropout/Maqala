import { NextResponse, type NextRequest } from "next/server";
import { GOOGLE_STATE_COOKIE, googleAuthUrl, googleConfigured, newOAuthState } from "@/lib/auth/google";
import { DEFAULT_LANG, href, isLang } from "@/lib/i18n";

/** Начало входа через Google: запоминаем state и PKCE-верификатор в cookie и уходим к Google. */
export async function GET(request: NextRequest) {
  const langParam = request.nextUrl.searchParams.get("lang");
  const lang = isLang(langParam) ? langParam : DEFAULT_LANG;
  if (!googleConfigured()) return NextResponse.redirect(new URL(href(lang, "/login?error=google"), request.url));

  const { state, verifier, challenge } = newOAuthState();
  const response = NextResponse.redirect(googleAuthUrl(state, challenge));
  response.cookies.set(GOOGLE_STATE_COOKIE, JSON.stringify({ state, verifier, lang }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth/google",
    maxAge: 10 * 60,
  });
  return response;
}
