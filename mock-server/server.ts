/**
 * Mobiquity One mock sandbox.
 *
 * A zero-dependency HTTP server that behaves like the Mobiquity One APIs closely
 * enough to build and test an integration end to end:
 *   - OAuth2 token / refresh / revoke with per-tenant credentials
 *   - initiate payment with field validation, checksum verification and duplicate-order checks
 *   - deterministic outcomes (success / failure / pending) driven by test values
 *   - OTP submission, payment enquiry by transaction or order ID, refunds
 *   - webhooks to primaryWebhookURL (falls back to fallbackWebhookURL) with a valid checksum
 *   - every other endpoint in the spec answers with its documented example
 *
 * Response bodies are built from the examples in openapi/mobiquity-one.json, so
 * the mock stays in step with the spec. Run: npm run mock  (PORT defaults to 4010)
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes, randomUUID } from "node:crypto";
import path from "node:path";
import { computeChecksum, CHECKSUM_RULES, ruleFor } from "../src/lib/checksum";
import { jsonMedia, listOperations, type OperationEntry } from "../src/lib/openapi/operations";
import { mediaExamples } from "../src/lib/openapi/sample";
import type { OpenAPISpec } from "../src/lib/openapi/types";

const PORT = Number(process.env.PORT ?? 4010);
const ADMIN_SECRET = process.env.MOCK_ADMIN_SECRET ?? "dev-mock-admin-secret";
const STATE_FILE = path.resolve(process.env.MOCK_STATE_FILE ?? ".data/mock-state.json");
const WEBHOOK_DELAY_MS = Number(process.env.MOCK_WEBHOOK_DELAY_MS ?? 1500);
const TOKEN_TTL_MS = 15 * 60_000;

const spec = JSON.parse(readFileSync(path.resolve(process.env.SPEC_FILE ?? "openapi/mobiquity-one.json"), "utf8")) as OpenAPISpec;
const operations = listOperations(spec);

/* --------------------------------- state --------------------------------- */

interface Tenant {
  tenantId: string;
  clientSecret: string;
  checksumSalt: string;
  hierLabelIdReference: string;
  hierarchyCriteria: string;
  orgName?: string;
  revoked?: boolean;
}
interface Txn {
  transactionId: string;
  orderId: string;
  referenceOrderId: string;
  tenantId: string;
  amount: number;
  refunded: number;
  method: string;
  outcome: "success" | "failure" | "pending" | "awaiting_otp";
  otpAttempts: number;
  otpReference?: string;
  primaryWebhookURL?: string;
  fallbackWebhookURL?: string;
  createdAt: string;
}
interface State {
  tenants: Record<string, Tenant>;
  txns: Record<string, Txn>;
}

/** Demo tenant uses the values from the spec's own examples, so copied examples work as-is. */
const DEMO_TENANT: Tenant = {
  tenantId: "1001",
  clientSecret: "merchant_secret",
  checksumSalt: "abcdefghhgfedcba",
  hierLabelIdReference: "722312061538411001",
  hierarchyCriteria: "B2",
  orgName: "Demo merchant",
};

function load(): State {
  if (existsSync(STATE_FILE)) {
    try {
      return JSON.parse(readFileSync(STATE_FILE, "utf8")) as State;
    } catch {}
  }
  return { tenants: {}, txns: {} };
}
const state = load();
state.tenants[DEMO_TENANT.tenantId] ??= DEMO_TENANT;
let saveTimer: NodeJS.Timeout | undefined;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  }, 100);
}

const tokens = new Map<string, { tenantId: string; expiresAt: number; kind: "access" | "refresh" }>();

/* -------------------------------- helpers -------------------------------- */

const ts = () => new Date().toISOString();
const digits = (n: number) => Array.from(randomBytes(n), (b) => String(b % 10)).join("");
const envelope = () => ({ status: "200", message: "SUCCESS", requestId: randomUUID(), referenceId: randomUUID(), transactionTimeStamp: ts() });

