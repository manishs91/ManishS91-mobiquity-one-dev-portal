---
title: Response codes
section: Reference
order: 10
summary: Every response code in the API, and what to do about the common ones.
---

# Response codes

Most responses carry a `responseCode` and `responseMessage`. `0000` means success; anything else explains what went wrong.

## Common codes

| Code | Meaning | Fix |
| --- | --- | --- |
| `4471` | Unauthorized access | Get a fresh token and retry once |
| `7703` | Checksum verification failed | See [Checksums](/docs/checksums#if-you-get-7703) |
| `1055` | Order ID not unique | Use a new `orderId` for each payment attempt |
| `7710` | Business unit ID invalid | Use the `hierLabelIdReference` from your credentials |
| `9006` / `9002` | Invalid amount | String with at most two decimals |
| `44xx` | A required field is missing or invalid | The message names the field |
| `7000` | Payment still pending | Wait for the webhook or poll enquiry |
| `1702` | Failed at the bank | Ask the customer to try another method |
| `9999` / `7717` | System error | Retry with backoff; contact support with the `requestId` if it persists |
