import Link from "next/link";
import { CodeTabs } from "@/components/CodeTabs";
import { MethodBadge } from "@/components/MethodBadge";
import { ApiNav } from "@/components/reference/ApiNav";
import { CHECKSUM_RULES } from "@/lib/checksum";
import { env } from "@/lib/env";
import { generate, LANGUAGES } from "@/lib/openapi/codegen";
import { getApi } from "@/lib/openapi/spec";

export const metadata = { title: "API reference" };

export default function ApiOverviewPage() {
  const { spec, groups, fixes } = getApi();
  const tokenReq = {
    method: "POST",
    url: `${env.SANDBOX_API_BASE_URL}/authorization/auth/oauth2/token`,
    headers: { "Content-Type": "application/json" },
    body: { grant_type: "client_credentials", tenant_id: "<your_tenant_id>", client_secret: "<your_client_secret>" },
  };
  return (
    <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-8 lg:grid-cols-[250px_minmax(0,1fr)] lg:px-8">
      <aside className="hidden lg:block">
        <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2">
          <ApiNav />
        </div>
      </aside>
      <main className="min-w-0">
        <details className="mb-6 rounded-[var(--radius-md)] border border-line bg-surface p-3 text-sm lg:hidden">
          <summary className="cursor-pointer font-semibold">Browse endpoints</summary>
          <div className="mt-3"><ApiNav /></div>
        </details>
        <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_480px]">
          <div className="prose-doc">
            <h1>API reference</h1>
            <p>{spec.info.description}</p>
            <h2>Base URLs</h2>
            <table>
              <thead>
                <tr><th>Environment</th><th>Base URL</th></tr>
              </thead>
              <tbody>
                {spec.servers?.map((s) => (
                  <tr key={s.url}><td>{s.description}</td><td><code>{s.url}</code></td></tr>
                ))}
              </tbody>
            </table>
            <h2>Authentication</h2>
            <p>
              Exchange your tenant ID and client secret for a short-lived bearer token, then send it as{" "}
              <code>Authorization: Bearer &lt;accessToken&gt;</code> on every call. Refresh it before{" "}
              <code>accessTokenExpiresAt</code> with the refresh token. See{" "}
              <Link href="/docs/authentication">Authentication</Link>.
            </p>
            <h2>Request checksums</h2>
            <p>
              Payment, refund and enquiry requests carry a checksum so Mobiquity One can tell the request wasn&apos;t altered.
              It&apos;s the lowercase hex SHA-256 of the listed fields concatenated in order, followed by your checksum salt.
            </p>
            <table>
              <thead>
                <tr><th>Request</th><th>Field</th><th>Concatenate</th></tr>
              </thead>
              <tbody>
                {CHECKSUM_RULES.map((r) => (
                  <tr key={r.id}>
                    <td>{r.label}</td>
                    <td><code>{r.field}</code></td>
                    <td><code>{[...r.inputs, "salt"].join(" + ")}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>
              The <Link href="/docs/checksums">checksum guide</Link> has code for each language, and the sandbox console
              computes checksums for you.
            </p>
            <h2>Endpoints</h2>
          </div>
          <div className="xl:sticky xl:top-24 xl:self-start">
            <CodeTabs
              title="Get an access token"
              rememberLanguage
              tabs={LANGUAGES.map((l) => ({ id: l.id, label: l.label, code: generate(l.id, tokenReq) }))}
            />
          </div>
        </div>

        <div className="mt-2 grid gap-x-10 gap-y-8 md:grid-cols-2">
          {groups.map(({ group, operations }) => (
            <section key={group.id} aria-labelledby={`g-${group.id}`}>
              <h3 id={`g-${group.id}`} className="font-bold">{group.title}</h3>
              <p className="mb-2 text-sm text-ink-soft">{group.description}</p>
              <ul className="divide-y divide-line-soft border-y border-line-soft">
                {operations.map((op) => (
                  <li key={op.slug}>
                    <Link href={`/api-reference/${op.slug}`} className="flex items-center gap-3 py-2 text-sm hover:text-brand-ink">
                      <MethodBadge method={op.method} size="sm" />
                      <span className="font-medium">{op.summary}</span>
                      <code className="ml-auto hidden truncate text-xs text-ink-faint sm:block">{op.path}</code>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        {fixes.length > 0 && (
          <details className="mt-12 text-sm text-ink-soft">
            <summary className="cursor-pointer font-semibold">Spec notes ({fixes.length})</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {fixes.map((f) => (
                <li key={f.id}>{f.message}</li>
              ))}
            </ul>
          </details>
        )}
      </main>
    </div>
  );
}