function send(res: ServerResponse, status: number, body: unknown) {
  const text = JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(text), "X-Mock-Sandbox": "true" });
  res.end(text);
}

async function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const c of req) {
    size += (c as Buffer).length;
    if (size > 1_000_000) throw new Error("Body too large");
    chunks.push(c as Buffer);
  }
  if (!chunks.length) return {};
  const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
}

function op(method: string, p: string) {
  return operations.find((o) => o.method === method && o.path === p);
}

/** First documented example for a response status, or one whose body carries `code`. */
function example(o: OperationEntry | undefined, status: string, code?: string): Record<string, unknown> {
  const r = o?.responses.find((x) => x.status === status);
  const ex = mediaExamples(spec, jsonMedia(r?.response));
  const pick = code ? ex.find((e) => new RegExp(`"(responseCode|code|statusCode)":"${code}"`).test(JSON.stringify(e.value))) : ex[0];
  return structuredClone((pick ?? ex[0])?.value ?? {}) as Record<string, unknown>;
}

const requestContext = new WeakMap<ServerResponse, { orderId?: string; transactionId?: string }>();

/** Spec-shaped error with a given response code (falls back to a generic envelope). */
function fail(res: ServerResponse, o: OperationEntry | undefined, code: string, message: string, http = 400) {
  const body = example(o, String(http), code);
  if (Object.keys(body).length && JSON.stringify(body).includes(`"${code}"`)) {
    // Replace the example's stale IDs with the ones from this request.
    const ctx = requestContext.get(res) ?? {};
    deepSet(body, { responseMessage: message, transactionTimeStamp: ts(), requestId: randomUUID(), referenceId: randomUUID(), orderId: ctx.orderId ?? null, transactionId: ctx.transactionId ?? null }, true);
    return send(res, http, body);
  }
  return send(res, http, { ...envelope(), status: String(http), message: "FAILURE", responseCode: code, responseMessage: message, errors: [{ code, message }] });
}

/** Overwrite matching keys anywhere in a nested object. */
function deepSet(obj: unknown, values: Record<string, unknown>, onlyExisting = false) {
  if (Array.isArray(obj)) return obj.forEach((x) => deepSet(x, values, onlyExisting));
  if (!obj || typeof obj !== "object") return;
  const o = obj as Record<string, unknown>;
  for (const k of Object.keys(o)) {
    if (k in values) o[k] = values[k];
    else deepSet(o[k], values, onlyExisting);
  }
}

function authTenant(req: IncomingMessage): Tenant | null {
  const h = req.headers.authorization ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(h);
  if (!m) return null;
  const t = tokens.get(m[1]);
  if (!t || t.kind !== "access" || t.expiresAt < Date.now()) return null;
  const tenant = state.tenants[t.tenantId];
  return tenant && !tenant.revoked ? tenant : null;
}

const str = (v: unknown) => (v === undefined || v === null ? "" : String(v));

/* ------------------------------- webhooks -------------------------------- */

function webhookPayload(txn: Txn, tenant: Tenant) {
  const codes = {
    success: { responseCode: "0000", responseMessage: "Payment is Successful", gateWayResponseCode: "captured", gateWayResponseMessage: "SUCCESS" },
    failure: { responseCode: "1702", responseMessage: "Transaction Failed at bank end.", gateWayResponseCode: "failed", gateWayResponseMessage: "FAILURE" },
    pending: { responseCode: "7000", responseMessage: "Payment is still pending.", gateWayResponseCode: "pending", gateWayResponseMessage: "PENDING" },
    awaiting_otp: { responseCode: "7000", responseMessage: "Payment is still pending.", gateWayResponseCode: "pending", gateWayResponseMessage: "PENDING" },
  }[txn.outcome];
  const entry: Record<string, unknown> = {
    ...codes,
    transactionId: txn.transactionId,
    orderId: txn.orderId,
    referenceOrderId: txn.referenceOrderId,
    cardScheme: txn.method === "CARD" ? "Visa" : null,
    processorName: "RAZORPAY",
    processorPaymentId: `pay_${digits(14)}`,
    processorOrderId: `order_${digits(14)}`,
    merchantFields: null,
  };
  entry.checksum = computeChecksum(CHECKSUM_RULES.find((r) => r.id === "webhook")!, entry, tenant.checksumSalt);
  return { ecommPaymentResponseList: [entry], ...envelope() };
}

