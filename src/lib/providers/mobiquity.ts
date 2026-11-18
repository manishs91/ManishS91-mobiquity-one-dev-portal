import { env } from "../env";
import type { CredentialsProvider, IssuedCredentials, ProvisionInput } from "./types";

/**
 * Mobiquity One onboarding integration — TO BE WIRED.
 *
 * The public OpenAPI spec does not include merchant onboarding / tenant management
 * endpoints, so this adapter defines the contract the portal needs and calls
 * placeholder routes. Replace the three `TODO(endpoint)` paths and field mappings
 * once the Mobiquity One admin API is confirmed. Everything else in the portal
 * (UI, storage, encryption, audit log) works unchanged.
 *
 * Auth: the portal itself authenticates with grant_type=user_credentials
 * (Admin Portal) using MOBIQUITY_ADMIN_TENANT_ID / MOBIQUITY_ADMIN_CLIENT_SECRET.
 */

let adminToken: { value: string; expiresAt: number } | undefined;

async function getAdminToken(): Promise<string> {
  if (adminToken && adminToken.expiresAt - 60_000 > Date.now()) return adminToken.value;
  const base = requireBase();
  const res = await fetch(`${base}/authorization/auth/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "user_credentials",
      tenant_id: env.MOBIQUITY_ADMIN_TENANT_ID,
      client_secret: env.MOBIQUITY_ADMIN_CLIENT_SECRET,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const data = (await res.json().catch(() => ({}))) as { accessToken?: string; accessTokenExpiresAt?: string; responseMessage?: string };
  if (!res.ok || !data.accessToken) throw new Error(`Admin token request failed: ${data.responseMessage ?? res.status}`);
  adminToken = { value: data.accessToken, expiresAt: Date.parse(data.accessTokenExpiresAt ?? "") || Date.now() + 10 * 60_000 };
  return adminToken.value;
}

function requireBase() {
  if (!env.MOBIQUITY_ADMIN_API_URL) throw new Error("MOBIQUITY_ADMIN_API_URL is not configured.");
  return env.MOBIQUITY_ADMIN_API_URL.replace(/\/$/, "");
}

async function adminRequest<T>(pathname: string, body: unknown): Promise<T> {
  const res = await fetch(`${requireBase()}${pathname}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${await getAdminToken()}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await res.json().catch(() => ({}))) as T & { responseMessage?: string };
  if (!res.ok) throw new Error(`Mobiquity One admin API ${pathname} failed: ${data.responseMessage ?? res.status}`);
  return data;
}

export const mobiquityProvider: CredentialsProvider = {
  name: "mobiquity",

  async provision(input: ProvisionInput): Promise<IssuedCredentials> {
    // TODO(endpoint): confirm route and payload for creating a merchant tenant.
    const data = await adminRequest<Partial<IssuedCredentials>>("/admin/merchants/onboard", {
      merchantName: input.orgName,
      environment: input.environment,
      contactEmail: input.contactEmail,
      externalReference: input.orgId,
    });
    if (!data.tenantId || !data.clientSecret || !data.checksumSalt || !data.hierLabelIdReference) {
      throw new Error("Mobiquity One admin API returned incomplete credentials.");
    }
    return {
      tenantId: data.tenantId,
      clientSecret: data.clientSecret,
      checksumSalt: data.checksumSalt,
      hierLabelIdReference: data.hierLabelIdReference,
      hierarchyCriteria: data.hierarchyCriteria ?? "B2",
    };
  },

  async rotateSecret(tenantId, environment) {
    // TODO(endpoint): confirm route for rotating a merchant client secret.
    return adminRequest<{ clientSecret: string }>("/admin/merchants/rotate-secret", { tenantId, environment });
  },

  async revoke(tenantId, environment) {
    // TODO(endpoint): confirm route for disabling merchant API access.
    await adminRequest("/admin/merchants/revoke", { tenantId, environment });
  },
};
