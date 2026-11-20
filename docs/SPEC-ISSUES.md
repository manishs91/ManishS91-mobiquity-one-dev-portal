# Issues found in the Mobiquity One OpenAPI spec

From `npm run spec:lint` on the spec downloaded from Redocly (18 Nov 2026). The portal works around the first group at render time (`src/lib/openapi/normalize.ts`), but they should be fixed in the source spec.

## Fix before publishing the portal

| # | Issue | Where | Suggested fix |
| --- | --- | --- | --- |
| 1 | **A checksum salt value (`abcdefghhgfedcba`) is published** in field descriptions. Salts sign payments and authenticate webhooks, so a published salt lets anyone forge a valid webhook for any merchant using it. | `PaymentEnquiryRequest.checksum`, `PaymentEnquiryRequestOrderId.checksum`, `PaymentEnquiryRequestTransactionId.checksum`, `WebhookPaymentResponse.checksum` | Remove the value from the descriptions. Confirm no production merchant uses this salt. |
| 2 | "Fetch Merchant Payment Offers" is documented on `GET /authorization/auth/oauth2/revokeToken` | Checkout APIs | Copy-paste error: give it its real path. |
| 3 | Order enquiry example sends `transactionId` with `orderId: null`, but the endpoint looks up by `orderId` | `POST /ecom/payments/orderEnquiry` | Fix the example. |
| 4 | `securitySchemes.bearerAuth` has no `type` | components | Add `type: http`, `scheme: bearer`, `bearerFormat: JWT`. |
| 5 | `info.version` missing (required) | info | Add a version and bump it on each release. |
| 6 | `servers` points at `https://demo.payplus-comviva.com/` | servers | Publish the public sandbox and production base URLs. |

## Checkout integration gaps

Found while writing the Mobiquity One Checkout guide. Merchants can't complete a checkout integration from the spec alone.

| Issue | Detail |
| --- | --- |
| Checkout token contradicts itself | `WebCheckoutTokenRequest` requires `tenant_oauth_hash` ("hash of TenantId_ClientSecret"), but the `webCheckoutCredentials` example sends `client_id` + `client_secret`. The hash algorithm isn't stated. |
| Token use on `/mpg/web-checkout` | No security is declared, so it's unclear how the checkout token is passed. |
| `merchantData` encryption | AES/CBC/PKCS5Padding is named, but not the key size, how the key and IV are issued, or the output encoding. |
| `merchantData` carries `checksumSalt` | The order payload includes the merchant's salt. Confirm this is intended; it means the salt travels in every checkout URL (encrypted). |
| `callbackurl` vs `merchantRedirectURL` | What each receives isn't documented. |
| Request body on a GET | `/mpg/web-checkout` documents `MerchantDetailsRequest` as a request body on a GET; it's actually the pre-encryption shape of `merchantData`. |

## Worth fixing

| Issue | Detail |
| --- | --- |
| Webhook authenticity | Webhooks are authenticated only by `sha256(orderId + transactionId + referenceOrderId + salt)` in the body. Most fields (amount, status) aren't covered, and there's no timestamp, so replay isn't prevented. Consider an `X-Signature` header with HMAC-SHA256 over the raw body plus a timestamp. |
| Checksums use plain SHA-256, not HMAC | `sha256(fields + salt)` works, but HMAC-SHA256 with the salt as key is the standard construction. Worth considering for a v2. |
| Required fields only in prose | ~100 properties say "(Mandatory)" in the description but aren't in `required`, so SDK generators and validators can't enforce them. The portal reads the prose as a workaround. |
| Tenant header name | `X-TenantId` on most operations, `X-Tenant-Id` on the checkout offer endpoints. Confirm which the gateway accepts. |
| No security on Mandate APIs | `/mandates/*` declare no `security`. Confirm they're really unauthenticated. |
| Missing operationIds | 11 operations have none; `webhook api` contains a space. |
| Example types | 93 examples don't match their declared type (e.g. `status: string` with example `200`). |
| Inconsistent response envelopes | Most endpoints use `responseCode`/`responseMessage`; order enquiry uses `statusCode`/`message`/`data`. Error examples often carry `status: "200", message: "SUCCESS"` at the top level while the HTTP status is 400. |
| Empty 404 responses | 19 operations document a 404 with no body. |
| Unused schemas | 13 schemas are never referenced. |
| No tag descriptions | Tags have no top-level descriptions. |
| Summary whitespace | `Resend    OTP`. |