async function deliverWebhook(txn: Txn) {
  const tenant = state.tenants[txn.tenantId];
  if (!tenant) return;
  const body = JSON.stringify(webhookPayload(txn, tenant));
  for (const url of [txn.primaryWebhookURL, txn.fallbackWebhookURL]) {
    if (!url || !/^https?:\/\//.test(url) || /payplus-comviva\.com/.test(url)) continue; // skip spec placeholder URLs
    try {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body, signal: AbortSignal.timeout(8000) });
      log(`webhook ${txn.transactionId} -> ${url} : ${r.status}`);
      if (r.ok) return;
    } catch (e) {
      log(`webhook ${txn.transactionId} -> ${url} : ${(e as Error).message}`);
    }
  }
}

/* ------------------------------- handlers -------------------------------- */

type Handler = (req: IncomingMessage, res: ServerResponse, body: Record<string, unknown>, url: URL) => void | Promise<void>;

const REQUIRED_PAYMENT_FIELDS: [string, string, string][] = [
  ["paymentChannelId", "4415", "paymentChannelId cannot be null or empty"],
  ["amount", "4404", "amount cannot be null or empty"],
  ["orderId", "4408", "orderId cannot be null or empty"],
  ["consumerMsisdn", "4416", "consumerMsisdn cannot be null or empty"],
  ["electronicGoodsIndicator", "4409", "electronicGoodsIndicator cannot be null or empty"],
  ["customerCode", "4410", "customerCode cannot be null or empty"],
  ["customerFirstName", "4411", "customerFirstName cannot be null or empty"],
  ["checkSumPayment", "4414", "checksumPayment cannot be null or empty"],
];

/** Outcome rules documented in content/docs/testing.md. */
function decideOutcome(body: Record<string, unknown>): Txn["outcome"] {
  const amount = str(body.amount);
  const upi = str(body.upiId).toLowerCase();
  const card = str(body.cardNumber).replace(/\s/g, "");
  if (amount === "101" || upi === "failure@upi" || card === "4000000000000002") return "failure";
  if (amount === "102" || upi === "pending@upi") return "pending";
  if (str(body.isNativeOtpRequired).toLowerCase() === "true") return "awaiting_otp";
  return "success";
}

