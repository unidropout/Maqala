import { en } from "./en";
import { kk } from "./kk";
import { ru, type Dict } from "./ru";

export type { Dict };

export const LANGS = ["ru", "kk", "en"] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = "ru";

/** Подписи в переключателе языка: каждая на своём языке. */
export const LANG_LABELS: Record<Lang, string> = { ru: "Рус", kk: "Қаз", en: "Eng" };

/** Локали для Intl: числа, даты, названия стран и языков. */
export const INTL_LOCALES: Record<Lang, string> = { ru: "ru-RU", kk: "kk-KZ", en: "en-US" };

const DICTS: Record<Lang, Dict> = { ru, kk, en };

export function isLang(value: string | undefined | null): value is Lang {
  return LANGS.includes(value as Lang);
}

export function getDict(lang: Lang): Dict {
  return DICTS[lang];
}

/** Путь с префиксом языка: href("kk", "/search") → "/kk/search". */
export function href(lang: Lang, path = "/"): string {
  return path === "/" ? `/${lang}` : `/${lang}${path}`;
}
