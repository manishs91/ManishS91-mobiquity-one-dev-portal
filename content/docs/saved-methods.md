---
title: Saved cards and UPI IDs
section: Accept payments
order: 30
summary: Let returning customers pay with a tokenized card or a saved UPI ID.
---

# Saved cards and UPI IDs

## Save during payment

- Cards: add `saveToken: "Yes"` to a card payment (the *Card Payment With Save Token* example). The processor returns a network token; Mobiquity One stores it against `customerCode`.
- UPI: set `saveVpa: "true"` on a UPI payment.

## List what a customer has saved

| Call | Returns |
| --- | --- |
| `POST /ecom/SavedPaymentMethods` | Everything saved for the customer |
| `POST /ecom/fetchCardTokens` | Tokenized cards |
| `POST /ecom/fetchVPAs` | Saved UPI IDs |

## Pay with a saved card

Send `isToken: "Yes"` and the `cardToken` instead of the card number (see the *Card Payment With Saved Card* example).

## Remove

`POST /ecom/deleteCardTokens` and `POST /ecom/deleteVPAs`. Offer this in your customer's account settings.

## Validate a UPI ID before charging

`POST /ecom/validateUpi` checks a UPI ID exists; `GET /ValidUpiHandle/service-integrator/fetchValidUpiHandle` lists accepted handles so you can validate as the customer types.