const initiate: Handler = (req, res, body, url) => {
  const o = op("post", url.pathname);
  const tenant = authTenant(req);
  if (!tenant) return fail(res, o, "4471", "Unauthorized Access", 401);

  for (const [field, code, msg] of REQUIRED_PAYMENT_FIELDS) {
    if (url.pathname.endsWith("unifiedInitiatePayment") && ["electronicGoodsIndicator", "customerCode", "customerFirstName"].includes(field)) continue;
    if (!str(body[field]).trim()) return fail(res, o, code, msg);
  }
  if (str(body.hierLabelIdReference) !== tenant.hierLabelIdReference) return fail(res, o, "7710", "Label Id reference is invalid");
  if (str(body.hierarchyCriteria) && str(body.hierarchyCriteria) !== tenant.hierarchyCriteria) return fail(res, o, "4403", "hierarchyCriteria cannot be null or empty or Invalid");
  if (!/^\d+(\.\d{1,2})?$/.test(str(body.amount))) return fail(res, o, "9006", "Invalid Amount");
  if (!["2", "3"].includes(str(body.paymentChannelId))) return fail(res, o, "7711", "Payment Channel ID is Invalid");

  const rule = ruleFor("post", url.pathname, body)!;
  if (computeChecksum(rule, body, tenant.checksumSalt) !== str(body.checkSumPayment).toLowerCase()) {
    return fail(res, o, "7703", "Checksum verification failed.");
  }
  const orderId = str(body.orderId);
  const manualRetry = str(body.skipOrderIdCheck).toLowerCase() === "true";
  if (!manualRetry && Object.values(state.txns).some((t) => t.tenantId === tenant.tenantId && t.orderId === orderId)) {
    return fail(res, o, "1055", "Order Id not unique and is mandatory. Please provide different orderId");
  }

  const txn: Txn = {
    transactionId: `TC${digits(17)}`,
    orderId,
    referenceOrderId: `65${digits(15)}`,
    tenantId: tenant.tenantId,
    amount: Number(body.amount),
    refunded: 0,
    method: str(body.method || "CARD").toUpperCase(),
    outcome: decideOutcome(body),
    otpAttempts: 0,
    otpReference: undefined,
    primaryWebhookURL: str(body.primaryWebhookURL) || undefined,
    fallbackWebhookURL: str(body.fallbackWebhookURL) || undefined,
    createdAt: ts(),
  };
  if (txn.outcome === "awaiting_otp") txn.otpReference = randomBytes(32).toString("hex");
  state.txns[txn.transactionId] = txn;
  save();

  const out = example(o, "200");
  deepSet(out, {
    ...envelope(),
    transactionId: txn.transactionId,
    orderId: txn.orderId,
    referenceOrderId: txn.referenceOrderId,
    responseCode: "0000",
    responseMessage: txn.outcome === "awaiting_otp" ? "OTP sent to the registered mobile number" : "Payment is Initiated",
  });
  // The mock does not render a processor page; point the redirect at a harmless placeholder.
  if (txn.otpReference) deepSet(out, { referenceId: txn.otpReference });
  deepSet(out, { callBackUrl: `<html><body><p>Mock sandbox: payment ${txn.transactionId} would redirect to the processor here.</p></body></html>` });
  send(res, 200, out);

  if (txn.outcome !== "awaiting_otp") setTimeout(() => void deliverWebhook(txn), WEBHOOK_DELAY_MS);
};

const submitOtp: Handler = (req, res, body) => {
  const o = op("post", "/ecom/submitOtp");
  const tenant = authTenant(req);
  if (!tenant) return fail(res, o, "4471", "Unauthorized Access", 401);
  const ref = str(body.referenceId);
  const txn = Object.values(state.txns).find((t) => t.tenantId === tenant.tenantId && !!ref && t.otpReference === ref);
  if (!txn) return fail(res, o, "3000", "Invalid Transaction ID");
  if (txn.outcome !== "awaiting_otp") return fail(res, o, "4465", "Invalid request body is passed");
  if (str(body.otp) !== "123456") {
    txn.otpAttempts++;
    if (txn.otpAttempts >= 3) {
      txn.outcome = "failure";
      save();
      void deliverWebhook(txn);
      return fail(res, o, "1702", "Transaction Failed at bank end.");
    }
    save();
    return fail(res, o, "2811", `OTP invalid. ${3 - txn.otpAttempts} retry attempts left out of 3`);
  }
  txn.outcome = "success";
  save();
  const out = example(o, "200");
  deepSet(out, { ...envelope(), orderId: txn.orderId, responseCode: "0000", responseMessage: "CREDIT CARD Payment is Successful" });
  send(res, 200, out);
  setTimeout(() => void deliverWebhook(txn), WEBHOOK_DELAY_MS);
};

const resendOtp: Handler = (req, res, body) => {
  const o = op("post", "/ecom/resendOtp");
  if (!authTenant(req)) return fail(res, o, "4471", "Unauthorized Access", 401);
  const out = example(o, "200");
  deepSet(out, { ...envelope(), orderId: str(body.orderId) || undefined });
  send(res, 200, out);
};

function statusEntry(txn: Txn) {
  const tenant = state.tenants[txn.tenantId];
  return webhookPayload(txn, tenant).ecommPaymentResponseList[0];
}

