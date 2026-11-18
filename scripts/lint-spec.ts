/**
 * Checks openapi/mobiquity-one.json for problems that affect the developer portal
 * or the developers reading it. Run: npm run spec:lint  (add --strict to fail CI on errors)
 *
 * Severity:
 *   error   — invalid OpenAPI, or something that will mislead an integrator
 *   warning — inconsistent or incomplete, worth fixing upstream
 */
import { readFileSync } from "node:fs";
import { jsonMedia, listOperations } from "../src/lib/openapi/operations";
import { mediaExamples } from "../src/lib/openapi/sample";
import { isRef, type OpenAPISpec, type Schema } from "../src/lib/openapi/types";

type Severity = "error" | "warning";
interface Finding {
  severity: Severity;
  rule: string;
  where: string;
  message: string;
}

const file = process.argv[2] ?? "openapi/mobiquity-one.json";
const strict = process.argv.includes("--strict");
const asJson = process.argv.includes("--json");
const spec = JSON.parse(readFileSync(file, "utf8")) as OpenAPISpec;
const findings: Finding[] = [];
const add = (severity: Severity, rule: string, where: string, message: string) => findings.push({ severity, rule, where, message });

/* ------------------------------ document level ----------------------------- */

if (!spec.info?.version) add("error", "info-version", "info", "info.version is required by OpenAPI 3.0.");
for (const [name, s] of Object.entries(spec.components?.securitySchemes ?? {})) {
  if (!s.type) add("error", "security-scheme-type", `components.securitySchemes.${name}`, 'Missing "type" (should be "http" with scheme "bearer").');
}
for (const s of spec.servers ?? []) {
  if (!/mobiquity/i.test(s.url)) add("warning", "server-host", "servers", `Server ${s.url} is not a Mobiquity One host. Publish the public sandbox and production URLs.`);
}
if (!spec.tags?.length) add("warning", "tags", "tags", "No top-level tags with descriptions; tag pages render without an introduction.");

/* ------------------------------ operation level ---------------------------- */

const ops = listOperations(spec);
const seenIds = new Map<string, string>();
for (const op of ops) {
  const where = `${op.method.toUpperCase()} ${op.path}`;
  const id = op.operation.operationId;
  if (!id) add("warning", "operation-id", where, "No operationId; SDK generators will invent names.");
  else {
    if (/\s/.test(id)) add("warning", "operation-id-format", where, `operationId "${id}" contains spaces.`);
    if (seenIds.has(id)) add("error", "operation-id-unique", where, `operationId "${id}" also used by ${seenIds.get(id)}.`);
    seenIds.set(id, where);
  }
  if (op.operation.summary && /\s{2,}/.test(op.operation.summary)) add("warning", "summary-whitespace", where, `Summary has repeated spaces: "${op.operation.summary}".`);

  for (const p of op.operation.parameters ?? []) {
    if (!isRef(p) && !p.name) add("error", "parameter-name", where, "A parameter has no name/in (renders as an empty field).");
  }
  const tenantHeaders = op.parameters.filter((p) => p.in === "header" && /tenant/i.test(p.name)).map((p) => p.name);
  for (const h of tenantHeaders) if (h !== "X-TenantId") add("warning", "tenant-header-name", where, `Tenant header named "${h}".`);

  if (!op.requiresAuth && !op.path.startsWith("/authorization/") && op.method !== "get") {
    add("warning", "no-security", where, "No security requirement declared. Confirm whether this endpoint is really unauthenticated.");
  } else if (!op.requiresAuth && !op.path.startsWith("/authorization/") && op.path.startsWith("/mandates")) {
    add("warning", "no-security", where, "No security requirement declared. Confirm whether this endpoint is really unauthenticated.");
  }

  // Summary vs path sanity: a "Fetch … Offers" operation living on the token revoke path, etc.
  if (/revokeToken/i.test(op.path) && !/revoke/i.test(op.summary)) {
    add("error", "path-summary-mismatch", where, `Summary "${op.summary}" doesn't match path ${op.path}; this looks like a copy-paste error.`);
  }

  if (!op.responses.some((r) => r.status.startsWith("2"))) add("warning", "no-success-response", where, "No 2xx response documented.");
  for (const r of op.responses) {
    if (r.status === "404" && !r.response.content) add("warning", "empty-response", `${where} ${r.status}`, "Response has no body schema.");
  }

  // Request examples must use the fields the endpoint needs.
  const media = jsonMedia(op.requestBody);
  if (media) {
    const ex = mediaExamples(spec, media);
    if (op.path.endsWith("/orderEnquiry")) {
      const v = ex[0]?.value as Record<string, unknown> | undefined;
      if (v && !v.orderId) add("error", "example-mismatch", where, "Example request has no orderId (it sends transactionId), but this endpoint looks up by orderId.");
    }
  }
}

