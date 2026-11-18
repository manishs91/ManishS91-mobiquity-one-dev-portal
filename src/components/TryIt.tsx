"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { buildUrl, generate } from "@/lib/openapi/codegen";
import { CodeTabs } from "./CodeTabs";
import { highlightJson } from "./highlight";

export interface TryItParam {
  name: string;
  in: "query" | "header" | "path" | "cookie";
  required: boolean;
  description?: string;
  example?: string;
}

export interface TryItCredential {
  id: string;
  label: string;
  tenantId: string;
  hierLabelIdReference: string;
  hierarchyCriteria: string;
}

const NEW_ORDER_PATHS = /initiatePayment$|CheckEligibility$/i;

/**
 * Make a spec example runnable for this developer: use their business unit ID and
 * hierarchy, and a fresh orderId for payment calls (the sandbox rejects reused order IDs).
 */
function prepare(value: unknown, cred: TryItCredential | undefined, path: string): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const out = structuredClone(value) as Record<string, unknown>;
  if (cred) {
    if ("hierLabelIdReference" in out) out.hierLabelIdReference = cred.hierLabelIdReference;
    if ("hierLabelId" in out) out.hierLabelId = cred.hierLabelIdReference;
    if ("hierarchyCriteria" in out) out.hierarchyCriteria = cred.hierarchyCriteria;
  }
  if (NEW_ORDER_PATHS.test(path) && typeof out.orderId === "string") {
    out.orderId = `ord_${Math.random().toString(36).slice(2, 10)}`;
  }
  return out;
}

interface Props {
  slug: string;
  method: string;
  path: string;
  params: TryItParam[];
  examples: { key: string; label: string; value: unknown }[];
  checksum?: { field: string; inputs: string[] };
  signedIn: boolean;
  credentials: TryItCredential[];
  sandboxBaseUrl: string;
}

interface Result {
  status: number;
  durationMs: number;
  body: unknown;
  request: { method: string; url: string; headers: Record<string, string>; body?: unknown; checksumField?: string };
}

