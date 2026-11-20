"use client";
import { CopyButton } from "../CopyButton";

export interface Revealed {
  credential: { id: string; label: string; tenantId: string; hierLabelIdReference: string; hierarchyCriteria: string; environment: string };
  clientSecret: string;
  checksumSalt: string;
}

/** Shown once, right after credentials are created or rotated. */
export function SecretReveal({ revealed }: { revealed: Revealed }) {
  const { credential: c } = revealed;
  const env = [
    `MOBIQUITY_TENANT_ID=${c.tenantId}`,
    `MOBIQUITY_CLIENT_SECRET=${revealed.clientSecret}`,
    `MOBIQUITY_CHECKSUM_SALT=${revealed.checksumSalt}`,
    `MOBIQUITY_HIER_LABEL_ID=${c.hierLabelIdReference}`,
    `MOBIQUITY_HIERARCHY_CRITERIA=${c.hierarchyCriteria}`,
  ].join("\n");
  const rows = [
    ["Tenant ID", c.tenantId, "tenant_id when requesting a token"],
    ["Client secret", revealed.clientSecret, "client_secret when requesting a token"],
    ["Checksum salt", revealed.checksumSalt, "Appended when computing checksums"],
    ["Business unit ID", c.hierLabelIdReference, "hierLabelIdReference on payment requests"],
    ["Hierarchy criteria", c.hierarchyCriteria, "hierarchyCriteria on payment requests"],
  ];
  return (
    <div className="rounded-[var(--radius-lg)] border-2 border-signal bg-surface">
      <p className="border-b border-line px-4 py-2.5 text-sm font-semibold">
        {c.label} <span className="font-normal text-ink-soft">({c.environment})</span>
      </p>
      <dl className="divide-y divide-line-soft">
        {rows.map(([k, v, hint]) => (
          <div key={k} className="grid gap-1 px-4 py-2.5 sm:grid-cols-[9rem_minmax(0,1fr)_auto] sm:items-center">
            <dt className="text-sm font-semibold">{k}</dt>
            <dd className="min-w-0">
              <code className="block break-all text-[13px]">{v}</code>
              <span className="text-xs text-ink-faint">{hint}</span>
            </dd>
            <CopyButton text={v} className="justify-self-start !text-brand-ink hover:!bg-brand-wash" />
          </div>
        ))}
      </dl>
      <div className="flex items-center justify-between border-t border-line px-4 py-2.5">
        <span className="text-xs text-ink-soft">Store these in your secrets manager or a local .env file.</span>
        <CopyButton text={env} label="Copy as .env" className="!text-brand-ink hover:!bg-brand-wash" />
      </div>
    </div>
  );
}
