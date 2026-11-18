import { env } from "../env";
import { localProvider } from "./local";
import { mobiquityProvider } from "./mobiquity";
import type { CredentialsProvider } from "./types";

export function credentialsProvider(): CredentialsProvider {
  return env.CREDENTIALS_PROVIDER === "mobiquity" ? mobiquityProvider : localProvider;
}

export type { CredentialsProvider, IssuedCredentials } from "./types";
