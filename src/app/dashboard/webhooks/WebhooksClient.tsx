"use client";
import { useState } from "react";
import { highlightJson } from "@/components/highlight";
import { useApi } from "@/components/useApi";
import type { WebhookDelivery, WebhookEndpoint } from "@/lib/store/types";

const EVENTS = [
  { id: "payment.success", label: "Payment succeeded (0000)" },
  { id: "payment.failed", label: "Payment failed (1702)" },
  { id: "payment.pending", label: "Payment pending (7000)" },
];

export function WebhooksClient({
  initialEndpoints,
  initialDeliveries,
  credentials,
  canManage,
}: {
  initialEndpoints: WebhookEndpoint[];
  initialDeliveries: WebhookDelivery[];
  credentials: { id: string; label: string }[];
  canManage: boolean;
}) {
  const [endpoints, setEndpoints] = useState(initialEndpoints);
  const [deliveries, setDeliveries] = useState(initialDeliveries);
  const [event, setEvent] = useState(EVENTS[0].id);
  const [credentialId, setCredentialId] = useState(credentials[0]?.id ?? "");
  const add = useApi<{ endpoint: WebhookEndpoint }>();
  const test = useApi<{ delivery: WebhookDelivery }>();
  const del = useApi();

  const sandbox = endpoints.filter((e) => e.environment === "sandbox");
  const missingKinds = (["primary", "fallback"] as const).filter((k) => !sandbox.some((e) => e.kind === k));

  return (
    <div className="space-y-8">
      <section className="panel">
        <h2 className="border-b border-line px-5 py-3 font-bold">Sandbox URLs</h2>
        {sandbox.length ? (
          <ul className="divide-y divide-line-soft">
            {sandbox.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <span className="w-20 text-sm font-semibold capitalize">{e.kind}</span>
                <code className="min-w-0 flex-1 break-all text-sm">{e.url}</code>
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={test.busy || !credentialId}
                  onClick={async () => {
                    const r = await test.call(`/api/webhooks/${e.id}/test`, { body: { event, credentialId } });
                    if (r) setDeliveries((d) => [r.delivery, ...d]);
                  }}
                >
                  {test.busy ? "Sending…" : "Send test event"}
                </button>
                {canManage ? (
                  <button
                    className="btn btn-danger btn-sm"
                    disabled={del.busy}
                    onClick={async () => {
                      if (!confirm("Delete this webhook URL?")) return;
                      if (await del.call(`/api/webhooks/${e.id}`, { method: "DELETE" })) setEndpoints((l) => l.filter((x) => x.id !== e.id));
                    }}
                  >
                    Delete
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-6 text-sm text-ink-soft">No URLs saved yet. Add your primary URL below.</p>
        )}
        {sandbox.length ? (
          <div className="flex flex-wrap items-end gap-3 border-t border-line px-5 py-3">
            <div>
              <label className="label" htmlFor="wh-event">Test event</label>
              <select id="wh-event" className="field h-9 text-sm" value={event} onChange={(e) => setEvent(e.target.value)}>
                {EVENTS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="wh-cred">Sign checksum with</label>
              <select id="wh-cred" className="field h-9 text-sm" value={credentialId} onChange={(e) => setCredentialId(e.target.value)}>
                {credentials.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <p className="pb-2 text-xs text-ink-soft">The payload&apos;s checksum uses this credential&apos;s salt, so you can test your verification code.</p>
          </div>
        ) : null}
        {test.error || del.error ? <p role="alert" className="px-5 pb-3 text-sm text-danger">{test.error ?? del.error}</p> : null}
      </section>

      {canManage && missingKinds.length > 0 ? (
        <form
          className="panel flex flex-wrap items-end gap-3 p-5"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const r = await add.call("/api/webhooks", { body: { url: f.get("url"), kind: f.get("kind"), environment: "sandbox" } });
            if (r) {
              setEndpoints((l) => [...l, r.endpoint]);
              e.currentTarget.reset();
            }
          }}
        >
          <div>
            <label className="label" htmlFor="wh-kind">Type</label>
            <select id="wh-kind" name="kind" className="field">
              {missingKinds.map((k) => <option key={k} value={k}>{k === "primary" ? "Primary" : "Fallback"}</option>)}
            </select>
          </div>
          <div className="min-w-[18rem] flex-1">
            <label className="label" htmlFor="wh-url">URL</label>
            <input id="wh-url" name="url" type="url" required className="field" placeholder="https://api.yourstore.com/webhooks/mobiquity" />
          </div>
          <button className="btn btn-primary" disabled={add.busy}>{add.busy ? "Saving…" : "Save URL"}</button>
          {add.error ? <p role="alert" className="w-full text-sm text-danger">{add.error}</p> : null}
        </form>
      ) : null}

      <section>
        <h2 className="mb-3 font-bold">Test deliveries</h2>
        {deliveries.length ? (
          <ul className="space-y-2">
            {deliveries.map((d) => {
              const ok = d.responseStatus && d.responseStatus < 300;
              return (
                <li key={d.id}>
                  <details className="panel">
                    <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 px-4 py-3 text-sm marker:hidden">
                      <span className={`rounded px-2 py-0.5 font-mono text-xs font-semibold ${ok ? "bg-rail-wash text-rail-deep" : "bg-danger-wash text-danger"}`}>
                        {d.responseStatus ?? "error"}
                      </span>
                      <span className="font-medium">{d.event}</span>
                      <code className="min-w-0 truncate text-xs text-ink-soft">{d.url}</code>
                      <span className="ml-auto text-xs text-ink-faint">{d.durationMs} ms, {new Date(d.createdAt).toLocaleString()}</span>
                    </summary>
                    <div className="grid gap-3 border-t border-line-soft p-4 lg:grid-cols-2">
                      <div>
                        <p className="mb-1 text-xs font-semibold text-ink-soft">Payload sent</p>
                        <pre className="max-h-72 overflow-auto rounded bg-code p-3 text-xs text-[#dbe7f3]"><code>{highlightJson(JSON.stringify(JSON.parse(d.requestBody), null, 2))}</code></pre>
                      </div>
                      <div>
                        <p className="mb-1 text-xs font-semibold text-ink-soft">Your response</p>
                        <pre className="max-h-72 overflow-auto rounded bg-code p-3 text-xs text-[#dbe7f3]"><code>{d.error ?? d.responseBody ?? "(empty)"}</code></pre>
                      </div>
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-ink-soft">Test events you send will appear here with your server&apos;s response.</p>
        )}
      </section>
    </div>
  );
}
