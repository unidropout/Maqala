"use client";

import { useActionState } from "react";
import { Field, FormMessage, inputClass, SubmitButton } from "@/components/Form";
import { login, register, type FormState } from "@/lib/auth/actions";
import type { Dict, Lang } from "@/lib/i18n";

type Props = { lang: Lang; t: Dict["auth"]; initialError?: string };

export function LoginForm({ lang, t, initialError }: Props) {
  const [state, action] = useActionState<FormState, FormData>(login, initialError ? { error: initialError } : null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="lang" value={lang} />
      <Field label={t.email}>
        <input name="email" type="email" required autoComplete="email" maxLength={254} className={inputClass} />
      </Field>
      <Field label={t.password}>
        <input name="password" type="password" required autoComplete="current-password" maxLength={128} className={inputClass} />
      </Field>
      <FormMessage state={state} />
      <SubmitButton className="btn w-full">{t.loginButton}</SubmitButton>
    </form>
  );
}

export function RegisterForm({ lang, t }: Props) {
  const [state, action] = useActionState<FormState, FormData>(register, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="lang" value={lang} />
      <Field label={t.name}>
        <input name="name" required autoComplete="name" maxLength={100} className={inputClass} />
      </Field>
      <Field label={t.email}>
        <input name="email" type="email" required autoComplete="email" maxLength={254} className={inputClass} />
      </Field>
      <Field label={t.password} hint={t.passwordHint}>
        <input name="password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" className={inputClass} />
      </Field>
      <FormMessage state={state} />
      <SubmitButton className="btn w-full">{t.registerButton}</SubmitButton>
    </form>
  );
}
