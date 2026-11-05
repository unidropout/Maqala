import { createHash, randomBytes } from "node:crypto";

/** Вход через Google: OAuth 2.0 authorization code + PKCE. Ключи — в .env (см. .env.example). */
export const GOOGLE_STATE_COOKIE = "maqala_oauth";

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function appUrl(): string {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function googleRedirectUri(): string {
  return `${appUrl()}/api/auth/google/callback`;
}

export function newOAuthState() {
  const state = randomBytes(24).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { state, verifier, challenge };
}

export function googleAuthUrl(state: string, challenge: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export type GoogleProfile = { sub: string; email: string; email_verified: boolean; name: string };

/** Обменивает код на токен и получает профиль. Запросы идут напрямую к Google по HTTPS. */
export async function fetchGoogleProfile(code: string, verifier: string): Promise<GoogleProfile> {
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!tokenResponse.ok) throw new Error(`Google token: ${tokenResponse.status}`);
  const { access_token } = (await tokenResponse.json()) as { access_token?: string };
  if (!access_token) throw new Error("Google token: нет access_token");

  const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${access_token}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!profileResponse.ok) throw new Error(`Google userinfo: ${profileResponse.status}`);
  const profile = (await profileResponse.json()) as Partial<GoogleProfile>;
  if (!profile.sub || !profile.email) throw new Error("Google userinfo: нет sub или email");
  return {
    sub: profile.sub,
    email: profile.email,
    email_verified: profile.email_verified === true,
    name: (profile.name || profile.email.split("@")[0]).slice(0, 100),
  };
}
