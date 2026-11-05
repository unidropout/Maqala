import { INTL_LOCALES, type Lang } from "./i18n";

const regionNames = new Map<Lang, Intl.DisplayNames>();
const languageNames = new Map<Lang, Intl.DisplayNames>();

function names(cache: Map<Lang, Intl.DisplayNames>, lang: Lang, type: "region" | "language") {
  let value = cache.get(lang);
  if (!value) {
    value = new Intl.DisplayNames([INTL_LOCALES[lang], "ru"], { type });
    cache.set(lang, value);
  }
  return value;
}

function capitalize(text: string, lang: Lang): string {
  return text.charAt(0).toLocaleUpperCase(INTL_LOCALES[lang]) + text.slice(1);
}

export function countryName(code: string, lang: Lang): string {
  try {
    return names(regionNames, lang, "region").of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

export function languageName(code: string, lang: Lang): string {
  try {
    return capitalize(names(languageNames, lang, "language").of(code) ?? code, lang);
  } catch {
    return code;
  }
}

export function licenseName(license: string): string {
  return license.startsWith("cc") ? license.toUpperCase().replace(/^CC-/, "CC ").replaceAll("-", "‑") : license;
}

export function formatNumber(n: number, lang: Lang): string {
  return n.toLocaleString(INTL_LOCALES[lang]);
}

export function formatDate(value: string | Date | null, lang: Lang): string | null {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString(INTL_LOCALES[lang], { year: "numeric", month: "long", day: "numeric" });
}

/** Только http(s)-ссылки: адреса приходят из внешних данных и могут быть любыми. */
export function safeUrl(value: string | null | undefined): string | null {
  return value && /^https?:\/\//i.test(value) ? value : null;
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(" ")) + "…";
}
