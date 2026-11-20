---
title: How server-to-server works
section: Server-to-server integration
order: 10
summary: The payment flow, the common request fields, and how to handle each kind of response.
---

# How server-to-server works

With a server-to-server (S2S) integration you build the payment screens yourself and your server calls Mobiquity One for each payment.

> **You must be PCI DSS compliant** to send card numbers, expiry dates and CVVs through your systems. If you aren't, use [Mobiquity One Checkout](/docs/checkout-overview) for cards. UPI, net banking and wallets don't carry card data.

## The flow

1. **Get a token.** `POST /authorization/auth/oauth2/token` with `grant_type: client_credentials`. See [Authentication](/docs/authentication).
2. **Initiate the payment.** `POST /ecom/initiatePayment` with the common fields below plus the fields for the chosen method:
   - [Cards](/docs/s2s-cards): new card, saved card, save for later, EMI, native OTP
   - [UPI](/docs/s2s-upi): collect, intent, QR
   - [Net banking](/docs/s2s-netbanking)
   - [Wallets](/docs/s2s-wallets)
3. **Handle the response.** It tells you what the customer has to do next (see below).
4. **Receive the webhook.** Mobiquity One posts the final status to `primaryWebhookURL`. See [Webhooks](/docs/webhooks).
5. **Confirm the status** with [Payment Enquiry](/docs/payment-status) before you fulfil the order.

Every request needs a [checksum](/docs/checksums) in `checkSumPayment`: `sha256(amount + orderId + taxAmount + electronicGoodsIndicator + paymentChannelId + salt)`.

## Common request parameters

These fields are sent with **every** payment method. Each method page lists the extra fields for that method.

{{params schema="InitiatePaymentRequest"}}

## Handling the response

`responseCode: "0000"` in `initiatePaymentResponses[0]` means the payment was **initiated**. The customer usually still has a step to complete. Look at the response fields to see which:

| If the response has | Do this |
| --- | --- |
| `callBackUrl` containing an HTML form | Render it in the customer's browser. It auto-submits to the processor's page (3-D Secure, bank login, wallet login) |
| `redirectURL` | Send the customer's browser to that URL |
| `isNativeOtpSupported: "Y"` | Show your own OTP screen and send the code with [Submit OTP](/docs/s2s-cards#native-otp) |
| A UPI intent link or QR (UPI intent / QR) | Open the UPI app with the link, or show the QR code |
| UPI collect | Ask the customer to approve the request in their UPI app |

After that step, the customer comes back to your `merchantRedirectURL`. **Don't treat that redirect as proof of payment**: wait for the webhook or call enquiry.

## Retrying a failed payment

Each `orderId` can only be used once (`1055` otherwise). To let the customer retry the same order, send `skipOrderIdCheck: "true"`:

{{params schema="PaymentRequestWithManualRetry"}}

## Common errors

| Code | Meaning |
| --- | --- |
| `4471` | Missing or expired access token |
| `7703` | `checkSumPayment` doesn't match: check the field order and salt |
| `1055` | `orderId` already used |
| `7710` | `hierLabelIdReference` isn't yours |
| `9006` | `amount` has more than two decimals |
| `44xx` | A required field is missing; the message names it |

All codes: [Response codes](/docs/errors).
