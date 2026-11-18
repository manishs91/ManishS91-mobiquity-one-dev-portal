import "server-only";
import { decryptSecret, encryptSecret, randomId } from "../crypto";
import { env } from "../env";
import { HttpError } from "../http";
import { credentialsProvider } from "../providers";
import { audit, now, store, type CredentialSet, type Environment } from "../store";

const MAX_ACTIVE_PER_ENV = 5;

function encKey(): string {
  if (env.CREDENTIALS_ENCRYPTION_KEY) return env.CREDENTIALS_ENCRYPTION_KEY;
  if (env.isProd) throw new Error("CREDENTIALS_ENCRYPTION_KEY must be set in production.");
  return `${env.SESSION_SECRET}:credentials`; // dev fallback, derived via sha256
}

export interface PublicCredential {
  id: string;
  environment: Environment;
  label: string;
  tenantId: string;
  hierLabelIdReference: string;
  hierarchyCriteria: string;
  clientSecretPreview: string;
  status: CredentialSet["status"];
  createdAt: string;
  rotatedAt?: string;
  lastUsedAt?: string;
}

export function toPublic(c: CredentialSet): PublicCredential {
  return {
    id: c.id,
    environment: c.environment,
    label: c.label,
    tenantId: c.tenantId,
    hierLabelIdReference: c.hierLabelIdReference,
    hierarchyCriteria: c.hierarchyCriteria,
    clientSecretPreview: `sk_${c.environment === "sandbox" ? "test" : "live"}_…${c.clientSecretLast4}`,
    status: c.status,
    createdAt: c.createdAt,
    rotatedAt: c.rotatedAt,
    lastUsedAt: c.lastUsedAt,
  };
}

export function listCredentials(orgId: string, environment?: Environment): PublicCredential[] {
  return store.read((db) =>
    db.credentials
      .filter((c) => c.orgId === orgId && (!environment || c.environment === environment))
      .sort((a, b) => (a.status === b.status ? b.createdAt.localeCompare(a.createdAt) : a.status === "active" ? -1 : 1))
      .map(toPublic),
  );
}

/** Secrets returned here are shown to the user once and never again. */
export interface RevealedSecrets {
  credential: PublicCredential;
  clientSecret: string;
  checksumSalt: string;
}

export async function issueCredentials(input: { orgId: string; userId: string; environment: Environment; label: string }): Promise<RevealedSecrets> {
  const { org, contactEmail, activeCount } = store.read((db) => ({
    org: db.organizations.find((o) => o.id === input.orgId),
    contactEmail: db.users.find((u) => u.id === input.userId)?.email ?? "",
    activeCount: db.credentials.filter((c) => c.orgId === input.orgId && c.environment === input.environment && c.status === "active").length,
  }));
  if (!org) throw new HttpError(404, "Organisation not found.");
  if (input.environment === "production" && org.productionStatus !== "approved") {
    throw new HttpError(403, "Production access has not been approved yet. Submit a go-live request first.");
  }
  if (activeCount >= MAX_ACTIVE_PER_ENV) {
    throw new HttpError(422, `You can have up to ${MAX_ACTIVE_PER_ENV} active ${input.environment} credentials. Revoke one first.`);
  }

  const issued = await credentialsProvider().provision({
    orgId: org.id,
    orgName: org.name,
    environment: input.environment,
    contactEmail,
  });
  const key = encKey();
  const record: CredentialSet = {
    id: randomId("cred"),
    orgId: org.id,
    environment: input.environment,
    label: input.label.trim() || `${input.environment} key`,
    tenantId: issued.tenantId,
    hierLabelIdReference: issued.hierLabelIdReference,
    hierarchyCriteria: issued.hierarchyCriteria,
    clientSecretEnc: encryptSecret(issued.clientSecret, key),
    clientSecretLast4: issued.clientSecret.slice(-4),
    checksumSaltEnc: encryptSecret(issued.checksumSalt, key),
    status: "active",
    createdAt: now(),
    createdBy: input.userId,
  };
  await store.write((db) => {
    db.credentials.push(record);
    audit(db, { orgId: org.id, actorId: input.userId, action: "credentials.created", target: record.id });
  });
  return { credential: toPublic(record), clientSecret: issued.clientSecret, checksumSalt: issued.checksumSalt };
}

function getOwned(orgId: string, id: string): CredentialSet {
  const c = store.read((db) => db.credentials.find((x) => x.id === id && x.orgId === orgId));
  if (!c) throw new HttpError(404, "Credential not found.");
  return c;
}

export async function rotateSecret(orgId: string, userId: string, id: string): Promise<RevealedSecrets> {
  const c = getOwned(orgId, id);
  if (c.status !== "active") throw new HttpError(422, "Revoked credentials cannot be rotated.");
  const { clientSecret } = await credentialsProvider().rotateSecret(c.tenantId, c.environment);
  const key = encKey();
  const updated = await store.write((db) => {
    const rec = db.credentials.find((x) => x.id === id)!;
    rec.clientSecretEnc = encryptSecret(clientSecret, key);
    rec.clientSecretLast4 = clientSecret.slice(-4);
    rec.rotatedAt = now();
    audit(db, { orgId, actorId: userId, action: "credentials.rotated", target: id });
    return rec;
  });
  return { credential: toPublic(updated), clientSecret, checksumSalt: decryptSecret(updated.checksumSaltEnc, key) };
}

export async function revokeCredentials(orgId: string, userId: string, id: string) {
  const c = getOwned(orgId, id);
  if (c.status === "revoked") return toPublic(c);
  await credentialsProvider().revoke(c.tenantId, c.environment);
  const updated = await store.write((db) => {
    const rec = db.credentials.find((x) => x.id === id)!;
    rec.status = "revoked";
    rec.revokedAt = now();
    audit(db, { orgId, actorId: userId, action: "credentials.revoked", target: id });
    return rec;
  });
  return toPublic(updated);
}

/** Sandbox only: the salt is needed to compute checksums while testing. */
export function revealSandboxSalt(orgId: string, id: string): string {
  const c = getOwned(orgId, id);
  if (c.environment !== "sandbox") throw new HttpError(403, "Production salts are shown only once, at creation.");
  return decryptSecret(c.checksumSaltEnc, encKey());
}

/** Server-side use only (sandbox console). Never return these to the browser. */
export function loadSecrets(orgId: string, id: string) {
  const c = getOwned(orgId, id);
  if (c.status !== "active") throw new HttpError(422, "This credential has been revoked.");
  const key = encKey();
  return { record: c, clientSecret: decryptSecret(c.clientSecretEnc, key), checksumSalt: decryptSecret(c.checksumSaltEnc, key) };
}

export async function markUsed(id: string) {
  await store.write((db) => {
    const rec = db.credentials.find((x) => x.id === id);
    if (rec) rec.lastUsedAt = now();
  });
}
