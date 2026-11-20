---
title: Cards
section: Server-to-server integration
order: 20
summary: Charge a new card, save a card, charge a saved card, card EMI, and native OTP.
---

# Card payments

All card payments use `POST /ecom/initiatePayment` with `method: "Card"` (or `"CardEmi"` for EMI). Send the [common parameters](/docs/s2s-overview#common-request-parameters) plus the card fields for your case.

> Card numbers, expiry and CVV pass through your servers in this flow, so you must be **PCI DSS compliant**. Never log them.

## New card

### Request

{{example op="POST /ecom/initiatePayment" variant="CardPaymentRequest" title="Request body"}}

Card fields, in addition to the common parameters:

{{params schema="CardPaymentRequest"}}

### Response

{{example op="POST /ecom/initiatePayment" status="200" variant="InitiateCardPaymentResponses" title="Response body"}}

{{params schema="InitiatePaymentResponse,InitiateCardPaymentResponses"}}

Render the HTML in `callBackUrl` in the customer's browser. It takes them to the card issuer's 3-D Secure page; afterwards they return to your `merchantRedirectURL` and the result arrives by webhook.

## Native OTP

With native OTP the customer types the OTP on **your** page instead of the bank's. Set `isNativeOtpRequired: "true"`. If the response has `isNativeOtpSupported: "Y"`, show your OTP screen; otherwise fall back to rendering `callBackUrl`.

### Request

{{example op="POST /ecom/initiatePayment" variant="S2SOTPCardPaymentRequest" title="Request body"}}

{{params schema="S2SOTPCardPaymentRequest"}}

### Response

{{example op="POST /ecom/initiatePayment" status="200" variant="InitiateS2SNativeOtpExample" title="Response body"}}

{{params schema="InitiatePaymentResponse,InitiateS2SNativeOtpExample"}}

### Submit the OTP

`POST /ecom/submitOtp`

{{example op="POST /ecom/submitOtp" title="Request body"}}

{{params schema="SubmitOtpRequest"}}

{{example op="POST /ecom/submitOtp" status="200" title="Response body"}}

{{params schema="SubmitOtpResponse"}}

A wrong OTP returns `2811` with the number of retries left.

### Resend the OTP

`POST /ecom/resendOtp`

{{params schema="ResendOtpRequest"}}

{{params schema="ResendOtpResponse"}}

## Save the card for next time

Add `saveToken: "Yes"`. The processor returns a network token that Mobiquity One stores against `customerCode`.

{{example op="POST /ecom/initiatePayment" variant="CardPaymentWithSaveTokenRequest" title="Request body"}}

{{params schema="CardPaymentWithSaveTokenRequest"}}

The response has the same fields as a new card payment.

## Charge a saved card

Send `isToken: "Yes"` and the token details from [Fetch Tokenized Cards](/api-reference/post-ecom-fetch-card-tokens) instead of the card number.

{{example op="POST /ecom/initiatePayment" variant="CardPaymentWithSavedCardRequest" title="Request body"}}

{{params schema="CardPaymentWithSavedCardRequest"}}

{{params schema="InitiatePaymentResponse,InitiateCardPaymentWithSavedCardResponses"}}

## Card EMI

Use `method: "CardEmi"` with the EMI tenure and bank.

{{example op="POST /ecom/initiatePayment" variant="CardEMIPaymentRequest" title="Request body"}}

{{params schema="CardEMIPaymentRequest"}}

{{example op="POST /ecom/initiatePayment" status="200" variant="InitiateCardEMIPaymentResponses" title="Response body"}}

{{params schema="InitiatePaymentResponse,InitiateCardEMIPaymentResponses"}}

## Test cards

| Card number | Result in the sandbox |
| --- | --- |
| Any valid test number, e.g. `4111111111111111` | Success |
| `4000000000000002` | Failure (`1702`) |

With `isNativeOtpRequired: "true"`, use OTP `123456`. More in [Testing](/docs/testing).
