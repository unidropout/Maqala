"use client";

import { useState } from "react";

/** На телефоне прячет фильтры за кнопкой, на широком экране показывает всегда. */
export function FiltersToggle({
  label,
  active,
  children,
}: {
  label: string;
  active: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="filters-panel"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-full border border-line/40 bg-surface px-5 py-3 font-medium lg:hidden"
      >
        <span>
          {label}
          {active > 0 && (
            <span className="ml-2 rounded-full bg-ink px-2 py-0.5 text-xs text-bg">{active}</span>
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
