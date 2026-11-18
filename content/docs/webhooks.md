---
title: Webhooks
section: After the payment
order: 10
summary: Receive the final payment status on your server and verify it.
---

# Webhooks

Mobiquity One tells your server the final status of each payment by posting to the `primaryWebhookURL` you sent in Initiate Payment. If that URL doesn't answer with 2xx, it tries `fallbackWebhookURL`.

## Payload

```json
{
  "ecommPaymentResponseList": [
    {
      "responseCode": "0000",
      "responseMessage": "CREDIT CARD Payment is Successful",
      "gateWayResponseCode": "0000",
      "gateWayResponseMessage": "SUCCESS",
      "transactionId": "TC24012818341700017",
      "orderId": "PO0jT",
      "referenceOrderId": "65240128183417116",
      "cardScheme": "Visa",
      "processorName": "RAZORPAY",
      "processorPaymentId": "pay_O0MpqUD8LLz4Xh",
      "checksum": "…"
    }
  ],
  "status": "200",
  "message": "SUCCESS"
}
```

Use `responseCode` in each list entry for the payment result. The top-level `status` and `message` describe the delivery, not the payment.

## Verify the checksum

Recompute `sha256(orderId + transactionId + referenceOrderId + salt)` and compare it to `checksum` with a constant-time comparison. Reject the webhook if they differ.

```js
import { createHash, timingSafeEqual } from "node:crypto";

app.post("/webhooks/mobiquity", express.json(), (req, res) => {
  for (const p of req.body.ecommPaymentResponseList ?? []) {
    const expected = createHash("sha256")
      .update(`${p.orderId}${p.transactionId}${p.referenceOrderId}${process.env.MOBIQUITY_CHECKSUM_SALT}`)
      .digest();
    const given = Buffer.from(String(p.checksum ?? ""), "hex");
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
      return res.status(400).send("bad checksum");
    }
    markOrder(p.orderId, p.responseCode === "0000" ? "paid" : p.responseCode === "7000" ? "pending" : "failed", p);
  }
  res.sendStatus(200);
});
```

```python
import hashlib, hmac, os

@app.post("/webhooks/mobiquity")
def mobiquity_webhook():
    for p in request.json.get("ecommPaymentResponseList", []):
        expected = hashlib.sha256(f"{p['orderId']}{p['transactionId']}{p['referenceOrderId']}{os.environ['MOBIQUITY_CHECKSUM_SALT']}".encode()).hexdigest()
        if not hmac.compare_digest(expected, str(p.get("checksum", "")).lower()):
            abort(400)
        mark_order(p["orderId"], p["responseCode"], p)
    return "", 200
```

## Handle it safely

- **Respond quickly.** Return 200 as soon as you've stored the event; do slow work in the background.
- **Expect duplicates.** The same payment can be delivered to both URLs or more than once. Make the handler idempotent on `transactionId`.
- **Don't trust order of arrival.** A pending event can arrive after success. Never move an order backwards from paid.
- **Confirm before fulfilling high-value orders** with [Payment Enquiry](/docs/payment-status).
- **Use HTTPS** and keep the webhook path unguessable if you can.

## Test it

Save your URLs under [Webhooks](/dashboard/webhooks) and send test events. Each delivery shows the payload and your server's response.
