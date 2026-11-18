import { PageHeader } from "@/components/dashboard/PageHeader";
import { highlightJson } from "@/components/highlight";
import { requireSession } from "@/lib/auth/session";
import { listApiLogs } from "@/lib/services/sandbox";

export const metadata = { title: "Request logs" };

function pretty(s?: string) {
  if (!s) return "(empty)";
  try {
    return JSON.stringify(JSON.parse(s), null, 2);
  } catch {
    return s;
  }
}

export default async function LogsPage() {
  const s = await requireSession("/dashboard/logs");
  const logs = listApiLogs(s.org.id, 200);
  return (
    <>
      <PageHeader title="Request logs" intro="The last 200 requests your team sent from the sandbox console, with the exact body sent and the response received." />
      {logs.length ? (
        <ul className="space-y-2">
          {logs.map((l) => (
            <li key={l.id}>
              <details className="panel">
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 px-4 py-3 text-sm marker:hidden">
                  <span className={`rounded px-2 py-0.5 font-mono text-xs font-semibold ${l.status < 300 && l.status > 0 ? "bg-rail-wash text-rail-deep" : "bg-danger-wash text-danger"}`}>{l.status}</span>
                  <span className="font-mono text-xs font-semibold">{l.method}</span>
                  <code className="text-xs">{l.path}</code>
                  <span className="ml-auto text-xs text-ink-faint">{l.durationMs} ms, {new Date(l.createdAt).toLocaleString()}</span>
                </summary>
                <div className="grid gap-3 border-t border-line-soft p-4 lg:grid-cols-2">
                  <div>
                    <p className="mb-1 text-xs font-semibold text-ink-soft">Request body</p>
                    <pre className="max-h-80 overflow-auto rounded bg-code p-3 text-xs text-[#dbe7f3]"><code>{highlightJson(pretty(l.requestBody))}</code></pre>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold text-ink-soft">Response body</p>
                    <pre className="max-h-80 overflow-auto rounded bg-code p-3 text-xs text-[#dbe7f3]"><code>{highlightJson(pretty(l.responseBody))}</code></pre>
                  </div>
                </div>
              </details>
            </li>
          ))}
        </ul>
      ) : (
        <div className="panel px-5 py-10 text-center">
          <p className="font-semibold">No requests yet</p>
          <p className="mt-1 text-sm text-ink-soft">Requests sent from the API reference console show up here.</p>
        </div>
      )}
    </>
  );
}
