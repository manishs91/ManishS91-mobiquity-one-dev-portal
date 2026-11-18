import assert from "node:assert/strict";
import { test } from "node:test";
import { CHECKSUM_RULES, computeChecksum, ruleFor, signBody, verifyWebhookEntry } from "../src/lib/checksum";

const SPEC_SALT = "abcdefghhgfedcba"; // salt quoted in the spec's field descriptions

test("matches the spec's Initiate Payment example checksum", () => {
  const body = { amount: "500", orderId: "lyqH7", taxAmount: "1", electronicGoodsIndicator: "D", paymentChannelId: "2" };
  const rule = ruleFor("POST", "/ecom/initiatePayment", body)!;
  assert.equal(rule.id, "initiate-payment");
  assert.equal(computeChecksum(rule, body, SPEC_SALT), "dfd2c0d9ad00b025fed42b5f4b9d573a0a8b88e53f1b10febc5910a26c757043");
});

test("matches the spec's Payment Enquiry example checksum", () => {
  const rule = ruleFor("POST", "/ecom/payments/enquiry")!;
  assert.equal(computeChecksum(rule, { transactionId: "TC24012818341700017" }, SPEC_SALT), "b63e4d1e385e12ce6aab828a40e953772a5fd6966ca3e84ea532f7f5f8f1f3af");
});

test("unified initiate uses the pay-later formula when tax fields are absent", () => {
  const rule = ruleFor("POST", "/ecom/unifiedInitiatePayment", { amount: "1", orderId: "o", paymentChannelId: "2" })!;
  assert.equal(rule.id, "pay-later");
  const full = ruleFor("POST", "/ecom/unifiedInitiatePayment", { amount: "1", orderId: "o", taxAmount: "0", electronicGoodsIndicator: "D", paymentChannelId: "2" })!;
  assert.equal(full.id, "initiate-payment");
});

test("signBody fills the checksum field and leaves other endpoints alone", () => {
  const { body, rule } = signBody("post", "/ecom/refund", { refTransactionId: "T1", transactionType: "refund", transactionAmount: "10" }, "s");
  assert.equal(rule?.field, "checksum");
  assert.match((body as Record<string, string>).checksum, /^[0-9a-f]{64}$/);
  const untouched = { a: 1 };
  assert.equal(signBody("post", "/ecom/fetchVPAs", untouched, "s").body, untouched);
});

test("webhook verification accepts a valid checksum and rejects tampering", () => {
  const rule = CHECKSUM_RULES.find((r) => r.id === "webhook")!;
  const entry: Record<string, unknown> = { orderId: "PO0jT", transactionId: "TC1", referenceOrderId: "RO1" };
  entry.checksum = computeChecksum(rule, entry, "salt");
  assert.equal(verifyWebhookEntry(entry, "salt"), true);
  assert.equal(verifyWebhookEntry({ ...entry, orderId: "other" }, "salt"), false);
  assert.equal(verifyWebhookEntry({ ...entry, checksum: String(entry.checksum).toUpperCase() }, "salt"), true);
  assert.equal(verifyWebhookEntry(entry, "wrong-salt"), false);
});
