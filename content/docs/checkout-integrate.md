---
title: Open the checkout
section: Checkout integration
order: 20
summary: Get a checkout token, build and encrypt merchantData, and load the checkout in an iframe.
---

# Open the checkout

## 1. Get a checkout token

`POST /authorization/auth/oauth2/token` with `grant_type: webcheckout_credentials`.

{{params schema="WebCheckoutTokenRequest"}}

> **Confirm with Mobiquity One:** the schema above requires `tenant_oauth_hash` ("hash of TenantId_ClientSecret") but doesn't say which hash algorithm. The spec's own example sends `client_id` and `client_secret` instead:

{{example op="POST /authorization/auth/oauth2/token" variant="webCheckoutCredentials" title="Example from the spec"}}

The response is the same as for any token: see [Authentication](/docs/authentication).

## 2. Build the order payload

`merchantData` is a JSON object describing the order. Build it on your server.

{{example schema="MerchantDetailsRequest" title="merchantData before encryption"}}

{{params schema="MerchantDetailsRequest"}}

## 3. Encrypt it

Encrypt the JSON with **AES/CBC/PKCS5Padding**, using the key and IV issued to you by Mobiquity One, and Base64-encode the result.

**Node.js**

```js
import { createCipheriv } from "node:crypto";

// Issued by Mobiquity One. Keep them on the server.
const key = Buffer.from(process.env.MOBIQUITY_CHECKOUT_AES_KEY, "base64");
const iv = Buffer.from(process.env.MOBIQUITY_CHECKOUT_AES_IV, "base64");

export function encryptMerchantData(payload) {
  // Node's default padding is PKCS#7, which is what Java calls PKCS5Padding for AES.
  const cipher = createCipheriv(`aes-${key.length * 8}-cbc`, key, iv);
  return Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]).toString("base64");
}
```

**Java**

```java
Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(key, "AES"), new IvParameterSpec(iv));
String merchantData = Base64.getEncoder().encodeToString(cipher.doFinal(json.getBytes(StandardCharsets.UTF_8)));
```

**Python**

```python
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
import base64, json

def encrypt_merchant_data(payload, key, iv):
    padder = padding.PKCS7(128).padder()
    data = padder.update(json.dumps(payload).encode()) + padder.finalize()
    enc = Cipher(algorithms.AES(key), modes.CBC(iv)).encryptor()
    return base64.b64encode(enc.update(data) + enc.finalize()).decode()
```

> **Confirm with Mobiquity One:** the spec names the cipher but not the key size, how the key and IV are issued, or whether the output is Base64. The code above assumes Base64.

## 4. Load the checkout

Open `GET /mpg/web-checkout` in an iframe on your payment page, with these query parameters. URL-encode each value.

{{params op="GET /mpg/web-checkout" in="query"}}

```js
const url = new URL(`${MOBIQUITY_BASE_URL}/mpg/web-checkout`);
url.searchParams.set("orderId", order.id);
url.searchParams.set("hierLabelIdReference", process.env.MOBIQUITY_HIER_LABEL_ID);
url.searchParams.set("callbackurl", "https://yourstore.example/checkout/return");
url.searchParams.set("merchantData", encryptMerchantData(payload));
// Render on your page:
// <iframe src="${url}" title="Mobiquity One checkout" allow="payment" style="width:100%;height:720px;border:0"></iframe>
```

Build this URL on your **server**: the encryption key must never reach the browser.

## 5. Handle the result

- The customer is sent to your `merchantRedirectURL` (and `callbackurl`). Show a "checking your payment" page there.
- The final status arrives at your `primaryWebhookURL`. [Verify the checksum](/docs/webhooks#verify-the-checksum) and update the order.
- If the webhook hasn't arrived when the customer returns, call [Payment Enquiry](/docs/payment-status) by `orderId`.

## Still to confirm

The specification leaves these checkout details open. Agree them with the Mobiquity One team before you go live:

- How the checkout token is passed to `/mpg/web-checkout` (no authentication is declared on it).
- The hash algorithm for `tenant_oauth_hash`, or whether `client_id` + `client_secret` is the supported form.
- The AES key size, how the key and IV are issued and rotated, and the output encoding of `merchantData`.
- What `callbackurl` receives compared with `merchantRedirectURL`.
