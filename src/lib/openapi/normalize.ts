import type { OpenAPISpec } from "./types";

export interface SpecFix {
  id: string;
  message: string;
}

/**
 * Apply small, safe corrections so the portal renders a valid spec while the
 * source spec is being fixed upstream. Each fix is reported (see /api-reference
 * footer and `npm run spec:lint`) so nothing is papered over silently.
 *
 * The original file in /openapi is never modified.
 */
export function normalizeSpec(input: OpenAPISpec, opts: { sandboxBaseUrl?: string; productionBaseUrl?: string } = {}) {
  const spec: OpenAPISpec = structuredClone(input);
  const fixes: SpecFix[] = [];

  if (!spec.info.version) {
    spec.info.version = "1.0.0";
    fixes.push({ id: "info-version", message: "info.version is missing (required by OpenAPI 3.0); defaulted to 1.0.0." });
  }

  for (const [name, scheme] of Object.entries(spec.components?.securitySchemes ?? {})) {
    if (!scheme.type && scheme.scheme) {
      scheme.type = "http";
      fixes.push({ id: `security-type-${name}`, message: `securitySchemes.${name} has no "type"; set to "http".` });
    }
  }

  const servers: { url: string; description?: string }[] = [];
  if (opts.sandboxBaseUrl) servers.push({ url: opts.sandboxBaseUrl.replace(/\/$/, ""), description: "Sandbox" });
  if (opts.productionBaseUrl) servers.push({ url: opts.productionBaseUrl.replace(/\/$/, ""), description: "Production" });
  if (servers.length) {
    const original = spec.servers?.map((s) => s.url).join(", ");
    spec.servers = servers;
    if (original) fixes.push({ id: "servers", message: `servers (${original}) replaced with portal-configured sandbox/production URLs.` });
  }

  // Header name drift: components.parameters uses X-Tenant-Id, operations use X-TenantId.
  // We keep what operations declare (that is what the gateway currently accepts) and just report it.
  const componentHeader = Object.values(spec.components?.parameters ?? {}).find((p) => p.in === "header" && /tenant/i.test(p.name));
  if (componentHeader && componentHeader.name !== "X-TenantId") {
    fixes.push({
      id: "tenant-header",
      message: `Tenant header is "${componentHeader.name}" in components.parameters but "X-TenantId" in operations. Confirm which the gateway expects.`,
    });
  }

  return { spec, fixes };
}
