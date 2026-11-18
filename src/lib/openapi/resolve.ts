import { isRef, type OpenAPISpec, type Reference, type Schema } from "./types";

/**
 * Resolve a local JSON pointer ("#/components/schemas/Foo") against the spec.
 * External refs are not supported — the Mobiquity One spec is a single bundled file.
 */
export function resolvePointer<T = unknown>(spec: OpenAPISpec, ref: string): T | undefined {
  if (!ref.startsWith("#/")) return undefined;
  const parts = ref
    .slice(2)
    .split("/")
    .map((p) => p.replace(/~1/g, "/").replace(/~0/g, "~"));
  let cur: unknown = spec;
  for (const part of parts) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur as T | undefined;
}

/** Follow $ref chains (A -> B -> C) until a concrete object is reached. */
export function deref<T>(spec: OpenAPISpec, value: T | Reference, seen = new Set<string>()): T | undefined {
  let cur: unknown = value;
  while (isRef(cur)) {
    if (seen.has(cur.$ref)) return undefined; // cyclic alias
    seen.add(cur.$ref);
    cur = resolvePointer(spec, cur.$ref);
  }
  return cur as T | undefined;
}

export function refName(ref: string): string {
  return ref.split("/").pop() ?? ref;
}

/**
 * Shallow-merge an allOf list into one schema. Nested refs stay as refs so that
 * renderers can expand lazily and cycles stay finite.
 */
export function mergeAllOf(spec: OpenAPISpec, schema: Schema): Schema {
  if (!schema.allOf?.length) return schema;
  const { allOf, ...rest } = schema;
  const merged: Schema = { ...rest, properties: { ...(rest.properties ?? {}) }, required: [...(rest.required ?? [])] };
  for (const part of allOf) {
    const s = deref<Schema>(spec, part);
    if (!s) continue;
    const flat = mergeAllOf(spec, s);
    merged.type ??= flat.type;
    merged.description ??= flat.description;
    Object.assign(merged.properties!, flat.properties ?? {});
    merged.required!.push(...(flat.required ?? []));
  }
  merged.required = [...new Set(merged.required)];
  if (!Object.keys(merged.properties!).length) delete merged.properties;
  if (!merged.required.length) delete merged.required;
  return merged;
}

/** Deref + allOf merge — the "view" of a schema that renderers work with. */
export function viewSchema(spec: OpenAPISpec, schema: Schema | Reference | undefined): Schema | undefined {
  if (!schema) return undefined;
  const s = deref<Schema>(spec, schema);
  return s ? mergeAllOf(spec, s) : undefined;
}

/** Human-readable type label, e.g. "string (date-time)", "array<PaymentResponse>". */
export function typeLabel(spec: OpenAPISpec, schema: Schema | Reference | undefined): string {
  if (!schema) return "any";
  if (isRef(schema)) {
    const target = deref<Schema>(spec, schema);
    const name = refName(schema.$ref);
    if (target?.type === "array") return `array<${typeLabel(spec, target.items)}>`;
    if (target && target.type && target.type !== "object" && !target.properties) return typeLabel(spec, target);
    return name;
  }
  if (schema.oneOf) return "oneOf";
  if (schema.anyOf) return "anyOf";
  const t = Array.isArray(schema.type) ? schema.type.join(" | ") : schema.type;
  if (t === "array") return `array<${typeLabel(spec, schema.items)}>`;
  if (!t && schema.properties) return "object";
  return schema.format ? `${t ?? "any"} (${schema.format})` : (t ?? "any");
}
