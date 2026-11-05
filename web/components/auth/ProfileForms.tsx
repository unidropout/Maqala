"use client";

import { useActionState, useEffect } from "react";
import { Field, FormMessage, inputClass, SubmitButton } from "@/components/Form";
import { changePassword, updateProfile, type FormState } from "@/lib/auth/actions";
import type { Theme } from "@/lib/auth/session";
import { LANG_LABELS, LANGS, type Dict, type Lang } from "@/lib/i18n";
import { THEME_KEY } from "@/lib/theme";

/** Применяет тему из профиля в этом браузере (переключатель в шапке хранит её в localStorage). */
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  try {
    if (theme === "system") {
      delete root.dataset.theme;
      localStorage.removeItem(THEME_KEY);
    } else {
      root.dataset.theme = theme;
      localStorage.setItem(THEME_KEY, theme);
    }
  } catch {
    // localStorage недоступен: тема применится по настройке профиля при следующей загрузке.
  }
}

export function ProfileForm({
  lang,
  t,
  name,
  theme,
  saved,
}: {
  lang: Lang;
  t: Dict["profile"] & { name: string };
  name: string;
  theme: Theme;
  saved: boolean;
}) {
  const [state, action] = useActionState<FormState, FormData>(updateProfile, saved ? { ok: t.saved } : null);

  useEffect(() => {
    if (state?.ok) {
      const select = document.querySelector<HTMLSelectElement>("select[name=theme]");
      if (select) applyTheme(select.value as Theme);
    }
  }, [state]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="lang" value={lang} />
      <Field label={t.name}>
        <input name="name" defaultValue={name} required maxLength={100} autoComplete="name" className={inputClass} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.language}>
          <select name="interface_lang" defaultValue={lang} className={inputClass}>
            {LANGS.map((code) => (
              <option key={code} value={code}>
                {LANG_LABELS[code]}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t.theme}>
          <select name="theme" defaultValue={theme} className={inputClass}>
            {(["system", "light", "dark"] as const).map((value) => (
              <option key={value} value={value}>
                {t.themes[value]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <FormMessage state={state} />
      <SubmitButton>{t.save}</SubmitButton>
    </form>
  );
}

export function PasswordForm({ lang, t, hasPassword }: { lang: Lang; t: Dict["profile"]; hasPassword: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(changePassword, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="lang" value={lang} />
      {hasPassword && (
        <Field label={t.currentPassword}>
          <input name="current_password" type="password" required autoComplete="current-password" maxLength={128} className={inputClass} />
        </Field>
      )}
      <Field label={t.newPassword}>
        <input name="new_password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" className={inputClass} />
      </Field>
      <FormMessage state={state} />
      <SubmitButton className="btn-outline">{hasPassword ? t.changePassword : t.setPassword}</SubmitButton>
    </form>
  );
}
