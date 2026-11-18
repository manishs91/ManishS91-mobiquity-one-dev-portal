import type { Environment } from "../store/types";

/**
 * Issues Mobiquity One credentials for a developer organisation.
 *
 * The portal never invents what Mobiquity One must recognise: in `local` mode it
 * registers generated credentials with the mock sandbox; in `mobiquity` mode it
 * asks the Mobiquity One onboarding/admin API to create a tenant and return them.
 */
export interface IssuedCredentials {
  tenantId: string;
  clientSecret: string;
  checksumSalt: string;
  hierLabelIdReference: string;
  hierarchyCriteria: string;
}

export interface ProvisionInput {
  orgId: string;
  orgName: string;
  environment: Environment;
  contactEmail: string;
}

export interface CredentialsProvider {
  readonly name: string;
  provision(input: ProvisionInput): Promise<IssuedCredentials>;
  rotateSecret(tenantId: string, environment: Environment): Promise<{ clientSecret: string }>;
  revoke(tenantId: string, environment: Environment): Promise<void>;
}
