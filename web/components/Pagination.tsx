import Link from "next/link";
import { ru } from "@/lib/i18n";
import { searchHref } from "@/lib/url";
import { PAGE_SIZE, type Filters } from "@/lib/works";

export function Pagination({ filters, total }: { filters: Filters; total: number }) {
  const pages = Math.min(Math.ceil(total / PAGE_SIZE), 500);
  if (pages <= 1) return null;
  const { page } = filters;
  const link = "rounded-full border border-line px-4 py-2 hover:border-accent hover:text-accent";
  return (
    <nav aria-label="Страницы" className="mt-8 flex items-center justify-between gap-4 text-sm">
      {page > 1 ? (
        <Link href={searchHref(filters, { page: page - 1 })} className={link}>
          {ru.pagination.prev}
        </Link>
      ) : (
        <span />
      )}
      <span className="text-muted">{ru.pagination.page(page, pages)}</span>
      {page < pages ? (
        <Link href={searchHref(filters, { page: page + 1 })} className={link}>
          {ru.pagination.next}
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
