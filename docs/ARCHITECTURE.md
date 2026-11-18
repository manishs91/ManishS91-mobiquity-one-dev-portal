# Architecture

```
Browser ──> Next.js portal (App Router) ──────────────> Mobiquity One sandbox
              │  pages: /, /docs, /api-reference,          (or mock-server/)
              │         /dashboard/*, /login, /signup
              │  route handlers: /api/*
              ├─ lib/openapi    spec → operations, schemas, examples, code samples
              ├─ lib/checksum   checksum rules (verified against spec examples)
              ├─ lib/services   accounts, credentials, sandbox proxy, webhooks, go-live
              ├─ lib/providers  who issues credentials: local (mock) | mobiquity (admin API)
              └─ lib/store      persistence (JSON file today; swap for a database)
```

## Key decisions

**The spec is the source of truth.** The reference, the code samples, the console's example bodies, the error-code table and the mock's responses are all derived from `openapi/mobiquity-one.json` at runtime. `lib/openapi/normalize.ts` applies a few safe fixes for invalid parts of the spec and reports each one; the file itself is never modified.

**Secrets never reach the browser after creation.** Client secrets and checksum salts are encrypted at rest (AES-256-GCM) and shown once. The console runs server-side: the browser sends the operation slug and body; the portal fetches the token, adds headers and computes the checksum.

**The console can't be used as a proxy.** It only calls operations that exist in the spec, only against `SANDBOX_API_BASE_URL`, and only with an active sandbox credential owned by the caller's organisation.

**Webhook test URLs are checked.** HTTPS only, no embedded credentials, and the host must resolve to a public address (blocks probing internal networks). `localhost` is allowed in development.

## Security controls

| Control | Where |
| --- | --- |
| Passwords hashed with scrypt | `lib/crypto.ts` |
| HMAC-signed, httpOnly, SameSite=Lax session cookie, 12 h | `lib/auth/session.ts` |
| Same-origin check on every state-changing API call (CSRF) | `lib/http.ts` |
| Role checks: owner > admin > developer | `lib/http.ts` `requireApiSession` |
| Rate limits on sign-up, sign-in, console and webhook tests | `lib/rate-limit.ts` |
| Input validation with zod on every route | `app/api/**/route.ts` |
| Security headers (HSTS, frame-deny, nosniff, referrer policy) | `next.config.mjs` |
| Audit log of credential, webhook, team and go-live actions | `lib/store` `audit()` |
| Markdown rendering escapes raw HTML and unsafe link schemes | `components/Markdown.tsx` |

## Roles

| | Owner | Admin | Developer |
| --- | :-: | :-: | :-: |
| Use the console, read logs and docs | ✓ | ✓ | ✓ |
| Create, rotate and revoke credentials; see the sandbox salt | ✓ | ✓ | |
| Manage webhook URLs and invite teammates | ✓ | ✓ | |
| Submit the go-live request | ✓ | | |

Mobiquity One staff listed in `PORTAL_ADMIN_EMAILS` also see **Go-live reviews**.
