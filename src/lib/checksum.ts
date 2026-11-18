import { createHash } from "node:crypto";

/**
 * Mobiquity One request/response checksums.
 *
 * Every rule below is taken from the field descriptions in openapi/mobiquity-one.json
 * and verified against the spec's own examples (see tests/checksum.test.ts):
 *   checksum = lowercase hex sha256( field1 + field2 + ... + salt )
 * Fields are concatenated as strings with no separator; missing fields are "".
 *
 * The salt is merchant-specific and issued alongside the sandbox/production credentials.
 */
export interface ChecksumRule {
  id: string;
  label: string;
  /** "METHOD /path" this rule applies to (request rules), or "webhook" for inbound verification. */
  appliesTo: string[];
  /** Body field that carries the checksum. */
  field: string;
  /** Body fields concatenated, in order, before the salt. */
  inputs: string[];
  /** Optional predicate when one endpoint has several body variants with different formulas. */
  when?: (body: Record<string, unknown>) => boolean;
}

export const CHECKSUM_RULES: ChecksumRule[] = [
  {
    id: "pay-later",
    label: "Unified initiate payment (Pay Later variant)",
    appliesTo: ["POST /ecom/unifiedInitiatePayment"],
    field: "checkSumPayment",
    inputs: ["amount", "orderId", "paymentChannelId"],
    // PayLaterRequest has no taxAmount / electronicGoodsIndicator.
    when: (b) => b.taxAmount === undefined && b.electronicGoodsIndicator === undefined,
  },
  {
    id: "initiate-payment",
    label: "Initiate payment",
    appliesTo: ["POST /ecom/initiatePayment", "POST /ecom/unifiedInitiatePayment"],
    field: "checkSumPayment",
    inputs: ["amount", "orderId", "taxAmount", "electronicGoodsIndicator", "paymentChannelId"],
  },
  {
    id: "refund",
    label: "Refund",
    appliesTo: ["POST /ecom/refund"],
    field: "checksum",
    inputs: ["refTransactionId", "transactionType", "transactionAmount"],
  },
  {
    id: "enquiry",
    label: "Payment enquiry (by transaction ID)",
    appliesTo: ["POST /ecom/payments/enquiry"],
    field: "checksum",
    inputs: ["transactionId"],
  },
  {
    id: "order-enquiry",
    label: "Payment enquiry (by order ID)",
    appliesTo: ["POST /ecom/payments/orderEnquiry"],
    field: "checksum",
    inputs: ["orderId"],
  },
  {
    id: "webhook",
    label: "Webhook payment response (verify inbound)",
    appliesTo: ["webhook"],
    field: "checksum",
    inputs: ["orderId", "transactionId", "referenceOrderId"],
  },
];

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

const str = (v: unknown) => (v === undefined || v === null ? "" : String(v));

export function computeChecksum(rule: ChecksumRule, body: Record<string, unknown>, salt: string): string {
  return sha256Hex(rule.inputs.map((k) => str(body[k])).join("") + salt);
}

export function ruleFor(method: string, path: string, body?: Record<string, unknown>): ChecksumRule | undefined {
  const key = `${method.toUpperCase()} ${path}`;
  return CHECKSUM_RULES.find((r) => r.appliesTo.includes(key) && (!r.when || (body && r.when(body))));
}

/** Return a copy of `body` with the checksum field filled in, or the body unchanged if no rule applies. */
export function signBody(method: string, path: string, body: unknown, salt: string): { body: unknown; rule?: ChecksumRule } {
  if (!salt || typeof body !== "object" || body === null || Array.isArray(body)) return { body };
  const b = body as Record<string, unknown>;
  const rule = ruleFor(method, path, b);
  if (!rule) return { body };
  return { body: { ...b, [rule.field]: computeChecksum(rule, b, salt) }, rule };
}

/** Constant-time check of a webhook payment entry's checksum. */
export function verifyWebhookEntry(entry: Record<string, unknown>, salt: string): boolean {
  const rule = CHECKSUM_RULES.find((r) => r.id === "webhook")!;
  const expected = computeChecksum(rule, entry, salt);
  const got = str(entry[rule.field]).toLowerCase();
  if (got.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
