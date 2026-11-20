import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CodeTabs } from "@/components/CodeTabs";
import { Markdown } from "@/components/Markdown";
import { MethodBadge } from "@/components/MethodBadge";
import { ApiNav } from "@/components/reference/ApiNav";
import { SchemaView } from "@/components/SchemaView";
import { TryIt } from "@/components/TryIt";
import { getSession } from "@/lib/auth/session";
import { ruleFor } from "@/lib/checksum";
import { env } from "@/lib/env";
import { buildUrl, generate, LANGUAGES } from "@/lib/openapi/codegen";
import { jsonMedia } from "@/lib/openapi/operations";
import { mediaExamples } from "@/lib/openapi/sample";
import { getApi } from "@/lib/openapi/spec";
import { listCredentials } from "@/lib/services/credentials";

type Props = { params: Promise<{ slug: string }> };

// Rendered per request: the "Try it" panel depends on the signed-in developer's credentials.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const op = getApi().bySlug.get((await params).slug);
  return { title: op ? op.summary : "Not found" };
}

export default async function OperationPage({ params }: Props) {
  const { slug } = await params;
  const { spec, bySlug } = getApi();
  const op = bySlug.get(slug);
  if (!op || !op.group.visible) notFound();

  const session = await getSession();
  const credentials = session ? listCredentials(session.org.id, "sandbox").filter((c) => c.status === "active") : [];

  const reqMedia = jsonMedia(op.requestBody);
  const examples = mediaExamples(spec, reqMedia);
  const firstBody = examples[0]?.value;
  const checksum = ruleFor(op.method, op.path, (firstBody ?? {}) as Record<string, unknown>) ?? ruleFor(op.method, op.path);

  const headerParams = op.parameters.filter((p) => p.in === "header");
  const headers: Record<string, string> = {};
  if (op.requiresAuth) headers.Authorization = "Bearer <access_token>";
  for (const p of headerParams) headers[p.name] = p.example !== undefined ? String(p.example) : `<${p.name}>`;
  if (reqMedia && op.method !== "get") headers["Content-Type"] = "application/json";

  const sample = (base: string) => ({
    method: op.method.toUpperCase(),
    url: buildUrl(
      base,
      op.path,
      Object.fromEntries(op.parameters.filter((p) => p.in === "path").map((p) => [p.name, p.example !== undefined ? String(p.example) : `{${p.name}}`])),
      Object.fromEntries(op.parameters.filter((p) => p.in === "query" && p.required).map((p) => [p.name, p.example !== undefined ? String(p.example) : `<${p.name}>`])),
    ),
    headers,
    body: firstBody,
  });

  const responseTabs = op.responses.flatMap(({ status, response }) => {
    const ex = mediaExamples(spec, jsonMedia(response));
    return ex.slice(0, 4).map((e, i) => ({
      id: `${status}-${i}`,
      label: ex.length > 1 ? `${status} · ${e.label}` : status,
      code: JSON.stringify(e.value, null, 2),
      json: true,
    }));
  });

  const byIn = (where: string) => op.parameters.filter((p) => p.in === where);

  return (
    <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-8 lg:grid-cols-[250px_minmax(0,1fr)] lg:px-8">
      <aside className="hidden lg:block">
        <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2">
          <ApiNav activeSlug={op.slug} />
        </div>
      </aside>

      <main className="grid min-w-0 gap-10 xl:grid-cols-[minmax(0,1fr)_500px]">
        <article className="min-w-0">
          <details className="mb-6 rounded-[var(--radius-md)] border border-line bg-surface p-3 text-sm lg:hidden">
          <summary className="cursor-pointer font-semibold">Browse endpoints</summary>
          <div className="mt-3"><ApiNav activeSlug={op.slug} /></div>
        </details>
          <p className="text-sm font-semibold text-brand-ink">{op.group.title}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{op.summary}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <MethodBadge method={op.method} />
            <code className="break-all text-sm">{op.path}</code>
            {op.requiresAuth ? <span className="text-xs text-ink-soft">Requires bearer token</span> : null}
          </div>

          {op.description ? <Markdown source={op.description} className="prose-doc mt-6" /> : null}

          {checksum ? (
            <div className="mt-6 rounded-[var(--radius-md)] border-l-[3px] border-signal bg-signal-wash px-4 py-3 text-sm">
              <p className="font-semibold">This request needs a checksum</p>
              <p className="mt-1">
                Set <code>{checksum.field}</code> to sha256(<code>{checksum.inputs.join(" + ")}</code> + salt), lowercase hex.
              </p>
            </div>
          ) : null}

          {(["path", "query", "header"] as const).map((where) =>
            byIn(where).length ? (
              <section key={where} className="mt-8">
                <h2 className="mb-2 text-lg font-bold">{where === "path" ? "Path parameters" : where === "query" ? "Query parameters" : "Headers"}</h2>
                <ul className="divide-y divide-line-soft border-y border-line-soft">
                  {byIn(where).map((p) => (
                    <li key={p.name} className="py-2.5">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <code className="font-semibold">{p.name}</code>
                        {p.required ? <span className="text-xs font-semibold text-signal-ink">required</span> : null}
                      </div>
                      {p.description ? <p className="mt-1 text-sm text-ink-soft">{p.description}</p> : null}
                      {/tenant/i.test(p.name) ? (
                        <p className="mt-1 text-xs text-ink-faint">The sandbox console fills this in from your credentials.</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null,
          )}

          {reqMedia ? (
            <section className="mt-8">
              <h2 className="mb-2 text-lg font-bold">Request body</h2>
              {op.requestBody?.description && op.requestBody.description !== op.summary ? (
                <p className="mb-2 text-sm text-ink-soft">{op.requestBody.description}</p>
              ) : null}
              <SchemaView spec={spec} schema={reqMedia.schema} />
            </section>
          ) : null}

          <section className="mt-8">
            <h2 className="mb-2 text-lg font-bold">Responses</h2>
            <div className="space-y-2">
              {op.responses.map(({ status, response }) => {
                const media = jsonMedia(response);
                return (
                  <details key={status} className="group rounded-[var(--radius-md)] border border-line bg-surface" open={status.startsWith("2")}>
                    <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-2.5 marker:hidden">
                      <span className={`font-mono text-sm font-semibold ${status.startsWith("2") ? "text-ok" : "text-danger"}`}>{status}</span>
                      <span className="text-sm text-ink-soft">{response.description}</span>
                    </summary>
                    {media?.schema ? (
                      <div className="border-t border-line-soft px-4 py-3">
                        <SchemaView spec={spec} schema={media.schema} />
                      </div>
                    ) : null}
                  </details>
                );
              })}
            </div>
          </section>
        </article>

        <aside className="min-w-0 space-y-5 xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:self-start xl:overflow-y-auto">
          <CodeTabs
            title="Request"
            rememberLanguage
            tabs={LANGUAGES.map((l) => ({ id: l.id, label: l.label, code: generate(l.id, sample(env.SANDBOX_API_BASE_URL)) }))}
          />
          {responseTabs.length ? <CodeTabs title="Response" tabs={responseTabs} maxHeight="20rem" /> : null}
          <TryIt
            slug={op.slug}
            method={op.method}
            path={op.path}
            params={op.parameters.map((p) => ({
              name: p.name,
              in: p.in,
              required: !!p.required,
              description: p.description,
              example: p.example !== undefined ? String(p.example) : undefined,
            }))}
            examples={examples}
            checksum={checksum ? { field: checksum.field, inputs: checksum.inputs } : undefined}
            signedIn={!!session}
            credentials={credentials.map((c) => ({ id: c.id, label: c.label, tenantId: c.tenantId, hierLabelIdReference: c.hierLabelIdReference, hierarchyCriteria: c.hierarchyCriteria }))}
            sandboxBaseUrl={env.SANDBOX_API_BASE_URL}
          />
        </aside>
      </main>
    </div>
  );
}
