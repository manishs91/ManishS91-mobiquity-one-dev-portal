---
title: Check payment status
section: After the payment
order: 20
summary: Confirm a payment's final state by transaction ID or order ID.
---

# Check payment status

Use Payment Enquiry when a webhook hasn't arrived, when the customer returns from a redirect, or before fulfilling a high-value order.

## By transaction ID

`POST /ecom/payments/enquiry`

```json
{ "transactionId": "TC24012818341700017", "checksum": "sha256(transactionId + salt)" }
```

The response has the same `ecommPaymentResponseList` shape as the webhook.

## By order ID

`POST /ecom/payments/orderEnquiry`

```json
{ "orderId": "PO0jT", "checksum": "sha256(orderId + salt)" }
```

The response's `data.status` is one of the success, pending, refunded, reversed or failure states shown in the [reference examples](/api-reference/post-ecom-payments-order-enquiry).

## Polling

If you poll, back off: for example after 5 s, 15 s, 30 s, then every minute for up to 30 minutes. `7000 Payment is still pending.` means try again later; don't create a new payment for the same order while it's pending.
