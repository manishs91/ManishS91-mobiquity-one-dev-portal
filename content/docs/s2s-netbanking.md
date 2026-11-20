---
title: Net banking
section: Server-to-server integration
order: 40
summary: Send the customer to their bank's login page to pay.
---

# Net banking

The customer picks their bank on your page; Mobiquity One returns the bank's login page for them to complete the payment.

Send `POST /ecom/initiatePayment` with the [common parameters](/docs/s2s-overview#common-request-parameters) plus:

## Request

{{example op="POST /ecom/initiatePayment" variant="NetbankingPaymentRequest" title="Request body"}}

{{params schema="NetbankingPaymentRequest"}}

## Response

{{example op="POST /ecom/initiatePayment" status="200" variant="InitiateNetbankingPaymentResponses" title="Response body"}}

{{params schema="InitiatePaymentResponse,InitiateNetbankingPaymentResponses"}}

Render `callBackUrl` in the customer's browser to take them to the bank. After they log in and approve, they return to your `merchantRedirectURL` and the result arrives by webhook.

> Bank pages can take a while and customers sometimes close them. Expect some payments to stay pending (`7000`) and confirm with [Payment Enquiry](/docs/payment-status).
