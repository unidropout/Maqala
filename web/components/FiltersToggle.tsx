"use client";

import { useState } from "react";
import { ru } from "@/lib/i18n";

/** На телефоне прячет фильтры за кнопкой, на широком экране показывает всегда. */
export function FiltersToggle({ active, children }: { active: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="filters-panel"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3 font-medium lg:hidden"
      >
        <span>
          {ru.filters.title}
          {active > 0 && (
            <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs text-white">{active}</span>
          )}
        </span>
        <span aria-hidden>{open ? "▲" : "▼"}</span>
      </button>
      <div id="filters-panel" className={`${open ? "mt-3 block" : "hidden"} lg:mt-0 lg:block`}>
        {children}
      </div>
    </div>
  );
}
