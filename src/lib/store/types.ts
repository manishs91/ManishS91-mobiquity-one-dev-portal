/**
 * Portal data model. Storage-agnostic: the file store implements it for local
 * development; implement `PortalStore` against Postgres/DynamoDB for production.
 */

export type Role = "owner" | "admin" | "developer";
export type Environment = "sandbox" | "production";

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface Membership {
  userId: string;
  orgId: string;
  role: Role;
}

export interface Organization {
  id: string;
  name: string;
  website?: string;
  country?: string;
  createdAt: string;
  productionStatus: "not_requested" | "pending" | "approved" | "rejected";
}

/**
 * The credential set a merchant needs to call Mobiquity One:
 * - tenantId + clientSecret  → POST /authorization/auth/oauth2/token (client_credentials)
 * - hierLabelIdReference + hierarchyCriteria → sent on payment requests
 * - checksumSalt → signs request checksums and verifies webhook checksums
 */
export interface CredentialSet {
  id: string;
  orgId: string;
  environment: Environment;
  label: string;
  tenantId: string;
  hierLabelIdReference: string;
  hierarchyCriteria: string;
  /** Encrypted at rest (AES-256-GCM). Shown to the user once on creation/rotation. */
  clientSecretEnc: string;
  clientSecretLast4: string;
  checksumSaltEnc: string;
  status: "active" | "revoked";
  createdAt: string;
  createdBy: string;
  rotatedAt?: string;
  revokedAt?: string;
  lastUsedAt?: string;
}

export interface WebhookEndpoint {
  id: string;
  orgId: string;
  environment: Environment;
  url: string;
  kind: "primary" | "fallback";
  description?: string;
  enabled: boolean;
  createdAt: string;
}

export interface WebhookDelivery {
  id: string;
  orgId: string;
  endpointId: string;
  url: string;
  event: string;
  requestBody: string;
  responseStatus?: number;
  responseBody?: string;
  durationMs?: number;
  error?: string;
  createdAt: string;
}

export interface ApiLogEntry {
  id: string;
  orgId: string;
  userId: string;
  environment: Environment;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  requestBody?: string;
  responseBody?: string;
  createdAt: string;
}

export interface GoLiveRequest {
  id: string;
  orgId: string;
  submittedBy: string;
  legalName: string;
  registrationNumber: string;
  website: string;
  businessCategory: string;
  expectedMonthlyVolume: string;
  paymentMethods: string[];
  integrationType: "s2s" | "hosted" | "both";
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  notes?: string;
  status: "pending" | "approved" | "rejected";
  reviewerNote?: string;
  reviewedBy?: string;
  createdAt: string;
  reviewedAt?: string;
}

export interface AuditEvent {
  id: string;
  orgId: string;
  actorId: string;
  action: string;
  target?: string;
  createdAt: string;
}

export interface Invite {
  id: string;
  orgId: string;
  email: string;
  role: Role;
  tokenHash: string;
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string;
}

export interface PortalDb {
  users: User[];
  memberships: Membership[];
  invites: Invite[];
  organizations: Organization[];
  credentials: CredentialSet[];
  webhooks: WebhookEndpoint[];
  deliveries: WebhookDelivery[];
  apiLogs: ApiLogEntry[];
  goLiveRequests: GoLiveRequest[];
  audit: AuditEvent[];
}

export function emptyDb(): PortalDb {
  return {
    users: [],
    memberships: [],
    invites: [],
    organizations: [],
    credentials: [],
    webhooks: [],
    deliveries: [],
    apiLogs: [],
    goLiveRequests: [],
    audit: [],
  };
}
