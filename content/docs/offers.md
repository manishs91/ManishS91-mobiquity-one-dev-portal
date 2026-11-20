---
title: Offers
section: Checkout integration
order: 30
summary: Create discounts and apply merchant or payment-method offers.
---

# Offers

The checkout shows and applies eligible offers for you. With a server-to-server integration, apply the offer with the endpoints below and send the discounted amount in Initiate Payment.

Offers are discounts configured for your business, either general merchant offers or tied to a payment method (for example, 10% off with a particular bank's cards).

## Manage offers

| Call | Purpose |
| --- | --- |
| `POST /offers/getOffers` | List offers |
| `POST /offers/create` | Create an offer |
| `POST /offers/update` | Change an offer |
| `DELETE /offers/delete/{offerId}` | Remove an offer |

These need the `X-TenantId` header.

## Apply at checkout

`POST /mpg/checkout/applyMerchantOffer` and `POST /mpg/checkout/applyPaymentMethodOffer` validate an offer for the cart and return the discounted amount.

When an offer is applied, send the **discounted** amount in Initiate Payment and include the applied offer details. Compute the checksum on the discounted amount.

| Code | Meaning |
| --- | --- |
| `4588` | Applied offer is not eligible |
| `4589` | Applied offer details are invalid |
