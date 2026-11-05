"use server";

import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import type { FormState } from "@/lib/auth/actions";
import { endAllSessions, getCurrentUser, hasRole, type Role, type User } from "@/lib/auth/session";
import { pool } from "@/lib/db";
import { safeUrl } from "@/lib/format";
import { DEFAULT_LANG, getDict, href, isLang, type Lang } from "@/lib/i18n";

function str(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function formLang(form: FormData): Lang {
  const value = str(form, "lang");
  return isLang(value) ? value : DEFAULT_LANG;
}

/** Права проверяются на сервере в каждом действии: скрытая кнопка в интерфейсе — не защита. */
async function requireActor(form: FormData, role: Role): Promise<{ user: User; lang: Lang }> {
  const lang = formLang(form);
  const user = await getCurrentUser();
  if (!user) redirect(href(lang, "/login"));
  if (!hasRole(user, role)) throw new Error("forbidden");
  return { user, lang };
}

/** Положительный целый id из формы или null: подменённое значение не должно дойти до SQL. */
function formId(form: FormData): number | null {
  const id = Number(str(form, "id"));
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

const CODE_RE = /^[A-Za-z]{2}$/;

function codes(value: string): string[] | null {
  const list = value.split(/[\s,]+/).filter(Boolean);
  return list.every((c) => CODE_RE.test(c)) ? list : null;
}

type WorkFields = {
  title: string;
  abstract: string | null;
  publication_year: number | null;
  language: string | null;
  license: string | null;
  landing_url: string;
  oa_url: string | null;
  journal: string | null;
  field: string | null;
};

function optional(form: FormData, key: string, max: number): string | null {
  return str(form, key).slice(0, max) || null;
}

function parseWorkFields(form: FormData, lang: Lang): WorkFields | { error: string } {
  const e = getDict(lang).admin.errors;
  const title = str(form, "title").replace(/\s+/g, " ").slice(0, 1000);
  if (!title) return { error: e.title };
  const yearText = str(form, "publication_year");
  const year = yearText ? Number(yearText) : null;
  if (year !== null && !(Number.isInteger(year) && year >= 1900 && year <= 2100)) return { error: e.year };
  const language = str(form, "language").toLowerCase() || null;
  if (language && !CODE_RE.test(language)) return { error: e.language };
  const landing = safeUrl(str(form, "landing_url"));
  const oaText = str(form, "oa_url");
  const oa = oaText ? safeUrl(oaText) : null;
  if (!landing || (oaText && !oa)) return { error: e.url };
  const license = str(form, "license").toLowerCase();
  return {
    title,
    abstract: optional(form, "abstract", 20_000),
    publication_year: year,
    language,
    license: /^[a-z0-9.-]{1,50}$/.test(license) ? license : null,
    landing_url: landing,
    oa_url: oa,
    journal: optional(form, "journal", 500),
    field: optional(form, "field", 200),
  };
}

export async function updateWork(_: FormState, form: FormData): Promise<FormState> {
  const { user, lang } = await requireActor(form, "editor");
  const id = formId(form);
  if (id === null) return { error: getDict(lang).admin.errors.notFound };
  const fields = parseWorkFields(form, lang);
  if ("error" in fields) return fields;
  const { rowCount } = await pool.query(
    `update works set title = $2, abstract = $3, publication_year = $4, language = $5, license = $6,
            landing_url = $7, oa_url = $8, journal = $9, field = $10, edited_at = now(), updated_at = now()
     where id = $1`,
    [id, fields.title, fields.abstract, fields.publication_year, fields.language, fields.license, fields.landing_url, fields.oa_url, fields.journal, fields.field],
  );
  if (!rowCount) return { error: getDict(lang).admin.errors.notFound };
  await audit(user.id, "work.edit", "work", id, { title: fields.title });
  revalidatePath(href(lang, `/works/${id}`));
  return { ok: getDict(lang).admin.saved };
}

export async function createWork(_: FormState, form: FormData): Promise<FormState> {
  const { user, lang } = await requireActor(form, "editor");
  const e = getDict(lang).admin.errors;
  const fields = parseWorkFields(form, lang);
  if ("error" in fields) return fields;
  const countries = codes(str(form, "countries"));
  if (!countries) return { error: e.country };
  // Строка автора: «Имя; Организация; KZ» — организация и страна необязательны.
  const authors = str(form, "authors")
    .split("\n")
    .map((line) => line.split(";").map((part) => part.trim()))
    .filter(([name]) => name)
    .slice(0, 500)
    .map(([name, institution, country]) => ({
      name: name.slice(0, 200),
      orcid: null,
      institutions: institution ? [{ name: institution.slice(0, 300), country: country && CODE_RE.test(country) ? country.toUpperCase() : null }] : [],
    }));
  const doi = str(form, "doi").replace(/^https?:\/\/doi\.org\//i, "").toLowerCase().slice(0, 200) || null;

  const { rows } = await pool.query<{ id: number }>(
    `insert into works (source, source_id, doi, title, abstract, publication_year, language, work_type, license,
                        is_oa, landing_url, oa_url, journal, field, countries, authors, edited_at)
     values ('manual', $1, $2, $3, $4, $5, $6, $7, $8, true, $9, $10, $11, $12, $13, $14, now())
     returning id`,
    [
      randomUUID(),
      doi,
      fields.title,
      fields.abstract,
      fields.publication_year,
      fields.language,
      optional(form, "work_type", 50),
      fields.license,
      fields.landing_url,
      fields.oa_url,
      fields.journal,
      fields.field,
      countries.map((c) => c.toUpperCase()),
      JSON.stringify(authors),
    ],
  );
  await audit(user.id, "work.create", "work", rows[0].id, { title: fields.title });
  redirect(href(lang, `/admin/works/${rows[0].id}?created=1`));
}

export async function setWorkHidden(form: FormData): Promise<void> {
  const { user, lang } = await requireActor(form, "editor");
  const id = formId(form);
  if (id === null) return;
  const hidden = str(form, "hidden") === "1";
  const reason = hidden ? optional(form, "reason", 500) : null;
  await pool.query("update works set is_hidden = $2, hidden_reason = $3, updated_at = now() where id = $1", [id, hidden, reason]);
  await audit(user.id, hidden ? "work.hide" : "work.unhide", "work", id, reason ? { reason } : {});
  revalidatePath(href(lang, "/admin"));
}

const ROLES: Role[] = ["user", "editor", "superadmin"];

export async function setUserRole(form: FormData): Promise<void> {
  const { user, lang } = await requireActor(form, "superadmin");
  const id = formId(form);
  const role = str(form, "role") as Role;
  if (id === null || id === user.id || !ROLES.includes(role)) return;
  await pool.query("update users set role = $2, updated_at = now() where id = $1", [id, role]);
  await audit(user.id, "user.role", "user", id, { role });
  revalidatePath(href(lang, "/admin/users"));
}

export async function setUserBlocked(form: FormData): Promise<void> {
  const { user, lang } = await requireActor(form, "superadmin");
  const id = formId(form);
  const blocked = str(form, "blocked") === "1";
  if (id === null || id === user.id) return;
  await pool.query("update users set is_blocked = $2, updated_at = now() where id = $1", [id, blocked]);
  if (blocked) await endAllSessions(id);
  await audit(user.id, blocked ? "user.block" : "user.unblock", "user", id);
  revalidatePath(href(lang, "/admin/users"));
}

export async function queueIngest(_: FormState, form: FormData): Promise<FormState> {
  const { user, lang } = await requireActor(form, "superadmin");
  const t = getDict(lang).admin;
  const countries = codes(str(form, "countries"));
  const languages = codes(str(form, "languages"));
  const journalCountries = codes(str(form, "journal_countries"));
  const year = (key: string) => (str(form, key) ? Number(str(form, key)) : null);
  const yearFrom = year("year_from");
  const yearTo = year("year_to");
  const limit = str(form, "limit") ? Number(str(form, "limit")) : null;
  const validYear = (y: number | null) => y === null || (Number.isInteger(y) && y >= 1900 && y <= 2100);
  if (
    !countries ||
    !languages ||
    !journalCountries ||
    !(countries.length || languages.length || journalCountries.length) ||
    !validYear(yearFrom) ||
    !validYear(yearTo) ||
    (limit !== null && !(Number.isInteger(limit) && limit >= 1 && limit <= 100_000))
  ) {
    return { error: t.errors.ingest };
  }
  const params = {
    countries: countries.map((c) => c.toUpperCase()),
    languages: languages.map((c) => c.toLowerCase()),
    journal_countries: journalCountries.map((c) => c.toUpperCase()),
    year_from: yearFrom,
    year_to: yearTo,
    limit,
  };
  const { rows } = await pool.query<{ id: number }>(
    "insert into ingest_jobs (params, requested_by) values ($1, $2) returning id",
    [params, user.id],
  );
  await audit(user.id, "ingest.queue", "ingest_job", rows[0].id, params);
  startWorker();
  revalidatePath(href(lang, "/admin/ingest"));
  return { ok: t.ingest.queued };
}

/**
 * Локально сайт может сам запустить python -m ingest.worker (INGEST_AUTORUN=1 в .env).
 * Команда фиксированная, параметры задачи воркер читает из базы и проверяет сам.
 */
function startWorker() {
  if (process.env.INGEST_AUTORUN !== "1") return;
  const child = spawn(process.env.INGEST_PYTHON || "python", ["-m", "ingest.worker"], {
    cwd: path.resolve(process.cwd(), ".."),
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.on("error", (error) => console.error("ingest.worker:", error.message));
  child.unref();
}