const enquiry: Handler = (req, res, body) => {
  const o = op("post", "/ecom/payments/enquiry");
  const tenant = authTenant(req);
  if (!tenant) return fail(res, o, "4471", "Unauthorized Access", 401);
  const txn = state.txns[str(body.transactionId)];
  if (!txn || txn.tenantId !== tenant.tenantId) return fail(res, o, "3000", "Invalid Transaction ID");
  if (computeChecksum(ruleFor("post", "/ecom/payments/enquiry")!, body, tenant.checksumSalt) !== str(body.checksum).toLowerCase()) {
    return fail(res, o, "7703", "Checksum verification failed.");
  }
  if (txn.outcome === "pending" || txn.outcome === "awaiting_otp") return fail(res, o, "7000", "Payment is still pending.");
  send(res, 200, { ecommPaymentResponseList: [statusEntry(txn)], ...envelope() });
};

const orderEnquiry: Handler = (req, res, body) => {
  const o = op("post", "/ecom/payments/orderEnquiry");
  const tenant = authTenant(req);
  if (!tenant) return fail(res, o, "4471", "Unauthorized Access", 401);
  if (!str(body.orderId)) return fail(res, o, "4452", "orderId cannot be null or empty");
  if (computeChecksum(ruleFor("post", "/ecom/payments/orderEnquiry")!, body, tenant.checksumSalt) !== str(body.checksum).toLowerCase()) {
    return fail(res, o, "7703", "Checksum verification failed.");
  }
  const txn = Object.values(state.txns).find((t) => t.tenantId === tenant.tenantId && t.orderId === str(body.orderId));
  if (!txn) return fail(res, o, "3000", "Invalid Transaction ID");
  const label = { success: "SUCCESS", failure: "FAILURE", pending: "PENDING", awaiting_otp: "PENDING" }[txn.outcome];
  const r = o?.responses.find((x) => x.status === "200");
  const ex = mediaExamples(spec, jsonMedia(r?.response));
  const tpl = structuredClone((ex.find((e) => e.label.toUpperCase().includes(txn.refunded >= txn.amount && txn.outcome === "success" ? "REFUNDED" : label)) ?? ex[0])?.value ?? {}) as Record<string, unknown>;
  deepSet(tpl, { transactionId: txn.transactionId, orderId: txn.orderId, processorPaymentId: `pay_${digits(14)}` });
  send(res, 200, tpl);
};

const refund: Handler = (req, res, body) => {
  const o = op("post", "/ecom/refund");
  const tenant = authTenant(req);
  if (!tenant) return fail(res, o, "4471", "Unauthorized Access", 401);
  if (str(body.hierLabelId) && str(body.hierLabelId) !== tenant.hierLabelIdReference) return fail(res, o, "7710", "Label Id reference is invalid");
  if (str(body.transactionType).toLowerCase() !== "refund") return fail(res, o, "4451", "transactionType is Invalid");
  if (!/^\d+(\.\d{1,2})?$/.test(str(body.transactionAmount))) return fail(res, o, "9002", "Amount is Invalid");
  if (computeChecksum(ruleFor("post", "/ecom/refund")!, body, tenant.checksumSalt) !== str(body.checksum).toLowerCase()) {
    return fail(res, o, "7703", "Checksum verification failed.");
  }
  const txn = state.txns[str(body.refTransactionId)];
  if (!txn || txn.tenantId !== tenant.tenantId) return fail(res, o, "3000", "Invalid Transaction ID");
  if (txn.outcome !== "success") return fail(res, o, "4475", "The transaction is not charged and delivered.");
  const amt = Number(body.transactionAmount);
  if (amt + txn.refunded > txn.amount) return fail(res, o, "3002", "The Refund Txn Amount Cannot be greater than original Txn Amount");
  txn.refunded += amt;
  save();
  const out = example(o, "200");
  deepSet(out, { ...envelope(), transactionId: `TC${digits(17)}`, orderId: txn.orderId, responseCode: "0000", responseMessage: "Refund Successful" });
  delete out.refundVendorDetails;
  send(res, 200, out);
};

