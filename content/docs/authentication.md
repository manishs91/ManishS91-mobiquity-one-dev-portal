---
title: Authentication
section: Get started
order: 20
summary: Exchange your tenant ID and client secret for a bearer token, and keep it fresh.
---

# Authentication

Mobiquity One uses OAuth2-style bearer tokens. Your server exchanges its tenant ID and client secret for a short-lived access token and a longer-lived refresh token.

> Keep the client secret on your server. Never ship it in a mobile app or browser code.

## Get a token

`POST /authorization/auth/oauth2/token`

```json
{
  "grant_type": "client_credentials",
  "tenant_id": "1001",
  "client_secret": "merchant_secret"
}
```

```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "accessTokenExpiresAt": "2025-01-01T10:15:00.000+00:00",
  "refreshTokenExpiresAt": "2025-01-16T10:00:00.000+00:00",
  "oauthEnabled": true,
  "responseCode": "200",
  "responseMessage": "Token generated"
}
```

| Grant type | Use it for |
| --- | --- |
| `client_credentials` | Your server calling the merchant APIs. This is the one you need. |
| `webcheckout_credentials` | [Mobiquity One Checkout](/docs/checkout-integrate#1-get-a-checkout-token). Uses `tenant_oauth_hash`. |
| `user_credentials` | The Mobiquity One admin portal. Not for merchant integrations. |

## Use the token

```http
Authorization: Bearer <accessToken>
```

Some endpoints (offers, BNPL, mandates) also need the `X-TenantId` header, set to your business unit ID.

## Refresh before it expires

Cache the token and refresh it shortly before `accessTokenExpiresAt` rather than requesting a new one per call.

`POST /authorization/auth/oauth2/refreshToken`

```json
{ "grant_type": "refresh_token", "client_id": "1001", "refreshToken": "<refreshToken>" }
```

A simple pattern in Node.js:

```js
let cached; // { token, expiresAt }

export async function accessToken() {
  if (cached && cached.expiresAt - Date.now() > 60_000) return cached.token;
  const res = await fetch(`${BASE_URL}/authorization/auth/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ grant_type: "client_credentials", tenant_id: TENANT_ID, client_secret: CLIENT_SECRET }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Token request failed: ${data.responseMessage}`);
  cached = { token: data.accessToken, expiresAt: Date.parse(data.accessTokenExpiresAt) };
  return cached.token;
}
```

## Revoke

If a token may have leaked, revoke it with `POST /authorization/auth/oauth2/revokeToken` and `grant_type: revoke_token`. If the client secret leaked, rotate it from [API credentials](/dashboard/credentials). The old secret stops working immediately.

## Errors

| Code | Meaning | What to do |
| --- | --- | --- |
| `401` Invalid client_secret | Wrong secret, or it was rotated | Check the secret for this tenant |
| `9111` Invalid or Empty TenantId | Unknown or disabled tenant | Check `tenant_id`; sandbox and production tenants differ |
| `4471` Unauthorized Access | Missing, expired or revoked bearer token | Get a new token and retry once |
