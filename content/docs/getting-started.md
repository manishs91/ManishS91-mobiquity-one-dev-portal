---
title: Quickstart
section: Get started
order: 10
summary: From a new account to a successful sandbox payment.
---

# Quickstart

This walks through one complete payment in the sandbox: get credentials, get a token, initiate a UPI payment, receive the webhook and confirm the status. Nothing here moves real money.

## 1. Create a sandbox account

[Sign up](/signup) with your work email. Your first sandbox credential set is created straight away:

| Value | Used for |
| --- | --- |
| Tenant ID | `tenant_id` when you request a token |
| Client secret | `client_secret` when you request a token |
| Checksum salt | Signing payment, refund and enquiry requests, and verifying webhooks |
| Business unit ID | `hierLabelIdReference` on payment requests |
| Hierarchy criteria | `hierarchyCriteria` on payment requests |

The client secret and salt are shown once. Store them as environment variables:

```bash
MOBIQUITY_BASE_URL=http://localhost:4010        # sandbox base URL shown in the API reference
MOBIQUITY_TENANT_ID=...
MOBIQUITY_CLIENT_SECRET=...
MOBIQUITY_CHECKSUM_SALT=...
MOBIQUITY_HIER_LABEL_ID=...
MOBIQUITY_HIERARCHY_CRITERIA=B2
```

## 2. Get an access token

```bash
curl -X POST "$MOBIQUITY_BASE_URL/authorization/auth/oauth2/token" \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "client_credentials",
    "tenant_id": "'"$MOBIQUITY_TENANT_ID"'",
    "client_secret": "'"$MOBIQUITY_CLIENT_SECRET"'"
  }'
```

The response contains `accessToken` and `accessTokenExpiresAt`. Send the token as `Authorization: Bearer <accessToken>` on every other call. Details in [Authentication](/docs/authentication).

## 3. Initiate a UPI payment

Every payment request carries a checksum: `sha256(amount + orderId + taxAmount + electronicGoodsIndicator + paymentChannelId + salt)`. See [Checksums](/docs/checksums).

```js
import { createHash } from "node:crypto";

const body = {
  paymentChannelId: "2",                 // 2 = web, 3 = app
  hierLabelIdReference: process.env.MOBIQUITY_HIER_LABEL_ID,
  hierarchyCriteria: process.env.MOBIQUITY_HIERARCHY_CRITERIA,
  consumerMsisdn: "9876543210",
  amount: "500",
  taxAmount: "0",
  currencyCode: "INR",
  orderId: `order_${Date.now()}`,        // must be unique per payment
  electronicGoodsIndicator: "D",
  customerCode: "cust_123",
  customerFirstName: "Asha",
  customerLastName: "Rao",
  emailAddress: "asha@example.com",
  fallback: "N",
  merchantRedirectURL: "https://yourstore.example/checkout/return",
  primaryWebhookURL: "https://yourstore.example/webhooks/mobiquity",
  fallbackWebhookURL: "https://backup.yourstore.example/webhooks/mobiquity",
  method: "UPI",
  upiId: "success@upi",
  applicationLabel: "UPI",
};

body.checkSumPayment = createHash("sha256")
  .update(body.amount + body.orderId + body.taxAmount + body.electronicGoodsIndicator + body.paymentChannelId + process.env.MOBIQUITY_CHECKSUM_SALT)
  .digest("hex");

const res = await fetch(`${process.env.MOBIQUITY_BASE_URL}/ecom/initiatePayment`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
  body: JSON.stringify(body),
});
const { initiatePaymentResponses: [payment] } = await res.json();
console.log(payment.responseCode, payment.transactionId);
```

A `responseCode` of `0000` means the payment was initiated. Keep the `transactionId`: you need it for enquiries and refunds.

You can also run this from the [Initiate Payment console](/api-reference/post-ecom-initiate-payment). It fills in your token, business unit ID, a fresh order ID and the checksum.

## 4. Receive the webhook

When the payment completes, Mobiquity One posts the result to your `primaryWebhookURL` (and to `fallbackWebhookURL` if the primary doesn't respond). Verify the checksum before trusting it. See [Webhooks](/docs/webhooks).

## 5. Confirm the status

Don't rely on the browser redirect alone. Confirm the final status server-side with [Payment Enquiry](/docs/payment-status) before fulfilling the order.

## Next steps

- Try failures and pending payments with the [test values](/docs/testing).
- Add [refunds](/docs/refunds).
- When the checklist on your [dashboard](/dashboard) is complete, [request production access](/docs/go-live).