/* ---------------------------- OAuth2 endpoints ---------------------------- */

function issueTokens(tenantId: string) {
  const access = `mock_at_${randomBytes(24).toString("base64url")}`;
  const refreshTok = `mock_rt_${randomBytes(24).toString("base64url")}`;
  const now = Date.now();
  tokens.set(access, { tenantId, expiresAt: now + TOKEN_TTL_MS, kind: "access" });
  tokens.set(refreshTok, { tenantId, expiresAt: now + 15 * 864e5, kind: "refresh" });
  return {
    accessToken: access,
    refreshToken: refreshTok,
    accessTokenExpiresAt: new Date(now + TOKEN_TTL_MS).toISOString(),
    refreshTokenExpiresAt: new Date(now + 15 * 864e5).toISOString(),
    oauthEnabled: true,
    responseCode: "200",
    responseMessage: "Token generated",
  };
}

const token: Handler = (_req, res, body) => {
  const grant = str(body.grant_type);
  if (!["client_credentials", "user_credentials", "webcheckout_credentials"].includes(grant)) {
    return send(res, 400, { responseCode: "400", responseMessage: "Unsupported grant_type" });
  }
  const tenant = state.tenants[str(body.tenant_id)];
  if (!tenant || tenant.revoked) return send(res, 401, { responseCode: "9111", responseMessage: "Invalid or Empty TenantId" });
  if (tenant.clientSecret !== str(body.client_secret)) return send(res, 401, { responseCode: "401", responseMessage: "Invalid client_secret" });
  send(res, 200, issueTokens(tenant.tenantId));
};

const refreshToken: Handler = (_req, res, body) => {
  if (str(body.grant_type) !== "refresh_token") return send(res, 400, { responseCode: "400", responseMessage: "grant_type must be refresh_token" });
  const t = tokens.get(str(body.refreshToken));
  if (!t || t.kind !== "refresh" || t.expiresAt < Date.now()) return send(res, 401, { responseCode: "401", responseMessage: "Invalid or expired refresh token" });
  tokens.delete(str(body.refreshToken));
  const out = issueTokens(t.tenantId);
  send(res, 200, { ...out, responseMessage: "Token refreshed" });
};

const revokeToken: Handler = (_req, res, body) => {
  if (str(body.grant_type) !== "revoke_token") return send(res, 400, { responseCode: "400", responseMessage: "grant_type must be revoke_token" });
  const t = tokens.get(str(body.refreshToken));
  if (t) for (const [k, v] of tokens) if (v.tenantId === t.tenantId) tokens.delete(k);
  send(res, 200, { accessToken: null, refreshToken: null, accessTokenExpiresAt: null, refreshTokenExpiresAt: null, oauthEnabled: true, responseCode: "200", responseMessage: "Token revoked" });
};

/* ------------------------- portal provisioning API ------------------------ */

function requireAdmin(req: IncomingMessage, res: ServerResponse) {
  if (req.headers["x-mock-admin-secret"] !== ADMIN_SECRET) {
    send(res, 403, { error: "Invalid admin secret" });
    return false;
  }
  return true;
}