/* -------------------------------- schema level ----------------------------- */

const schemas = spec.components?.schemas ?? {};
let mandatoryNotRequired = 0;
let exampleTypeMismatch = 0;
for (const [name, s] of Object.entries(schemas)) {
  const req = new Set((s as Schema).required ?? []);
  for (const [prop, p] of Object.entries((s as Schema).properties ?? {})) {
    if (isRef(p)) continue;
    if (/\(mandatory\)/i.test(p.description ?? "") && !req.has(prop)) mandatoryNotRequired++;
    if (p.type === "string" && typeof p.example === "number") exampleTypeMismatch++;
    if ((p.type === "integer" || p.type === "number") && typeof p.example === "string") exampleTypeMismatch++;
    if (/salt\s*(value is|->)\s*\w+/i.test(p.description ?? "")) {
      add("error", "secret-in-docs", `components.schemas.${name}.${prop}`, "Description publishes a checksum salt value. Salts are merchant secrets; remove it from the public spec.");
    }
  }
}
if (mandatoryNotRequired) {
  add("warning", "required-in-prose", "components.schemas", `${mandatoryNotRequired} properties say "(Mandatory)" in their description but aren't in the schema's required list. Validators and SDKs can't see that.`);
}
if (exampleTypeMismatch) add("warning", "example-type", "components.schemas", `${exampleTypeMismatch} property examples don't match the declared type (e.g. status: string with example 200).`);

const text = JSON.stringify(spec);
const used = new Set([...text.matchAll(/"#\/components\/schemas\/([^"]+)"/g)].map((m) => m[1]));
const unused = Object.keys(schemas).filter((k) => !used.has(k));
if (unused.length) add("warning", "unused-schemas", "components.schemas", `${unused.length} schemas are never referenced: ${unused.slice(0, 6).join(", ")}${unused.length > 6 ? "…" : ""}`);

const webhookOp = ops.find((o) => o.path.endsWith("/txnstatus/webhook"));
if (webhookOp && !webhookOp.parameters.some((p) => p.in === "header" && /signature/i.test(p.name))) {
  add("warning", "webhook-signature", `${webhookOp.method.toUpperCase()} ${webhookOp.path}`, "Webhooks are authenticated only by a body checksum (sha256 of three fields + salt). Consider an HMAC-SHA256 signature header over the raw body with a timestamp.");
}

/* --------------------------------- output ---------------------------------- */

/** Collapse rules that fire on many operations into one line, so the report stays readable. */
function grouped(list: Finding[]): Finding[] {
  const byRule = new Map<string, Finding[]>();
  for (const f of list) byRule.set(`${f.severity}:${f.rule}`, [...(byRule.get(`${f.severity}:${f.rule}`) ?? []), f]);
  const out: Finding[] = [];
  for (const items of byRule.values()) {
    if (items.length <= 3) out.push(...items);
    else
      out.push({
        ...items[0],
        where: `${items.length} operations`,
        message: `${items[0].message} Affects: ${items.map((i) => i.where).join("; ")}`,
      });
  }
  return out;
}

const order: Record<Severity, number> = { error: 0, warning: 1 };
findings.splice(0, findings.length, ...grouped(findings));
findings.sort((a, b) => order[a.severity] - order[b.severity] || a.rule.localeCompare(b.rule));

if (asJson) {
  console.log(JSON.stringify(findings, null, 2));
} else {
  const errors = findings.filter((f) => f.severity === "error").length;
  console.log(`Spec lint: ${file}\n${ops.length} operations, ${Object.keys(schemas).length} schemas\n`);
  for (const f of findings) console.log(`${f.severity === "error" ? "ERROR  " : "warning"} [${f.rule}] ${f.where}\n        ${f.message}`);
  console.log(`\n${errors} error(s), ${findings.length - errors} warning(s)`);
  if (strict && errors) process.exit(1);
}