export function TryIt(props: Props) {
  const { signedIn, credentials, method, path, params, examples, checksum } = props;
  const hasBody = examples.length > 0 && method.toLowerCase() !== "get";
  const [credentialId, setCredentialId] = useState(credentials[0]?.id ?? "");
  const [exampleKey, setExampleKey] = useState(examples[0]?.key ?? "");
  const [body, setBody] = useState(() =>
    examples[0] ? JSON.stringify(prepare(examples[0].value, credentials[0], path), null, 2) : "",
  );
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(params.filter((p) => !/tenant/i.test(p.name)).map((p) => [`${p.in}:${p.name}`, p.example ?? ""])),
  );
  const [autoChecksum, setAutoChecksum] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const bodyError = useMemo(() => {
    if (!hasBody || !body.trim()) return null;
    try {
      JSON.parse(body);
      return null;
    } catch (e) {
      return (e as Error).message;
    }
  }, [body, hasBody]);

  if (!signedIn) {
    return (
      <div className="panel p-5">
        <p className="font-semibold">Run this request against the sandbox</p>
        <p className="mt-1 text-sm text-ink-soft">Sign in and the console fills in your access token, tenant header and request checksum for you.</p>
        <div className="mt-4 flex gap-2">
          <Link href={`/signup?next=/api-reference/${props.slug}`} className="btn btn-primary btn-sm">
            Create a sandbox account
          </Link>
          <Link href={`/login?next=/api-reference/${props.slug}`} className="btn btn-secondary btn-sm">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  if (!credentials.length) {
    return (
      <div className="panel p-5">
        <p className="font-semibold">You need sandbox credentials first</p>
        <p className="mt-1 text-sm text-ink-soft">Create a sandbox credential set, then come back to run this request.</p>
        <Link href="/dashboard/credentials" className="btn btn-primary btn-sm mt-4">
          Create sandbox credentials
        </Link>
      </div>
    );
  }

  const cred = credentials.find((c) => c.id === credentialId);
  const pick = (key: string) => {
    setExampleKey(key);
    const ex = examples.find((e) => e.key === key);
    if (ex) setBody(JSON.stringify(prepare(ex.value, cred, path), null, 2));
  };
  const freshOrder = NEW_ORDER_PATHS.test(path);

  const collect = (where: TryItParam["in"]) =>
    Object.fromEntries(
      params
        .filter((p) => p.in === where)
        .map((p) => [p.name, values[`${p.in}:${p.name}`] ?? ""])
        .filter(([, v]) => v !== ""),
    );

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/sandbox/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: props.slug,
          credentialId,
          pathParams: collect("path"),
          query: collect("query"),
          headers: collect("header"),
          body: hasBody && body.trim() ? JSON.parse(body) : undefined,
          autoChecksum,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
      setResult(data as Result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const editableParams = params.filter((p) => !/tenant/i.test(p.name));
  const ok = result && result.status >= 200 && result.status < 300;

  return (
    <div className="panel">
      <div className="border-b border-line px-5 py-3">
        <p className="font-semibold">Try it in the sandbox</p>
        <p className="text-xs text-ink-soft">
          Calls <code>{props.sandboxBaseUrl}</code>. Your token{params.some((p) => /tenant/i.test(p.name)) ? ", tenant header" : ""}
          {checksum ? " and checksum" : ""} are added on the server.
        </p>
      </div>
      <div className="space-y-4 p-5">
        <div>
          <label className="label" htmlFor="tryit-cred">
            Credentials
          </label>
          <select
            id="tryit-cred"
            className="field"
            value={credentialId}
            onChange={(e) => {
              setCredentialId(e.target.value);
              const next = credentials.find((c) => c.id === e.target.value);
              try {
                setBody((b) => (b.trim() ? JSON.stringify(prepare(JSON.parse(b), next, "-"), null, 2) : b));
              } catch {}
            }}
          >
            {credentials.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label} (tenant {c.tenantId})
              </option>
            ))}
          </select>
        </div>

        {editableParams.length > 0 && (
          <fieldset className="space-y-3">
            <legend className="label">Parameters</legend>
            {editableParams.map((p) => {
              const key = `${p.in}:${p.name}`;
              return (
                <div key={key}>
                  <label className="mb-1 flex items-baseline gap-2 text-sm" htmlFor={`p-${key}`}>
                    <code className="font-semibold">{p.name}</code>
                    <span className="text-xs text-ink-faint">{p.in}</span>
                    {p.required ? <span className="text-xs font-semibold text-signal">required</span> : null}
                  </label>
                  <input
                    id={`p-${key}`}
                    className="field font-mono text-sm"
                    value={values[key] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                    placeholder={p.description?.slice(0, 80)}
                  />
                </div>
              );
            })}
          </fieldset>
        )}

        {hasBody && (
          <div>
            <div className="mb-1 flex items-end justify-between gap-3">
              <label className="label mb-0" htmlFor="tryit-body">
                Request body
              </label>
              {examples.length > 1 && (
                <select aria-label="Example scenario" className="field h-8 w-auto max-w-[60%] text-xs" value={exampleKey} onChange={(e) => pick(e.target.value)}>
                  {examples.map((e) => (
                    <option key={e.key} value={e.key}>
                      {e.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <textarea
              id="tryit-body"
              className="field min-h-[16rem] font-mono text-[12.5px] leading-relaxed"
              spellCheck={false}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            {bodyError ? <p className="mt-1 text-xs text-danger">Invalid JSON: {bodyError}</p> : null}
            {freshOrder ? (
              <button
                type="button"
                className="mt-1 text-xs font-semibold text-rail hover:underline"
                onClick={() => {
                  try {
                    setBody(JSON.stringify(prepare(JSON.parse(body), cred, path), null, 2));
                  } catch {}
                }}
              >
                Use a new order ID
              </button>
            ) : null}
            {checksum ? (
              <label className="mt-2 flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1" checked={autoChecksum} onChange={(e) => setAutoChecksum(e.target.checked)} />
                <span>
                  Compute <code>{checksum.field}</code> for me
                  <span className="block text-xs text-ink-soft">
                    sha256({checksum.inputs.join(" + ")} + salt), using this credential&apos;s salt.
                  </span>
                </span>
              </label>
            ) : null}
          </div>
        )}

        <button type="button" className="btn btn-primary w-full" disabled={busy || !!bodyError || !credentialId} onClick={send}>
          {busy ? "Sending…" : `Send ${method.toUpperCase()} request`}
        </button>
        {error ? (
          <p role="alert" className="rounded-[var(--radius-md)] bg-danger-wash px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}
      </div>

      {result && (
        <div className="border-t border-line p-5" aria-live="polite">
          <div className="mb-2 flex items-center gap-3 text-sm">
            <span className={`rounded px-2 py-0.5 font-mono text-xs font-semibold ${ok ? "bg-rail-wash text-rail-deep" : "bg-danger-wash text-danger"}`}>
              {result.status}
            </span>
            <span className="text-ink-soft">{result.durationMs} ms</span>
          </div>
          <pre className="max-h-80 overflow-auto rounded-[var(--radius-md)] bg-code p-4 text-[12.5px] text-[#dbe7f3]">
            <code>{typeof result.body === "string" ? result.body : highlightJson(JSON.stringify(result.body, null, 2))}</code>
          </pre>
          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-semibold text-ink-soft">Show the request that was sent</summary>
            <div className="mt-2">
              <CodeTabs
                rememberLanguage
                tabs={(["curl", "node", "python", "java", "php"] as const).map((lang) => ({
                  id: lang,
                  label: { curl: "cURL", node: "Node.js", python: "Python", java: "Java", php: "PHP" }[lang],
                  code: generate(lang, {
                    method: result.request.method,
                    url: result.request.url || buildUrl(props.sandboxBaseUrl, path),
                    headers: result.request.headers,
                    body: result.request.body,
                  }),
                }))}
              />
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
