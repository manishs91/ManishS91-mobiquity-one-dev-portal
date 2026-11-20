---
title: Guides
section: Get started
order: 0
---

# Integrate Mobiquity One payments

Mobiquity One sits between your checkout and the payment processors you work with. You send one payment request; Mobiquity One routes it to the right processor (Razorpay, PayU, PhonePe and others configured for your business), handles OTP and redirect steps, retries on a fallback route when needed, and tells your server the result by webhook.

There are two ways to integrate: **server-to-server**, if you're PCI DSS compliant and host your own checkout, or **Mobiquity One Checkout**, a ready-made payment page you open in an iframe. [Choose an integration](/docs/choose-integration) compares them.

New to the API? The [quickstart](/docs/getting-started) takes you from a new account to a successful sandbox payment in about ten minutes.
