---
title: UPI
section: Server-to-server integration
order: 30
summary: UPI collect requests, intent links that open the customer's UPI app, and QR codes.
---

# UPI payments

UPI payments use `POST /ecom/initiatePayment`. Send the [common parameters](/docs/s2s-overview#common-request-parameters) plus the fields for one of three flows:

| Flow | How the customer pays | Best for |
| --- | --- | --- |
| **Collect** | Enters their UPI ID on your page, then approves the request in their UPI app | Desktop and mobile web |
| **Intent** | Taps a button that opens their UPI app with the payment filled in | Mobile apps and mobile web |
| **QR** | Scans a QR code with any UPI app | Desktop, kiosks, point of sale |

## UPI collect

### Request

{{example op="POST /ecom/initiatePayment" variant="UPIPaymentRequest" title="Request body"}}

{{params schema="UPIPaymentRequest"}}

You can check the UPI ID first with [Validate UPI](/api-reference/post-ecom-validate-upi). Set `saveVpa: "true"` to save it for next time.

### Response

{{example op="POST /ecom/initiatePayment" status="200" variant="InitiateUPIPaymentResponses" title="Response body"}}

{{params schema="InitiatePaymentResponse,InitiateUPIPaymentResponses"}}

Tell the customer to approve the request in their UPI app, then wait for the webhook.

## UPI intent

### Request

{{example op="POST /ecom/initiatePayment" variant="UPIIntentPaymentRequest" title="Request body"}}

{{params schema="UPIIntentPaymentRequest"}}

### Response

{{example op="POST /ecom/initiatePayment" status="200" variant="InitiateUPIIntentPaymentResponses" title="Response body"}}

{{params schema="InitiatePaymentResponse,InitiateUPIIntentPaymentResponses"}}

Open the intent link from the response on the customer's device; the phone offers the installed UPI apps.

## UPI QR

### Request

{{example op="POST /ecom/initiatePayment" variant="UPIQRPaymentRequest" title="Request body"}}

{{params schema="UPIQRPaymentRequest"}}

### Response

{{example op="POST /ecom/initiatePayment" status="200" variant="InitiateQRPaymentResponses" title="Response body"}}

{{params schema="InitiatePaymentResponse,InitiateQRPaymentResponses"}}

Display the QR from the response and keep the page open until the webhook arrives or you confirm with enquiry.

## Test values

| UPI ID | Result in the sandbox |
| --- | --- |
| `success@upi` or any other | Success |
| `failure@upi` | Failure (`1702`) |
| `pending@upi` | Stays pending (`7000`) |
