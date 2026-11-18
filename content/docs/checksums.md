---
title: Checksums
section: Get started
order: 30
summary: How to sign requests and verify webhooks with your checksum salt.
---

# Checksums

Payment, refund and enquiry requests include a checksum so Mobiquity One can detect a request that was altered in transit. Webhooks include one so you can check they really came from Mobiquity One.

The checksum is the **lowercase hex SHA-256** of specific fields concatenated in order, **with no separators**, followed by your **checksum salt**.

## Which fields

| Request | Field | Concatenate, in order |
| --- | --- | --- |
| Initiate payment | `checkSumPayment` | `amount` + `orderId` + `taxAmount` + `electronicGoodsIndicator` + `paymentChannelId` + salt |
| Unified initiate (pay later) | `checkSumPayment` | `amount` + `orderId` + `paymentChannelId` + salt |
| Refund | `checksum` | `refTransactionId` + `transactionType` + `transactionAmount` + salt |
| Enquiry by transaction ID | `checksum` | `transactionId` + salt |
| Enquiry by order ID | `checksum` | `orderId` + salt |
| Webhook (verify) | `checksum` | `orderId` + `transactionId` + `referenceOrderId` + salt |

Use the values exactly as you send them: `"500"` and `"500.00"` give different checksums.

## Worked example

With `amount = "500"`, `orderId = "lyqH7"`, `taxAmount = "1"`, `electronicGoodsIndicator = "D"`, `paymentChannelId = "2"` and salt `abcdefghhgfedcba`, the string hashed is:

```text
500lyqH71D2abcdefghhgfedcba
```

and the checksum is:

```text
dfd2c0d9ad00b025fed42b5f4b9d573a0a8b88e53f1b10febc5910a26c757043
```

The [checksum tool](/dashboard/checksum) shows this breakdown for any body you paste.

## Code

**Node.js**

```js
import { createHash } from "node:crypto";

export const checksum = (parts, salt) =>
  createHash("sha256").update(parts.map((p) => p ?? "").join("") + salt).digest("hex");

body.checkSumPayment = checksum(
  [body.amount, body.orderId, body.taxAmount, body.electronicGoodsIndicator, body.paymentChannelId],
  process.env.MOBIQUITY_CHECKSUM_SALT,
);
```

**Python**

```python
import hashlib, os

def checksum(parts, salt):
    return hashlib.sha256(("".join("" if p is None else str(p) for p in parts) + salt).encode()).hexdigest()

body["checkSumPayment"] = checksum(
    [body["amount"], body["orderId"], body["taxAmount"], body["electronicGoodsIndicator"], body["paymentChannelId"]],
    os.environ["MOBIQUITY_CHECKSUM_SALT"],
)
```

**Java**

```java
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

static String checksum(String salt, String... parts) throws Exception {
    String input = String.join("", parts) + salt;
    byte[] hash = MessageDigest.getInstance("SHA-256").digest(input.getBytes(StandardCharsets.UTF_8));
    return HexFormat.of().formatHex(hash);
}
```

**PHP**

```php
function checksum(array $parts, string $salt): string {
    return hash('sha256', implode('', $parts) . $salt);
}
```

## If you get 7703

`7703 Checksum verification failed.` almost always means one of:

- fields concatenated in a different order, or with separators
- a value formatted differently from what you sent (`500` vs `500.00`, trailing spaces)
- the salt from a different credential set or environment
- uppercase hex (use lowercase)
