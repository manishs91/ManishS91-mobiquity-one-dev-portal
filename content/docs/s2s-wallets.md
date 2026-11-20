---
title: Wallets
section: Server-to-server integration
order: 50
summary: Pay with a mobile wallet such as FreeCharge.
---

# Wallets

The customer picks a wallet on your page; Mobiquity One returns the wallet's page for them to log in and pay.

Send `POST /ecom/initiatePayment` with the [common parameters](/docs/s2s-overview#common-request-parameters) plus:

## Request

{{example op="POST /ecom/initiatePayment" variant="WalletPaymentRequest" title="Request body"}}

{{params schema="WalletPaymentRequest"}}

## Response

{{example op="POST /ecom/initiatePayment" status="200" variant="InitiateWalletPaymentResponses" title="Response body"}}

{{params schema="InitiatePaymentResponse,InitiateWalletPaymentResponses"}}

Render `callBackUrl` in the customer's browser to take them to the wallet. The final result arrives by webhook.
