import Link from "next/link";
import { getDict, type Lang } from "@/lib/i18n";
import { searchHref } from "@/lib/url";
import { PAGE_SIZE, type Filters } from "@/lib/works";

export function Pagination({ filters, total, lang }: { filters: Filters; total: number; lang: Lang }) {
  const t = getDict(lang).pagination;
  const pages = Math.min(Math.ceil(total / PAGE_SIZE), 500);
  if (pages <= 1) return null;
  const { page } = filters;
  const link = "btn-outline px-5 py-2 text-sm";
  return (
    <nav aria-label={t.label} className="mt-8 flex items-center justify-between gap-4 text-sm">
      {page > 1 ? (
        <Link href={searchHref(lang, filters, { page: page - 1 })} className={link}>
          {t.prev}
        </Link>
      ) : (
        <span />
      )}
      <span className="text-muted">{t.page(page, pages)}</span>
      {page < pages ? (
        <Link href={searchHref(lang, filters, { page: page + 1 })} className={link}>
          {t.next}
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
