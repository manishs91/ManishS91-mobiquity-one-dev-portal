import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { env } from "../env";
import { normalizeSpec } from "./normalize";
import { groupOperations, listOperations } from "./operations";
import type { OpenAPISpec } from "./types";

/**
 * Loads the OpenAPI spec once per server process. To update the reference,
 * replace openapi/mobiquity-one.json (download it from Redocly) and redeploy.
 */
let cached: ReturnType<typeof build> | undefined;

function build() {
  const file = path.join(process.cwd(), "openapi", "mobiquity-one.json");
  const raw = JSON.parse(readFileSync(file, "utf8")) as OpenAPISpec;
  const { spec, fixes } = normalizeSpec(raw, {
    sandboxBaseUrl: env.SANDBOX_API_BASE_URL,
    productionBaseUrl: env.PRODUCTION_API_BASE_URL,
  });
  const operations = listOperations(spec);
  return {
    spec,
    fixes,
    operations,
    groups: groupOperations(operations),
    bySlug: new Map(operations.map((o) => [o.slug, o])),
  };
}

export function getApi() {
  if (!cached || process.env.NODE_ENV === "development") cached = build();
  return cached;
}
