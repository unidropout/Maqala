"use client";

import { useActionState } from "react";
import { Field, FormMessage, inputClass, SubmitButton } from "@/components/Form";
import { createWork, queueIngest, updateWork } from "@/lib/admin/actions";
import type { FormState } from "@/lib/auth/actions";
import type { Dict, Lang } from "@/lib/i18n";

export type WorkFormValues = {
  id?: number;
  title?: string;
  abstract?: string | null;
  publication_year?: number | null;
  language?: string | null;
  license?: string | null;
  landing_url?: string | null;
  oa_url?: string | null;
  journal?: string | null;
  field?: string | null;
};

/** Правка статьи (есть id) или добавление новой вручную. */
export function WorkForm({
  lang,
  t,
  values = {},
  initialOk,
}: {
  lang: Lang;
  t: Dict["admin"];
  values?: WorkFormValues;
  initialOk?: string;
}) {
  const isNew = values.id === undefined;
  const [state, action] = useActionState<FormState, FormData>(isNew ? createWork : updateWork, initialOk ? { ok: initialOk } : null);
  const f = t.fields;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="lang" value={lang} />
      {!isNew && <input type="hidden" name="id" value={values.id} />}
      <Field label={f.title}>
        <textarea name="title" required rows={2} maxLength={1000} defaultValue={values.title ?? ""} className={inputClass} />
      </Field>
      <Field label={f.abstract}>
        <textarea name="abstract" rows={6} maxLength={20000} defaultValue={values.abstract ?? ""} className={inputClass} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={f.year}>
          <input name="publication_year" type="number" min={1900} max={2100} defaultValue={values.publication_year ?? ""} className={inputClass} />
        </Field>
        <Field label={f.language}>
          <input name="language" maxLength={2} defaultValue={values.language ?? ""} className={inputClass} />
        </Field>
        <Field label={f.license}>
          <input name="license" maxLength={50} defaultValue={values.license ?? ""} className={inputClass} />
        </Field>
      </div>
      <Field label={f.landingUrl}>
        <input name="landing_url" type="url" required defaultValue={values.landing_url ?? ""} className={inputClass} />
      </Field>
      <Field label={f.oaUrl}>
        <input name="oa_url" type="url" defaultValue={values.oa_url ?? ""} className={inputClass} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={f.journal}>
          <input name="journal" maxLength={500} defaultValue={values.journal ?? ""} className={inputClass} />
        </Field>
        <Field label={f.field}>
          <input name="field" maxLength={200} defaultValue={values.field ?? ""} className={inputClass} />
        </Field>
      </div>
      {isNew && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={f.doi}>
              <input name="doi" maxLength={200} className={inputClass} />
            </Field>
            <Field label={f.workType}>
              <input name="work_type" maxLength={50} defaultValue="article" className={inputClass} />
            </Field>
          </div>
          <Field label={f.authors}>
            <textarea name="authors" rows={4} className={inputClass} />
          </Field>
          <Field label={f.countries}>
            <input name="countries" defaultValue="KZ" className={inputClass} />
          </Field>
        </>
      )}
      <FormMessage state={state} />
      <SubmitButton>{t.save}</SubmitButton>
    </form>
  );
}

export function IngestForm({ lang, t }: { lang: Lang; t: Dict["admin"]["ingest"] }) {
  const [state, action] = useActionState<FormState, FormData>(queueIngest, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="lang" value={lang} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t.countries}>
          <input name="countries" placeholder="KZ" className={inputClass} />
        </Field>
        <Field label={t.languages}>
          <input name="languages" placeholder="kk" className={inputClass} />
        </Field>
        <Field label={t.journalCountries}>
          <input name="journal_countries" placeholder="KZ" className={inputClass} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t.yearFrom}>
          <input name="year_from" type="number" min={1900} max={2100} className={inputClass} />
        </Field>
        <Field label={t.yearTo}>
          <input name="year_to" type="number" min={1900} max={2100} className={inputClass} />
        </Field>
        <Field label={t.limit}>
          <input name="limit" type="number" min={1} max={100000} defaultValue={1000} className={inputClass} />
        </Field>
      </div>
      <p className="text-xs text-muted">{t.hint}</p>
      <FormMessage state={state} />
      <SubmitButton>{t.queue}</SubmitButton>
    </form>
  );
}
