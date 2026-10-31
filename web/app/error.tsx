"use client";

import { ru } from "@/lib/i18n";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="py-24 text-center">
      <h1 className="font-serif text-2xl font-bold">{ru.search.error}</h1>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-full bg-accent px-6 py-3 font-medium text-white"
      >
        Попробовать снова
      </button>
    </div>
  );
}
