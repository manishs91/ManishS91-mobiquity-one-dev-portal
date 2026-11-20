import Link from "next/link";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { requireSession } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { readiness } from "@/lib/services/golive";
import { listApiLogs } from "@/lib/services/sandbox";

export default async function DashboardHome() {
  const s = await requireSession();
  const steps = readiness(s.org.id);
  const done = steps.filter((x) => x.done).length;
  const logs = listApiLogs(s.org.id, 8);

  return (
    <>
      <PageHeader title={`Welcome, ${s.user.name.split(" ")[0]}`} intro={<>You&apos;re working in the sandbox at <code>{env.SANDBOX_API_BASE_URL}</code>. Nothing here moves real money.</>} />

      <section className="panel">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 className="font-bold">Integration checklist</h2>
            <p className="text-sm text-ink-soft">{done} of {steps.length} done. The first three are required before you can request production access.</p>
          </div>
          <div className="h-2 w-40 overflow-hidden rounded-full bg-line-soft" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={done}>
            <div className="h-full bg-brand" style={{ width: `${(done / steps.length) * 100}%` }} />
          </div>
        </div>
        <ol className="divide-y divide-line-soft">
          {steps.map((step) => (
            <li key={step.id} className="flex items-center gap-4 px-5 py-3">
              <span
                aria-hidden="true"
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${step.done ? "bg-ok text-white" : "border-2 border-line text-transparent"}`}
              >
                ✓
              </span>
              <span className={step.done ? "text-ink-soft line-through decoration-ink-faint" : "font-medium"}>{step.label}</span>
              <span className="sr-only">{step.done ? "(done)" : "(to do)"}</span>
              {!step.done ? <Link href={step.href} className="ml-auto text-sm font-semibold text-brand-ink hover:underline">Start</Link> : null}
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="font-bold">Recent sandbox requests</h2>
          <Link href="/dashboard/logs" className="text-sm font-semibold text-brand-ink hover:underline">All requests</Link>
        </div>
        {logs.length ? (
          <div className="panel overflow-x-auto">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-line-soft">
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td className="px-4 py-2.5 font-mono text-xs">{l.method}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{l.path}</td>
                    <td className={`px-4 py-2.5 font-mono text-xs font-semibold ${l.status < 300 ? "text-ok" : "text-danger"}`}>{l.status}</td>
                    <td className="px-4 py-2.5 text-right text-xs text-ink-soft">{new Date(l.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="panel px-5 py-8 text-center">
            <p className="font-semibold">No requests yet</p>
            <p className="mt-1 text-sm text-ink-soft">Open an endpoint in the API reference and send it from the console.</p>
            <Link href="/api-reference/post-authorization-auth-oauth2-token" className="btn btn-primary btn-sm mt-4">Generate a token</Link>
          </div>
        )}
      </section>
    </>
  );
}
