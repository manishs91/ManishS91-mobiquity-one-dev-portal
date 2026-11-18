---
title: Accept a payment
section: Accept payments
order: 10
summary: Cards, UPI, wallets and net banking through one Initiate Payment call.
---

# Accept a payment

All payment methods go through `POST /ecom/initiatePayment`. The common fields describe the order and customer; the `method` field and a few method-specific fields choose the instrument.

## Common fields

| Field | Notes |
| --- | --- |
| `paymentChannelId` | `2` for web, `3` for app |
| `hierLabelIdReference`, `hierarchyCriteria` | Your business unit ID and hierarchy, from your credentials |
| `orderId` | Your reference. Must be unique per payment; reuse returns `1055` |
| `amount`, `taxAmount` | Strings, at most two decimals (`"500"`, `"500.10"`). Deduct any applied offer from `amount` |
| `currencyCode` | e.g. `INR` |
| `consumerMsisdn`, `emailAddress`, `customerCode`, `customerFirstName`, `customerLastName` | Customer details |
| `electronicGoodsIndicator` | `D` for digital goods, as agreed at onboarding |
| `preferredPg` | Optional processor hint: `6` Razorpay, `7` PayU, `12` PhonePe |
| `fallback` | `Y` to let Mobiquity One retry on another route if the first fails |
| `merchantRedirectURL` | Where the customer returns after any redirect step |
| `primaryWebhookURL`, `fallbackWebhookURL` | Where the final status is posted |
| `checkSumPayment` | See [Checksums](/docs/checksums) |

## Method-specific fields

| Instrument | `method` | Other fields |
| --- | --- | --- |
| Card | `Card` | `cardNumber`, `expiry` (`MM/YYYY`), `cvv`, `cardName`, `isToken: "No"`, `isNativeOtpRequired` |
| Card, save for later | `Card` | As above plus `saveToken: "Yes"` |
| Saved card | `Card` | `isToken: "Yes"`, `cardToken`, `tokenId`, `tokenType`, `cvv`, `applicationLabel`, `cardType`, `issueBank` |
| Card EMI | `CardEmi` | Card fields plus `emiDuration`, `emiBankId`, `processorName` |
| UPI collect | `UPI` | `upiId`, `applicationLabel: "UPI"`, optional `saveVpa` |
| UPI intent | `UPI` | `upiIntent: true`, `applicationLabel: "UPI"` |
| UPI QR | `QRCode` | `applicationLabel` |
| Wallet | `Wallet` | `applicationLabel`, the wallet name (e.g. `FreeCharge`) |
| Net banking | `BANK` | `applicationLabel`, the bank name (e.g. `Axis Bank`) |

To retry a failed payment with the same `orderId`, send `skipOrderIdCheck: "true"` (the *Payment Request With Manual Retry* example).

Each variant has a full example in the [Initiate Payment reference](/api-reference/post-ecom-initiate-payment). Pick it from the example list in the console.

## What comes back

```json
{
  "status": "200",
  "message": "SUCCESS",
  "initiatePaymentResponses": [
    {
      "responseCode": "0000",
      "responseMessage": "Payment is Initiated",
      "transactionId": "TC23122014294507775",
      "orderId": "lyqH7",
      "referenceOrderId": "6523122014294517630",
      "callBackUrl": "<html>…</html>"
    }
  ]
}
```

- `0000` means the payment was **initiated**, not that it succeeded. The final result arrives by webhook.
- For card and some wallet flows, `callBackUrl` holds an HTML form that sends the customer to the processor's page (3-D Secure, bank login). Render it in the customer's browser.
- Store `transactionId` against your order.

## OTP on your own page

Card payments with `isNativeOtpRequired: "true"` let you collect the OTP on your own page instead of redirecting. Send it with `POST /ecom/submitOtp` using the `referenceId` from the initiate response; `POST /ecom/resendOtp` sends a new one.

## Before you fulfil the order

1. Wait for the webhook, or poll [Payment Enquiry](/docs/payment-status).
2. Check the `responseCode` is `0000` and the amount matches your order.
3. Verify the webhook checksum.
