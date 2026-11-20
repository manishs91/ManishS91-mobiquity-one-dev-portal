"use client";
import { useState } from "react";
import { SecretReveal, type Revealed } from "@/components/dashboard/SecretReveal";
import { useApi } from "@/components/useApi";
import type { PublicCredential } from "@/lib/services/credentials";

export function CredentialsClient({ initial, canManage, productionApproved }: { initial: PublicCredential[]; canManage: boolean; productionApproved: boolean }) {
  const [creds, setCreds] = useState(initial);
  const [revealed, setRevealed] = useState<Revealed | null>(null);
  const [salt, setSalt] = useState<Record<string, string>>({});
  const [label, setLabel] = useState("");
  const [environment, setEnvironment] = useState<"sandbox" | "production">("sandbox");
  const api = useApi<Revealed>();
  const act = useApi<{ credential: PublicCredential } & Partial<Revealed>>();

  const upsert = (c: PublicCredential) => setCreds((list) => [c, ...list.filter((x) => x.id !== c.id)]);

  return (
    <div className="space-y-8">
      {revealed ? (
        <div>
          <p className="mb-3 font-semibold">Copy these now. The client secret won&apos;t be shown again.</p>
          <SecretReveal revealed={revealed} />
          <button className="btn btn-secondary btn-sm mt-3" onClick={() => setRevealed(null)}>Done, hide secrets</button>
        </div>
      ) : null}

      {canManage ? (
        <form
          className="panel flex flex-wrap items-end gap-3 p-5"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await api.call("/api/credentials", { body: { label, environment } });
            if (r) {
              upsert(r.credential as PublicCredential);
              setRevealed(r);
              setLabel("");
            }
          }}
        >
          <div className="min-w-[14rem] flex-1">
            <label className="label" htmlFor="cred-label">Label</label>
            <input id="cred-label" className="field" placeholder="e.g. Checkout backend" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={60} />
          </div>
          <div>
            <label className="label" htmlFor="cred-env">Environment</label>
            <select id="cred-env" className="field" value={environment} onChange={(e) => setEnvironment(e.target.value as "sandbox" | "production")}>
              <option value="sandbox">Sandbox</option>
              <option value="production" disabled={!productionApproved}>Production{productionApproved ? "" : " (after go-live approval)"}</option>
            </select>
          </div>
          <button className="btn btn-primary" disabled={api.busy}>{api.busy ? "Creating…" : "Create credentials"}</button>
          {api.error ? <p role="alert" className="w-full text-sm text-danger">{api.error}</p> : null}
        </form>
      ) : (
        <p className="text-sm text-ink-soft">Only admins and owners can create or rotate credentials.</p>
      )}

      {act.error ? <p role="alert" className="text-sm text-danger">{act.error}</p> : null}

      {creds.length === 0 ? (
        <div className="panel px-5 py-10 text-center">
          <p className="font-semibold">No credentials yet</p>
          <p className="mt-1 text-sm text-ink-soft">Create a sandbox set above to start making test calls.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {creds.map((c) => (
            <li key={c.id} className={`panel p-5 ${c.status === "revoked" ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold">
                    {c.label}
                    <span className={`ml-2 rounded px-1.5 py-0.5 text-xs font-semibold ${c.environment === "sandbox" ? "bg-line-soft text-ink-soft" : "bg-ok-wash text-ok-deep"}`}>{c.environment}</span>
                    {c.status === "revoked" ? <span className="ml-2 rounded bg-danger-wash px-1.5 py-0.5 text-xs font-semibold text-danger">revoked</span> : null}
                  </p>
                  <p className="text-xs text-ink-faint">
                    Created {new Date(c.createdAt).toLocaleDateString()}
                    {c.rotatedAt ? `, rotated ${new Date(c.rotatedAt).toLocaleDateString()}` : ""}
                    {c.lastUsedAt ? `, last used ${new Date(c.lastUsedAt).toLocaleString()}` : ", not used yet"}
                  </p>
                </div>
                {canManage && c.status === "active" ? (
                  <div className="flex gap-2">
                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={act.busy}
                      onClick={async () => {
                        if (!confirm("Rotate the client secret? The old secret stops working immediately.")) return;
                        const r = await act.call(`/api/credentials/${c.id}/rotate`, { body: {} });
                        if (r?.clientSecret) { upsert(r.credential); setRevealed(r as Revealed); }
                      }}
                    >
                      Rotate secret
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      disabled={act.busy}
                      onClick={async () => {
                        if (!confirm(`Revoke "${c.label}"? Apps using it will get 401 errors. This can't be undone.`)) return;
                        const r = await act.call(`/api/credentials/${c.id}/revoke`, { body: {} });
                        if (r) upsert(r.credential);
                      }}
                    >
                      Revoke
                    </button>
                  </div>
                ) : null}
              </div>
              <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div><dt className="text-xs text-ink-faint">Tenant ID</dt><dd><code>{c.tenantId}</code></dd></div>
                <div><dt className="text-xs text-ink-faint">Client secret</dt><dd><code>{c.clientSecretPreview}</code></dd></div>
                <div><dt className="text-xs text-ink-faint">Business unit ID</dt><dd><code className="break-all">{c.hierLabelIdReference}</code></dd></div>
                <div><dt className="text-xs text-ink-faint">Hierarchy criteria</dt><dd><code>{c.hierarchyCriteria}</code></dd></div>
                {c.environment === "sandbox" && c.status === "active" && canManage ? (
                  <div className="sm:col-span-2 lg:col-span-4">
                    <dt className="text-xs text-ink-faint">Checksum salt</dt>
                    <dd>
                      {salt[c.id] ? (
                        <code className="break-all">{salt[c.id]}</code>
                      ) : (
                        <button
                          className="text-sm font-semibold text-brand-ink hover:underline"
                          onClick={async () => {
                            const r = await fetch(`/api/credentials/${c.id}/salt`).then((x) => x.json());
                            if (r.checksumSalt) setSalt((m) => ({ ...m, [c.id]: r.checksumSalt }));
                          }}
                        >
                          Show sandbox salt
                        </button>
                      )}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
