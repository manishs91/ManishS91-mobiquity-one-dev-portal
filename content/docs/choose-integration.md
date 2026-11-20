---
title: Choose an integration
section: Get started
order: 15
summary: Server-to-server if you're PCI DSS compliant and host your own checkout; Mobiquity One Checkout if you want a ready-made payment page.
---

# Choose an integration

Mobiquity One offers two ways to take payments. Both use the same credentials, webhooks, status enquiry and refunds. They differ in **who hosts the payment page**.

| | Server-to-server | Mobiquity One Checkout |
| --- | --- | --- |
| **Who builds the payment page** | You, inside your own app or site | Mobiquity One, opened in an iframe |
| **Card data** | Passes through your servers | Never touches your servers |
| **PCI DSS** | You must be PCI DSS compliant to handle card numbers | Your PCI scope is much smaller |
| **Payment methods** | You call one API per payment, choosing the method: cards, UPI, net banking, wallets, EMI | The checkout shows every method enabled for your business |
| **Look and feel** | Fully yours | Mobiquity One's page with your logo and name |
| **OTP and redirects** | You render the processor's page, or collect the OTP yourself (native OTP) | Handled inside the checkout |
| **Offers** | You apply them and send the discounted amount | Shown and applied inside the checkout |
| **Effort** | More: a screen per payment method | Less: one page, one encrypted payload |
| **Best for** | Large merchants with their own checkout and a PCI-compliant stack | Most merchants, and anyone who wants to launch quickly |

## Server-to-server

Your checkout collects the customer's payment details and your server sends them to Mobiquity One with [Initiate Payment](/api-reference/post-ecom-initiate-payment).

1. Your server gets an access token.
2. The customer picks a method and enters details on **your** page.
3. Your server calls `POST /ecom/initiatePayment` for that method.
4. You complete any next step: show the processor page, open the UPI app, or submit the OTP.
5. Mobiquity One sends the final status to your webhook; you confirm it with Payment Enquiry.

Start with [How server-to-server works](/docs/s2s-overview).

## Mobiquity One Checkout

Your server prepares the order details, encrypts them, and opens the Mobiquity One checkout page. The customer chooses a method and pays there.

1. Your server gets a checkout access token.
2. Your server builds the order payload (`merchantData`) and encrypts it.
3. Your page opens the checkout in an iframe with the order ID and encrypted payload.
4. The customer pays inside the checkout.
5. Mobiquity One redirects the customer back to you and sends the final status to your webhook.

Start with [How Mobiquity One Checkout works](/docs/checkout-overview).

> Not sure? Choose **Checkout**. You can add a server-to-server integration later for specific methods without changing your webhooks, enquiry or refund code.
