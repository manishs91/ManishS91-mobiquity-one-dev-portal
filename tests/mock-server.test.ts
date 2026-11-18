import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";

process.env.MOCK_NO_LISTEN = "1";
process.env.MOCK_QUIET = "1";
process.env.MOCK_STATE_FILE = path.join(mkdtempSync(path.join(tmpdir(), "m1mock-")), "state.json");
process.env.MOCK_WEBHOOK_DELAY_MS = "60000";

const { server } = await import("../mock-server/server");
let base = "";
const SALT = "abcdefghhgfedcba";
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

before(async () => {
  await new Promise<void>((r) => server.listen(0, r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => server.close());

async function post(p: string, body: unknown, token?: string) {
  const res = await fetch(base + p, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json()) as Record<string, any> };
}

async function token() {
  const r = await post("/authorization/auth/oauth2/token", { grant_type: "client_credentials", tenant_id: "1001", client_secret: "merchant_secret" });
  assert.equal(r.status, 200);
  return r.body.accessToken as string;
}

function payment(overrides: Record<string, string> = {}) {
  const b: Record<string, string> = {
    paymentChannelId: "2", hierLabelIdReference: "722312061538411001", hierarchyCriteria: "B2", consumerMsisdn: "9999999999",
    amount: "500", taxAmount: "1", currencyCode: "INR", orderId: `o_${Math.random().toString(36).slice(2)}`, electronicGoodsIndicator: "D",
    customerCode: "c1", customerFirstName: "A", method: "UPI", upiId: "success@upi", ...overrides,
  };
  b.checkSumPayment = sha(b.amount + b.orderId + b.taxAmount + b.electronicGoodsIndicator + b.paymentChannelId + SALT);
  return b;
}

test("rejects bad credentials", async () => {
  const r = await post("/authorization/auth/oauth2/token", { grant_type: "client_credentials", tenant_id: "1001", client_secret: "nope" });
  assert.equal(r.status, 401);
});

test("payment -> enquiry -> partial refund -> over-refund", async () => {
  const t = await token();
  const pay = await post("/ecom/initiatePayment", payment(), t);
  assert.equal(pay.status, 200);
  const entry = pay.body.initiatePaymentResponses[0];
  assert.equal(entry.responseCode, "0000");

  const enq = await post("/ecom/payments/enquiry", { transactionId: entry.transactionId, checksum: sha(entry.transactionId + SALT) }, t);
  assert.equal(enq.status, 200);
  assert.equal(enq.body.ecommPaymentResponseList[0].responseCode, "0000");

  const refund = (amt: string) =>
    post("/ecom/refund", { refTransactionId: entry.transactionId, transactionType: "refund", transactionAmount: amt, checksum: sha(`${entry.transactionId}refund${amt}${SALT}`) }, t);
  assert.equal((await refund("200")).body.responseCode, "0000");
  assert.equal((await refund("301")).body.responseCode, "3002");
});

test("validates checksum, duplicates, tenant and auth", async () => {
  const t = await token();
  const p = payment();
  assert.equal((await post("/ecom/initiatePayment", { ...p, checkSumPayment: "0".repeat(64) }, t)).status, 400);
  assert.equal((await post("/ecom/initiatePayment", p, t)).status, 200);
  const dup = await post("/ecom/initiatePayment", p, t);
  assert.match(JSON.stringify(dup.body), /"1055"/);
  const other = await post("/ecom/initiatePayment", payment({ hierLabelIdReference: "1" }), t);
  assert.match(JSON.stringify(other.body), /"7710"/);
  assert.equal((await post("/ecom/initiatePayment", payment())).status, 401);
});

test("pending and OTP flows", async () => {
  const t = await token();
  const pend = (await post("/ecom/initiatePayment", payment({ amount: "102" }), t)).body.initiatePaymentResponses[0];
  const enq = await post("/ecom/payments/enquiry", { transactionId: pend.transactionId, checksum: sha(pend.transactionId + SALT) }, t);
  assert.match(JSON.stringify(enq.body), /"7000"/);

  const otpPay = await post("/ecom/initiatePayment", payment({ method: "Card", cardNumber: "4111111111111111", isNativeOtpRequired: "true" }), t);
  const ref = otpPay.body.referenceId as string;
  assert.match(ref, /^[0-9a-f]{64}$/);
  assert.match(JSON.stringify((await post("/ecom/submitOtp", { referenceId: ref, otp: "000000" }, t)).body), /"2811"/);
  assert.equal((await post("/ecom/submitOtp", { referenceId: ref, otp: "123456" }, t)).body.responseCode, "0000");
});

test("unknown routes 404, documented routes answer with spec examples", async () => {
  const t = await token();
  assert.equal((await post("/nope", {}, t)).status, 404);
  const bin = await post("/ecom/fetchBinDetail", { bin: "411111" }, t);
  assert.equal(bin.status, 200);
});
