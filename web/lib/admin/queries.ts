import { pool } from "@/lib/db";
import type { Role } from "@/lib/auth/session";

export const ADMIN_PAGE_SIZE = 30;

export type AdminWorkFilter = "all" | "hidden" | "edited" | "manual";

export type AdminWorkRow = {
  id: number;
  title: string;
  publication_year: number | null;
  language: string | null;
  source: string;
  is_hidden: boolean;
  hidden_reason: string | null;
  edited_at: string | null;
};

export function parsePage(value: string | undefined): number {
  const page = Number(value);
  return Number.isInteger(page) && page >= 1 && page <= 1000 ? page : 1;
}

export async function listWorks(q: string, filter: AdminWorkFilter, page: number): Promise<AdminWorkRow[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  const text = q.trim().slice(0, 200);
  if (/^\d{1,15}$/.test(text)) {
    params.push(Number(text));
    where.push(`id = $${params.length}`);
  } else if (text) {
    params.push(`%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
    where.push(`title ilike $${params.length}`);
  }
  if (filter === "hidden") where.push("is_hidden");
  if (filter === "edited") where.push("edited_at is not null");
  if (filter === "manual") where.push("source = 'manual'");
  params.push(ADMIN_PAGE_SIZE, (page - 1) * ADMIN_PAGE_SIZE);
  const { rows } = await pool.query<AdminWorkRow>(
    `select id, title, publication_year, language, source, is_hidden, hidden_reason, edited_at::text
     from works ${where.length ? `where ${where.join(" and ")}` : ""}
     order by coalesce(edited_at, updated_at) desc, id desc
     limit $${params.length - 1} offset $${params.length}`,
    params,
  );
  return rows;
}

export type AdminUserRow = {
  id: number;
  name: string;
  email: string;
  role: Role;
  is_blocked: boolean;
  has_google: boolean;
  created_at: string;
  last_login_at: string | null;
};

export async function listUsers(q: string, page: number): Promise<AdminUserRow[]> {
  const params: unknown[] = [];
  let where = "";
  const text = q.trim().slice(0, 200);
  if (text) {
    params.push(`%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
    where = "where name ilike $1 or email ilike $1";
  }
  params.push(ADMIN_PAGE_SIZE, (page - 1) * ADMIN_PAGE_SIZE);
  const { rows } = await pool.query<AdminUserRow>(
    `select id, name, email, role, is_blocked, google_sub is not null as has_google,
            created_at::text, last_login_at::text
     from users ${where}
     order by created_at desc
     limit $${params.length - 1} offset $${params.length}`,
    params,
  );
  return rows;
}

export type IngestJobRow = {
  id: number;
  params: Record<string, unknown> & { result?: Record<string, number> };
  status: "queued" | "running" | "done" | "failed";
  error: string | null;
  requested_by_name: string | null;
  created_at: string;
  finished_at: string | null;
};

export async function listIngestJobs(): Promise<IngestJobRow[]> {
  const { rows } = await pool.query<IngestJobRow>(
    `select j.id, j.params, j.status, j.error, u.name as requested_by_name,
            j.created_at::text, j.finished_at::text
     from ingest_jobs j left join users u on u.id = j.requested_by
     order by j.id desc limit 20`,
  );
  return rows;
}

export type IngestRunRow = {
  id: number;
  source: string;
  status: "running" | "success" | "failed";
  params: Record<string, unknown>;
  fetched: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
  started_at: string;
  finished_at: string | null;
};

export async function listIngestRuns(): Promise<IngestRunRow[]> {
  const { rows } = await pool.query<IngestRunRow>(
    `select id, source, status, params - 'filter' as params, fetched, inserted, updated, skipped, errors,
            started_at::text, finished_at::text
     from ingest_runs order by id desc limit 30`,
  );
  return rows;
}

export type AuditRow = {
  id: number;
  actor_name: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
};

export async function listAudit(page: number): Promise<AuditRow[]> {
  const { rows } = await pool.query<AuditRow>(
    `select a.id, u.name as actor_name, a.action, a.target_type, a.target_id, a.details, a.created_at::text
     from audit_log a left join users u on u.id = a.actor_id
     order by a.id desc limit $1 offset $2`,
    [ADMIN_PAGE_SIZE, (page - 1) * ADMIN_PAGE_SIZE],
  );
  return rows;
}
