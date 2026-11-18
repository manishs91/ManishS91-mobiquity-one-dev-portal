import { env } from "../env";
import { randomDigits, randomSecret } from "../crypto";
import type { CredentialsProvider, IssuedCredentials, ProvisionInput } from "./types";

/**
 * Development provider: generates credentials in the portal and registers them
 * with the mock sandbox (mock-server/server.mjs) so the "Try it" console works
 * end to end. Production credentials are never issued in this mode.
 */
export async function adminCall(pathname: string, body: unknown) {
  const res = await fetch(`${env.SANDBOX_API_BASE_URL.replace(/\/$/, "")}${pathname}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Mock-Admin-Secret": env.MOCK_ADMIN_SECRET },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Mock sandbox rejected ${pathname}: HTTP ${res.status}`);
}

async function safeAdminCall(pathname: string, body: unknown) {
  try {
    await adminCall(pathname, body);
  } catch (err) {
    // Credentials are still stored in the portal. The sandbox console re-registers
    // them with the mock on first use (see services/sandbox.ts), so just log here.
    console.warn(`[credentials:local] ${(err as Error).message}. Is the mock sandbox running (npm run mock)?`);
  }
}

export const localProvider: CredentialsProvider = {
  name: "local",

  async provision(input: ProvisionInput): Promise<IssuedCredentials> {
    if (input.environment === "production") {
      throw new Error("Production credentials cannot be issued by the local provider. Set CREDENTIALS_PROVIDER=mobiquity.");
    }
    const creds: IssuedCredentials = {
      tenantId: `9${randomDigits(5)}`,
      clientSecret: `sk_test_${randomSecret(24)}`,
      checksumSalt: randomSecret(12),
      hierLabelIdReference: `7${randomDigits(17)}`,
      hierarchyCriteria: "B2",
    };
    await safeAdminCall("/__admin/tenants", { ...creds, orgName: input.orgName });
    return creds;
  },

  async rotateSecret(tenantId) {
    const clientSecret = `sk_test_${randomSecret(24)}`;
    await safeAdminCall("/__admin/tenants/rotate", { tenantId, clientSecret });
    return { clientSecret };
  },

  async revoke(tenantId) {
    await safeAdminCall("/__admin/tenants/revoke", { tenantId });
  },
};
