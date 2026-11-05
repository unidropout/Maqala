import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { DEFAULT_LANG, getDict, isLang, LANGS, type Lang } from "./index";

export type LangParams = { params: Promise<{ lang: string }> };

/** Язык из адреса страницы; неизвестный язык — 404. */
export async function pageLang(params: LangParams["params"]): Promise<{ lang: Lang; t: ReturnType<typeof getDict> }> {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return { lang, t: getDict(lang) };
}

/** Язык для страниц без параметров (404): его ставит middleware в заголовок x-lang. */
export async function headerLang(): Promise<Lang> {
  const value = (await headers()).get("x-lang");
  return isLang(value) ? value : DEFAULT_LANG;
}

/** Ссылки на ту же страницу на других языках для поисковиков (hreflang). */
export function alternates(lang: Lang, path = "") {
  return {
    canonical: `/${lang}${path}`,
    languages: Object.fromEntries(LANGS.map((code) => [code, `/${code}${path}`])),
  };
}
