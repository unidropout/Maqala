import { IngestForm } from "@/components/admin/AdminForms";
import { listIngestJobs, listIngestRuns } from "@/lib/admin/queries";
import { requireUser } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { pageLang, type LangParams } from "@/lib/i18n/server";

function describe(params: Record<string, unknown>): string {
  return Object.entries(params)
    .filter(([key, value]) => key !== "result" && value !== null && !(Array.isArray(value) && value.length === 0))
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`)
    .join(" · ");
}

export default async function AdminIngestPage({ params }: LangParams) {
  const { lang, t } = await pageLang(params);
  await requireUser(lang, "superadmin");
  const [jobs, runs] = await Promise.all([listIngestJobs(), listIngestRuns()]);
  const i = t.admin.ingest;

  return (
    <div className="space-y-10">
      <section className="card max-w-3xl p-6 sm:p-8">
        <h2 className="display text-3xl">{t.admin.tabs.ingest}</h2>
        <div className="mt-6">
          <IngestForm lang={lang} t={i} />
        </div>
      </section>

      <section>
        <h2 className="display text-3xl">{i.jobs}</h2>
        <div className="mt-4 space-y-2">
          {jobs.length === 0 && <p className="card p-5 text-muted">{t.admin.empty}</p>}
          {jobs.map((job) => (
            <div key={job.id} className="card p-4 text-sm">
              <p className="label">
                #{job.id} · {i.statuses[job.status]} · {formatDate(job.created_at, lang)}
                {job.requested_by_name && ` · ${job.requested_by_name}`}
              </p>
              <p className="mt-1">{describe(job.params)}</p>
              {job.params.result && <p className="mt-1 text-muted">{i.stats(job.params.result as Parameters<typeof i.stats>[0])}</p>}
              {job.error && <p className="mt-1 text-muted">{job.error}</p>}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="display text-3xl">{i.runs}</h2>
        <div className="mt-4 space-y-2">
          {runs.map((run) => (
            <div key={run.id} className="card p-4 text-sm">
              <p className="label">
                #{run.id} · {run.source} · {i.statuses[run.status === "running" ? "running" : run.status === "success" ? "success" : "failed"]} ·{" "}
                {formatDate(run.started_at, lang)}
              </p>
              <p className="mt-1">{describe(run.params)}</p>
              <p className="mt-1 text-muted">{i.stats(run)}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
