---
title: Refunds
section: After the payment
order: 30
summary: Issue full or partial refunds against a successful payment.
---

# Refunds

`POST /ecom/refund` refunds all or part of a successful payment.

```json
{
  "paymentChannelId": "2",
  "hierLabelId": "722312061538411001",
  "hierarchyCriteria": "B2",
  "refTransactionId": "TC24011118420800065",
  "transactionType": "refund",
  "transactionAmount": "100",
  "checksum": "sha256(refTransactionId + transactionType + transactionAmount + salt)"
}
```

- `refTransactionId` is the `transactionId` of the original payment.
- You can refund in several parts. The total can't exceed the original amount (`3002`).
- A payment that hasn't been captured can't be refunded yet (`4475`).
- With split settlement, include `splitSettlement.vendors` to say how much comes from each vendor.

| Code | Meaning |
| --- | --- |
| `0000` | Refund accepted |
| `3000` | Unknown `refTransactionId` |
| `3002` / `4474` | Refund larger than the remaining amount |
| `4451` | `transactionType` must be `refund` |
| `7703` | Checksum mismatch |
