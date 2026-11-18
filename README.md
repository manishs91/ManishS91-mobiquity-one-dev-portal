# Mobiquity One Developer Portal

A self-serve developer portal for the Mobiquity One payment orchestration platform: guides, an API reference generated from the OpenAPI spec, a sandbox console that signs requests for you, and a dashboard where developers manage credentials, webhooks and their go-live request.

## What's in it

| Area | What developers can do |
| --- | --- |
| **Guides** (`/docs`) | Quickstart, authentication, checksums, testing, payments, hosted checkout, saved methods, offers, webhooks, status, refunds, going live, response codes |
| **API reference** (`/api-reference`) | Every endpoint in `openapi/mobiquity-one.json`, grouped by task, with field docs, examples for each payment method and code in cURL, Node.js, Python, Java and PHP |
| **Try it console** | Send any request to the sandbox. The portal adds the bearer token, tenant header, the developer's business unit ID, a fresh order ID and the checksum, all server-side |
| **Self-serve sign-up** | Instant sandbox credentials (tenant ID, client secret, checksum salt, business unit ID), shown once |
| **Dashboard** | Create, rotate and revoke credentials; save webhook URLs and send signed test events; request logs; checksum tool; team invites with roles; integration checklist |
| **Go live** | Readiness checklist, business details form, and a review queue for Mobiquity One staff |
| **Mock sandbox** (`mock-server/`) | Local stand-in for the Mobiquity One APIs: OAuth2, payments with validation and checksum checks, OTP, enquiry, refunds and webhooks, with deterministic test outcomes |

## Run it locally

Requires Node.js 20.11 or later.

```bash
npm install
cp .env.example .env.local      # set SESSION_SECRET (32+ chars)
npm run mock                    # terminal 1: mock sandbox on http://localhost:4010
npm run dev                     # terminal 2: portal on http://localhost:3000
```

Open http://localhost:3000, sign up, and you'll get sandbox credentials registered with the mock. Then open **API reference → Payments → Initiate Payment** and press **Send**.

Or run both with Docker:

```bash
cp .env.example .env            # set SESSION_SECRET and CREDENTIALS_ENCRYPTION_KEY
docker compose up --build
```

## Checks

```bash
npm run typecheck   # TypeScript
npm test            # unit tests + mock-server integration tests
npm run spec:lint   # problems in the OpenAPI spec (see docs/SPEC-ISSUES.md)
npm run build       # production build
```

After your first `npm install`, commit `package-lock.json` and switch CI to `npm ci`.

## Updating the API reference

1. Download the spec from Redocly (**Download** button).
2. Replace `openapi/mobiquity-one.json`.
3. Run `npm run spec:lint` and `npm test`. A test fails if a new endpoint isn't assigned to a navigation group in `src/config/api-groups.ts`.

BNPL and Mandate endpoints are in the spec but hidden from the reference for the payment-orchestration launch. Set `visible: true` for `bnpl` and `mandates` in `src/config/api-groups.ts` to publish them.

## Connecting to the real Mobiquity One sandbox

| Setting | Local mock | Mobiquity One sandbox |
| --- | --- | --- |
| `SANDBOX_API_BASE_URL` | `http://localhost:4010` | your sandbox host |
| `CREDENTIALS_PROVIDER` | `local` | `mobiquity` |
| `MOBIQUITY_ADMIN_*` | unused | admin tenant and secret |

With `CREDENTIALS_PROVIDER=mobiquity`, sign-up and the credentials page call the Mobiquity One onboarding API through `src/lib/providers/mobiquity.ts`. **That API isn't in the public spec**, so the three routes there are placeholders marked `TODO(endpoint)`. Fill them in once the onboarding endpoints are confirmed.

## Before production

- [ ] Replace the file store (`src/lib/store/file-store.ts`) with a database. It's single-instance only.
- [ ] Set `SESSION_SECRET` and `CREDENTIALS_ENCRYPTION_KEY` from a secrets manager.
- [ ] Wire `src/lib/providers/mobiquity.ts` to the onboarding API.
- [ ] Move rate limits (`src/lib/rate-limit.ts`) to Redis or the API gateway if you run several replicas.
- [ ] Add email delivery for team invites and go-live notifications (invites currently give a copyable link).
- [ ] Replace the placeholder legal pages (`/legal/terms`, `/legal/privacy`).
- [ ] Set the real support email and status page in `src/config/site.ts`.
- [ ] Fix the spec issues in `docs/SPEC-ISSUES.md`, especially the published salt.

See `docs/ARCHITECTURE.md` for how the pieces fit together.
