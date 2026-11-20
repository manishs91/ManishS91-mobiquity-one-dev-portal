---
title: How Mobiquity One Checkout works
section: Checkout integration
order: 10
summary: Open the Mobiquity One payment page in an iframe; it handles every payment method, OTP and offers.
---

# How Mobiquity One Checkout works

Mobiquity One Checkout is a ready-made payment page. You send it the order details; it shows the customer every payment method enabled for your business (cards, UPI, net banking, wallets, EMI and pay later), applies offers, handles OTP and bank redirects, and tells you the result.

Card numbers are entered on Mobiquity One's page and never reach your servers, which keeps your **PCI DSS scope small**.

## The flow

1. **Your server gets a checkout token** with `grant_type: webcheckout_credentials`.
2. **Your server builds the order payload** (`merchantData`): amount, items, customer, addresses, webhook and redirect URLs, branding.
3. **Your server encrypts it** with AES/CBC/PKCS5Padding.
4. **Your page opens the checkout** in an iframe: `GET /mpg/web-checkout` with `orderId`, `hierLabelIdReference`, `callbackurl` and the encrypted `merchantData`.
5. **The customer pays** inside the checkout.
6. **Mobiquity One sends the customer back** to your `merchantRedirectURL` and **posts the final status** to your `primaryWebhookURL` (falling back to `fallbackWebhookURL`).
7. **You confirm** with [Payment Enquiry](/docs/payment-status) and fulfil the order.

The [webhook](/docs/webhooks), [status enquiry](/docs/payment-status) and [refund](/docs/refunds) steps are the same as for server-to-server.

## What you control

| You can set | Field in `merchantData` |
| --- | --- |
| Your logo and display name | `merchantLogo`, `merchantName` |
| Hide wallet options | `hideWallet` |
| The order, items, charges and discounts shown | `orderDetails` |
| Where the customer returns, and where the status is sent | `orderDetails.redirectURL` |
| Customer and address details, so they don't retype them | `orderDetails.customerInfo`, `shippingAddress`, `billingAddress` |
| Your own reference fields | `orderDetails.udfParams` |

Next: [Open the checkout](/docs/checkout-integrate).
