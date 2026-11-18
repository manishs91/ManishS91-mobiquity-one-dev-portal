---
title: Testing
section: Get started
order: 40
summary: Test values that trigger success, failure, pending and OTP flows in the sandbox.
---

# Testing

The sandbox accepts the same requests as production and never moves money. Use these values to drive each outcome.

## Payment outcomes

| To get | Use |
| --- | --- |
| Success | Any amount except those below |
| Failure (`1702`) | `amount: "101"`, or `upiId: "failure@upi"`, or `cardNumber: "4000000000000002"` |
| Pending (`7000`) | `amount: "102"`, or `upiId: "pending@upi"` |
| OTP challenge | `isNativeOtpRequired: "true"` on a card payment, then submit OTP `123456` |

A wrong OTP returns `2811` with the retries left; the third wrong OTP fails the payment.

## Webhooks

The sandbox posts the final status to your `primaryWebhookURL` about 1.5 seconds after a payment completes, and tries `fallbackWebhookURL` if the primary doesn't return 2xx. The payload's checksum is signed with your sandbox salt.

From [Webhooks](/dashboard/webhooks) in the dashboard you can also send a test success, failure or pending event to a saved URL and see your server's response.

To receive webhooks on your laptop, expose your local server with a tunnelling tool and use its HTTPS URL.

## Validation errors you can trigger

| Send | Get |
| --- | --- |
| A reused `orderId` | `1055` Order Id not unique |
| A wrong checksum | `7703` Checksum verification failed |
| Someone else's `hierLabelIdReference` | `7710` Label Id reference is invalid |
| `amount: "500.123"` | `9006` Invalid Amount |
| A refund larger than the payment | `3002` Refund amount greater than original |
| No `Authorization` header | `4471` Unauthorized Access |

## Running the sandbox locally

The repository includes a mock of the Mobiquity One APIs (`npm run mock`). It has a built-in demo tenant whose values match the API specification's examples, so examples copied from the reference work unchanged:

| Tenant ID | Client secret | Salt | Business unit ID |
| --- | --- | --- | --- |
| `1001` | `merchant_secret` | `abcdefghhgfedcba` | `722312061538411001` |
