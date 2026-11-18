import { z } from "zod";

/**
 * Typed, validated environment. Import `env` instead of reading process.env directly.
 * In production a missing SESSION_SECRET is a hard error; in development a throwaway
 * value is used so `npm run dev` works out of the box.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORTAL_BASE_URL: z.string().url().default("http://localhost:3000"),
  SESSION_SECRET: z.string().min(32).optional(),
  CREDENTIALS_ENCRYPTION_KEY: z.string().optional(),
  SANDBOX_API_BASE_URL: z.string().url().default("http://localhost:4010"),
  PRODUCTION_API_BASE_URL: z.string().url().default("https://api.mobiquity-one.com"),
  CREDENTIALS_PROVIDER: z.enum(["local", "mobiquity"]).default("local"),
  MOBIQUITY_ADMIN_API_URL: z.string().optional(),
  MOBIQUITY_ADMIN_TENANT_ID: z.string().optional(),
  MOBIQUITY_ADMIN_CLIENT_SECRET: z.string().optional(),
  MOCK_ADMIN_SECRET: z.string().default("dev-mock-admin-secret"),
  STORE_DRIVER: z.enum(["file"]).default("file"),
  STORE_FILE_PATH: z.string().default(".data/portal-db.json"),
  SIGNUP_POLICY: z.enum(["open", "allowlist"]).default("open"),
  SIGNUP_ALLOWED_DOMAINS: z.string().default(""),
  PORTAL_ADMIN_EMAILS: z.string().default(""),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid environment configuration:\n${parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n")}`);
}

const raw = parsed.data;
const isProd = raw.NODE_ENV === "production";
const isBuild = process.env.NEXT_PHASE === "phase-production-build";

if (isProd && !isBuild && !raw.SESSION_SECRET) {
  throw new Error("SESSION_SECRET must be set (32+ characters) in production.");
}

export const env = {
  ...raw,
  SESSION_SECRET: raw.SESSION_SECRET ?? "dev-only-insecure-session-secret-change-me-0000",
  isProd,
  adminEmails: raw.PORTAL_ADMIN_EMAILS.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean),
  allowedDomains: raw.SIGNUP_ALLOWED_DOMAINS.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean),
};
