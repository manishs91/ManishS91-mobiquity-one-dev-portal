---
title: Go live
section: Go live
order: 10
summary: What you need before production access, and how to switch over.
---

# Go live

## Before you request access

Your [dashboard](/dashboard) tracks these. The first three are required to submit:

1. Sandbox credentials created
2. A successful test payment
3. A webhook URL registered
4. A test webhook received and verified
5. A payment status checked with enquiry
6. A test refund

## Submit the request

The account owner submits [Go live](/dashboard/go-live) with your registered business details, website, expected volume, the payment methods you'll accept and a technical contact. The Mobiquity One team reviews it and may contact you for KYB documents.

## After approval

1. Create **production** credentials under [API credentials](/dashboard/credentials). Store the client secret and salt in your secrets manager; they're shown once.
2. Switch your base URL to the production URL shown in the [API reference](/api-reference).
3. Set production webhook URLs in your payment requests.
4. Make a small real payment and refund it.

## Production checklist

- Tokens are cached and refreshed, not requested per call.
- Checksums are verified on every webhook.
- Webhook handling is idempotent on `transactionId`.
- Orders are fulfilled only after a confirmed `0000`.
- `orderId` is unique per payment attempt.
- Secrets are not in source control or client-side code.
- You log `transactionId`, `orderId` and `requestId` for support requests.
