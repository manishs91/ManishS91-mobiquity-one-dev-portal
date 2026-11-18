import "server-only";
import { signBody } from "../checksum";
import { randomId } from "../crypto";
import { env } from "../env";
import { HttpError } from "../http";
import { buildUrl } from "../openapi/codegen";
import { getApi } from "../openapi/spec";
import { adminCall } from "../providers/local";
import { now, store, trim } from "../store";
import { loadSecrets, markUsed } from "./credentials";

/**
 * Server-side proxy for the "Try it" console.
 *
 * Security properties:
 * - Only operations that exist in the OpenAPI spec can be called (no arbitrary URLs → no SSRF).
 * - Secrets never reach the browser: the portal fetches the OAuth token and computes checksums here.
 * - Sandbox only. Production calls are never proxied.
 */

const tokenCache = new Map<string, { token: string; expiresAt: number }>();
const MAX_BODY_BYTES = 64 * 1024;

async function getAccessToken(credId: string, tenantId: string, clientSecret: string): Promise<string> {
  const cached = tokenCache.get(credId);
  if (cached && cached.expiresAt - 30_000 > Date.now()) return cached.token;

  const request = () =>
    fetch(`${env.SANDBOX_API_BASE_URL.replace(/\/$/, "")}/authorization/auth/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grant_type: "client_credentials", tenant_id: tenantId, client_secret: clientSecret }),
      signal: AbortSignal.timeout(10_000),
    });

  let res = await request().catch(() => {
    throw new HttpError(502, `Could not reach the sandbox at ${env.SANDBOX_API_BASE_URL}. Is it running?`);
  });
  // Local mode: the mock may have restarted and lost this tenant — re-register once and retry.
  if (res.status === 401 && env.CREDENTIALS_PROVIDER === "local") {
    const { checksumSalt, record } = loadSecretsByIdUnsafe(credId);
    await adminCall("/__admin/tenants", {
      tenantId,
      clientSecret,
      checksumSalt,
      hierLabelIdReference: record.hierLabelIdReference,
      hierarchyCriteria: record.hierarchyCriteria,
    }).catch(() => undefined);
    res = await request();
  }
  const data = (await res.json().catch(() => ({}))) as { accessToken?: string; accessTokenExpiresAt?: string; responseMessage?: string };
  if (!res.ok || !data.accessToken) {
    throw new HttpError(502, `Sandbox token request failed: ${data.responseMessage ?? `HTTP ${res.status}`}`);
  }
  const expiresAt = Date.parse(data.accessTokenExpiresAt ?? "") || Date.now() + 10 * 60_000;
  tokenCache.set(credId, { token: data.accessToken, expiresAt });
  return data.accessToken;
}

function loadSecretsByIdUnsafe(credId: string) {
  const orgId = store.read((db) => db.credentials.find((c) => c.id === credId)?.orgId);
  if (!orgId) throw new HttpError(404, "Credential not found.");
  return loadSecrets(orgId, credId);
}

export interface SandboxCall {
  slug: string;
  credentialId: string;
  pathParams?: Record<string, string>;
  query?: Record<string, string>;
  headers?: Record<string, string>;
  body?: unknown;
  autoChecksum?: boolean;
}

const ALLOWED_EXTRA_HEADERS = /^(x-[a-z0-9-]+|accept-language)$/i;

export async function executeSandboxCall(orgId: string, userId: string, call: SandboxCall) {
  const api = getApi();
  const op = api.bySlug.get(call.slug);
  if (!op) throw new HttpError(404, "Unknown operation.");

  const { record, clientSecret, checksumSalt } = loadSecrets(orgId, call.credentialId);
  if (record.environment !== "sandbox") throw new HttpError(403, "The console only calls the sandbox.");

  const headers: Record<string, string> = { Accept: "application/json" };
  for (const [k, v] of Object.entries(call.headers ?? {})) {
    if (ALLOWED_EXTRA_HEADERS.test(k) && typeof v === "string" && v.length < 512) headers[k] = v;
  }
  // Tenant header: fill from the credential if the operation declares one and the caller left it blank.
  for (const p of op.parameters.filter((p) => p.in === "header" && /tenant/i.test(p.name))) {
    if (!headers[p.name]) headers[p.name] = record.hierLabelIdReference;
  }

  const isTokenCall = op.path.startsWith("/authorization/auth/oauth2/");
  if (op.requiresAuth && !isTokenCall) {
    headers.Authorization = `Bearer ${await getAccessToken(record.id, record.tenantId, clientSecret)}`;
  }

  let body = call.body;
  let checksumField: string | undefined;
  if (body !== undefined && op.method !== "get") {
    if (JSON.stringify(body).length > MAX_BODY_BYTES) throw new HttpError(413, "Request body is too large for the console.");
    if (call.autoChecksum !== false) {
      const signed = signBody(op.method, op.path, body, checksumSalt);
      body = signed.body;
      checksumField = signed.rule?.field;
    }
    headers["Content-Type"] = "application/json";
  }

  const url = buildUrl(env.SANDBOX_API_BASE_URL, op.path, call.pathParams, call.query);
  const started = Date.now();
  let status = 0;
  let text = "";
  let responseHeaders: Record<string, string> = {};
  try {
    const res = await fetch(url, {
      method: op.method.toUpperCase(),
      headers,
      body: body !== undefined && op.method !== "get" ? JSON.stringify(body) : undefined,
      redirect: "manual",
      signal: AbortSignal.timeout(30_000),
    });
    status = res.status;
    text = (await res.text()).slice(0, 256 * 1024);
    responseHeaders = Object.fromEntries([...res.headers].filter(([k]) => !/^set-cookie$/i.test(k)));
  } catch (err) {
    throw new HttpError(502, `Sandbox request failed: ${(err as Error).message}`);
  }
  const durationMs = Date.now() - started;

  await store.write((db) => {
    db.apiLogs.push({
      id: randomId("log"),
      orgId,
      userId,
      environment: "sandbox",
      method: op.method.toUpperCase(),
      path: op.path,
      status,
      durationMs,
      requestBody: body === undefined ? undefined : JSON.stringify(body).slice(0, 16_000),
      responseBody: text.slice(0, 16_000),
      createdAt: now(),
    });
    trim(db.apiLogs, 2000);
  });
  void markUsed(record.id);

  let json: unknown;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    json = undefined;
  }

  // Echo what was actually sent (with the token redacted) so developers can copy it.
  const sentHeaders = { ...headers, ...(headers.Authorization ? { Authorization: "Bearer <access_token>" } : {}) };
  return { request: { method: op.method.toUpperCase(), url, headers: sentHeaders, body, checksumField }, status, durationMs, headers: responseHeaders, body: json ?? text };
}

export function listApiLogs(orgId: string, limit = 100) {
  return store.read((db) => db.apiLogs.filter((l) => l.orgId === orgId).slice(-limit).reverse());
}
