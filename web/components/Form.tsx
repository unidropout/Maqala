"use client";

import { useFormStatus } from "react-dom";
import type { FormState } from "@/lib/auth/actions";

export const inputClass =
  "w-full rounded-2xl border border-line/40 bg-bg px-4 py-3 text-fg placeholder:text-muted focus:border-ink focus:outline-none";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <span className="mt-1.5 block">{children}</span>
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function SubmitButton({ children, className = "btn" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${className} disabled:opacity-60`}>
      {children}
    </button>
  );
}

export function FormMessage({ state }: { state: FormState }) {
  if (!state) return null;
  return state.error ? (
    <p role="alert" className="rounded-2xl border border-line/40 bg-soft px-4 py-3 text-sm text-fg">
      {state.error}
    </p>
  ) : state.ok ? (
    <p role="status" className="rounded-2xl bg-ink px-4 py-3 text-sm text-bg">
      {state.ok}
    </p>
  ) : null;
}