const adminCreate: Handler = (req, res, body) => {
  if (!requireAdmin(req, res)) return;
  const t = body as unknown as Tenant;
  if (!t.tenantId || !t.clientSecret || !t.checksumSalt || !t.hierLabelIdReference) return send(res, 422, { error: "Missing fields" });
  state.tenants[t.tenantId] = { tenantId: t.tenantId, clientSecret: t.clientSecret, checksumSalt: t.checksumSalt, hierLabelIdReference: t.hierLabelIdReference, hierarchyCriteria: t.hierarchyCriteria ?? "B2", orgName: t.orgName };
  save();
  send(res, 201, { ok: true });
};
const adminRotate: Handler = (req, res, body) => {
  if (!requireAdmin(req, res)) return;
  const t = state.tenants[str(body.tenantId)];
  if (!t) return send(res, 404, { error: "Unknown tenant" });
  t.clientSecret = str(body.clientSecret);
  for (const [k, v] of tokens) if (v.tenantId === t.tenantId) tokens.delete(k);
  save();
  send(res, 200, { ok: true });
};
const adminRevoke: Handler = (req, res, body) => {
  if (!requireAdmin(req, res)) return;
  const t = state.tenants[str(body.tenantId)];
  if (t) t.revoked = true;
  for (const [k, v] of tokens) if (v.tenantId === str(body.tenantId)) tokens.delete(k);
  save();
  send(res, 200, { ok: true });
};

/* --------------------------------- router -------------------------------- */

const routes: Record<string, Handler> = {
  "POST /authorization/auth/oauth2/token": token,
  "POST /authorization/auth/oauth2/refreshToken": refreshToken,
  "POST /authorization/auth/oauth2/revokeToken": revokeToken,
  "POST /ecom/initiatePayment": initiate,
  "POST /ecom/unifiedInitiatePayment": initiate,
  "POST /ecom/submitOtp": submitOtp,
  "POST /ecom/resendOtp": resendOtp,
  "POST /ecom/payments/enquiry": enquiry,
  "POST /ecom/payments/orderEnquiry": orderEnquiry,
  "POST /ecom/refund": refund,
  "POST /__admin/tenants": adminCreate,
  "POST /__admin/tenants/rotate": adminRotate,
  "POST /__admin/tenants/revoke": adminRevoke,
};

function matchSpec(method: string, pathname: string) {
  return operations.find((o) => {
    if (o.method !== method) return false;
    const re = new RegExp(`^${o.path.replace(/\{[^}]+\}/g, "[^/]+")}$`);
    return re.test(pathname);
  });
}

function log(msg: string) {
  if (process.env.MOCK_QUIET !== "1") console.log(`[mock] ${new Date().toISOString().slice(11, 19)} ${msg}`);
}

export const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const method = (req.method ?? "GET").toLowerCase();
  try {
    if (method === "get" && url.pathname === "/__health") return send(res, 200, { status: "ok", tenants: Object.keys(state.tenants).length });
    let body: Record<string, unknown> = {};
    if (method !== "get" && method !== "head") {
      try {
        body = await readBody(req);
      } catch {
        return send(res, 400, { responseCode: "4465", responseMessage: "Invalid request body is passed" });
      }
    }
    requestContext.set(res, {
      orderId: body.orderId ? str(body.orderId) : undefined,
      transactionId: body.transactionId || body.refTransactionId ? str(body.transactionId ?? body.refTransactionId) : undefined,
    });
    const handler = routes[`${method.toUpperCase()} ${url.pathname}`];
    if (handler) {
      await handler(req, res, body, url);
    } else {
      const o = matchSpec(method, url.pathname);
      if (!o) return send(res, 404, { responseCode: "404", responseMessage: `No such endpoint: ${method.toUpperCase()} ${url.pathname}` });
      if (o.requiresAuth && !authTenant(req)) return fail(res, o, "4471", "Unauthorized Access", 401);
      const out = example(o, "200");
      deepSet(out, envelope(), true);
      send(res, 200, out);
    }
    log(`${method.toUpperCase()} ${url.pathname} -> ${res.statusCode}`);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) send(res, 500, { responseCode: "9999", responseMessage: "Internal server error" });
  }
});

if (process.env.MOCK_NO_LISTEN !== "1") {
  server.listen(PORT, () => {
    log(`Mobiquity One mock sandbox on http://localhost:${PORT}`);
    log(`demo tenant: tenant_id=${DEMO_TENANT.tenantId} client_secret=${DEMO_TENANT.clientSecret} salt=${DEMO_TENANT.checksumSalt}`);
  });
}
