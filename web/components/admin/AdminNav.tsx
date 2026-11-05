"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminNav({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="flex flex-wrap gap-2">
      {items.map((item, i) => {
        // Первая вкладка («Статьи») активна и на страницах правки статьи.
        const active = i === 0 ? pathname === item.href || pathname.startsWith(`${item.href}/works`) : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full border px-4 py-2 text-sm transition ${active ? "border-ink bg-ink text-bg" : "border-line/30 hover:border-ink"}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
