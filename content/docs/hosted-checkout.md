---
title: Hosted checkout
section: Accept payments
order: 20
summary: Embed the Mobiquity One web checkout instead of building payment forms.
---

# Hosted checkout

If you'd rather not collect card details yourself, embed the Mobiquity One web checkout in an iframe. It shows the payment methods enabled for your business, applies offers and handles OTP and redirects.

## How it works

1. Your server gets a token with `grant_type: "webcheckout_credentials"` (needs `client_id` and `client_secret` for your checkout client).
2. Load `GET /mpg/web-checkout` in an iframe with `orderId`, `hierLabelIdReference`, `callbackurl` and `merchantData`.
3. The customer pays inside the iframe.
4. Mobiquity One redirects to your `callbackurl` and posts the result to your webhook.

See [Fetch Merchant Details](/api-reference/get-mpg-web-checkout) for the parameters, and the offer endpoints under [Offers](/api-reference) to apply discounts inside the checkout.

> Hosted checkout reduces your PCI DSS scope because card numbers never touch your servers.
