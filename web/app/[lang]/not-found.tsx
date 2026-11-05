import Image from "next/image";
import Link from "next/link";
import { getDict, href } from "@/lib/i18n";
import { headerLang } from "@/lib/i18n/server";

export default async function NotFound() {
  const lang = await headerLang();
  const t = getDict(lang).notFound;
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <Image src="/art/magnifier.webp" alt="" width={734} height={734} className="sticker w-40 -rotate-12" />
      <p className="display mt-8 text-8xl">404</p>
      <h1 className="mt-2 text-xl font-semibold">{t.title}</h1>
      <Link href={href(lang)} className="btn mt-6">
        {t.back}
      </Link>
    </div>
  );
}
