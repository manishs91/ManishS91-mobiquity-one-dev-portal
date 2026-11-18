import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { computeChecksum, CHECKSUM_RULES } from "../checksum";
import { randomDigits, randomId } from "../crypto";
import { env } from "../env";
import { HttpError } from "../http";
import { audit, now, store, trim, type Environment } from "../store";
import { loadSecrets } from "./credentials";

/* ------------------------------ URL safety ------------------------------- */

function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
  }
  const v6 = ip.toLowerCase();
  return v6 === "::1" || v6 === "::" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80") || v6.startsWith("::ffff:127.") || v6.startsWith("::ffff:10.") || v6.startsWith("::ffff:192.168.");
}

/**
 * Webhook URLs must be HTTPS and resolve to public addresses (prevents the portal
 * being used to probe internal networks). In development, http://localhost is allowed
 * so you can point at a local receiver.
 */
export async function assertSafeWebhookUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new HttpError(422, "Enter a valid URL.");
  }
  const devLocal = !env.isProd && ["localhost", "127.0.0.1"].includes(url.hostname);
  if (url.protocol !== "https:" && !devLocal) throw new HttpError(422, "Webhook URLs must use HTTPS.");
  if (url.username || url.password) throw new HttpError(422, "Don't put credentials in the webhook URL.");
  if (devLocal) return url;
  const addrs = isIP(url.hostname) ? [{ address: url.hostname }] : await lookup(url.hostname, { all: true }).catch(() => []);
  if (!addrs.length) throw new HttpError(422, `Could not resolve ${url.hostname}.`);
  if (addrs.some((a) => isPrivateAddress(a.address))) throw new HttpError(422, "Webhook URLs must point to a public address.");
  return url;
}

/* -------------------------------- CRUD ----------------------------------- */

export function listWebhooks(orgId: string) {
  return store.read((db) => ({
    endpoints: db.webhooks.filter((w) => w.orgId === orgId),
    deliveries: db.deliveries.filter((d) => d.orgId === orgId).slice(-50).reverse(),
  }));
}

export async function addWebhook(orgId: string, userId: string, input: { url: string; kind: "primary" | "fallback"; environment: Environment; description?: string }) {
  const url = await assertSafeWebhookUrl(input.url);
  return store.write((db) => {
    const existing = db.webhooks.filter((w) => w.orgId === orgId && w.environment === input.environment && w.kind === input.kind);
    if (existing.length) throw new HttpError(409, `You already have a ${input.kind} ${input.environment} URL. Edit or delete it first.`);
    const rec = {
      id: randomId("wh"),
      orgId,
      environment: input.environment,
      url: url.toString(),
      kind: input.kind,
      description: input.description?.trim() || undefined,
      enabled: true,
      createdAt: now(),
    };
    db.webhooks.push(rec);
    audit(db, { orgId, actorId: userId, action: "webhook.created", target: rec.id });
    return rec;
  });
}

export async function deleteWebhook(orgId: string, userId: string, id: string) {
  await store.write((db) => {
    const before = db.webhooks.length;
    db.webhooks = db.webhooks.filter((w) => !(w.orgId === orgId && w.id === id));
    if (db.webhooks.length === before) throw new HttpError(404, "Webhook not found.");
    audit(db, { orgId, actorId: userId, action: "webhook.deleted", target: id });
  });
}

/* ------------------------------ test events ------------------------------ */

export const TEST_EVENTS = {
  // Codes and messages as documented in the spec's response examples.
  "payment.success": { responseCode: "0000", responseMessage: "CREDIT CARD Payment is Successful", gateWayResponseCode: "captured", gateWayResponseMessage: "Payment captured" },
  "payment.failed": { responseCode: "1702", responseMessage: "Transaction Failed at bank end.", gateWayResponseCode: "failed", gateWayResponseMessage: "Payment declined by issuer" },
  "payment.pending": { responseCode: "7000", responseMessage: "Payment is still pending.", gateWayResponseCode: "pending", gateWayResponseMessage: "Awaiting confirmation" },
} as const;
export type TestEvent = keyof typeof TEST_EVENTS;

/** Build a webhook payload shaped like WebhookTransactionStatus, with a valid checksum. */
export function buildTestPayload(event: TestEvent, salt: string, overrides: { orderId?: string } = {}) {
  const entry: Record<string, unknown> = {
    ...TEST_EVENTS[event],
    transactionId: `TC${randomDigits(17)}`,
    orderId: overrides.orderId ?? `test_${randomDigits(6)}`,
    referenceOrderId: `RO${randomDigits(10)}`,
    cardScheme: "VISA",
    processorName: "Razorpay",
    processorPaymentId: `pay_${randomDigits(14)}`,
    processorOrderId: `order_${randomDigits(14)}`,
    merchantFields: null,
  };
  const rule = CHECKSUM_RULES.find((r) => r.id === "webhook")!;
  entry.checksum = computeChecksum(rule, entry, salt);
  return {
    ecommPaymentResponseList: [entry],
    status: "200",
    message: "SUCCESS",
    requestId: crypto.randomUUID(),
    referenceId: crypto.randomUUID(),
    transactionTimeStamp: now(),
  };
}

export async function sendTestEvent(orgId: string, userId: string, input: { endpointId: string; event: TestEvent; credentialId: string }) {
  const endpoint = store.read((db) => db.webhooks.find((w) => w.id === input.endpointId && w.orgId === orgId));
  if (!endpoint) throw new HttpError(404, "Webhook not found.");
  const { checksumSalt } = loadSecrets(orgId, input.credentialId);
  await assertSafeWebhookUrl(endpoint.url); // re-check: DNS may have changed

  const payload = buildTestPayload(input.event, checksumSalt);
  const body = JSON.stringify(payload);
  const started = Date.now();
  let responseStatus: number | undefined;
  let responseBody: string | undefined;
  let error: string | undefined;
  try {
    const res = await fetch(endpoint.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "MobiquityOne-DevPortal-Webhook-Test/1.0", "X-M1-Test-Event": input.event },
      body,
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
    });
    responseStatus = res.status;
    responseBody = (await res.text()).slice(0, 4000);
  } catch (err) {
    error = (err as Error).name === "TimeoutError" ? "Timed out after 10s" : (err as Error).message;
  }
  const delivery = {
    id: randomId("dlv"),
    orgId,
    endpointId: endpoint.id,
    url: endpoint.url,
    event: input.event,
    requestBody: body,
    responseStatus,
    responseBody,
    durationMs: Date.now() - started,
    error,
    createdAt: now(),
  };
  await store.write((db) => {
    db.deliveries.push(delivery);
    trim(db.deliveries, 1000);
    audit(db, { orgId, actorId: userId, action: "webhook.test_sent", target: endpoint.id });
  });
  return delivery;
}
