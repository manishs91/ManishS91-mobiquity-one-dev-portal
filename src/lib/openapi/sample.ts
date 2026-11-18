import { deref, mergeAllOf } from "./resolve";
import { isRef, type MediaType, type OpenAPISpec, type Reference, type Schema } from "./types";

const MAX_DEPTH = 8;

/**
 * Build an example value from a schema, preferring author-provided examples.
 * Order: example -> examples[0] -> default -> enum[0] -> type-based placeholder.
 * oneOf/anyOf pick the first branch unless `branch` is given at the top level.
 */
export function sampleFromSchema(
  spec: OpenAPISpec,
  schema: Schema | Reference | undefined,
  opts: { branch?: number; includeReadOnly?: boolean } = {},
  depth = 0,
  stack: string[] = [],
): unknown {
  if (!schema || depth > MAX_DEPTH) return undefined;

  if (isRef(schema)) {
    if (stack.includes(schema.$ref)) return undefined; // recursive type
    const target = deref<Schema>(spec, schema);
    return sampleFromSchema(spec, target, opts, depth, [...stack, schema.$ref]);
  }

  const s = mergeAllOf(spec, schema);

  if (s.example !== undefined) return coerce(s, s.example);
  if (Array.isArray(s.examples) && s.examples.length) return coerce(s, s.examples[0]);
  if (s.default !== undefined) return s.default;
  if (s.enum?.length) return s.enum[0];

  const variants = s.oneOf ?? s.anyOf;
  if (variants?.length) {
    const idx = depth === 0 && opts.branch !== undefined ? Math.min(opts.branch, variants.length - 1) : 0;
    const base = s.properties ? (sampleObject(spec, s, opts, depth, stack) as Record<string, unknown>) : undefined;
    const picked = sampleFromSchema(spec, variants[idx], { ...opts, branch: undefined }, depth + 1, stack);
    return base && isPlainObject(picked) ? { ...base, ...picked } : (picked ?? base);
  }

  const type = Array.isArray(s.type) ? s.type[0] : s.type;
  if (type === "object" || (!type && s.properties)) return sampleObject(spec, s, opts, depth, stack);
  if (type === "array") {
    const item = sampleFromSchema(spec, s.items, opts, depth + 1, stack);
    return item === undefined ? [] : [item];
  }
  return primitive(s, type);
}

function sampleObject(spec: OpenAPISpec, s: Schema, opts: { includeReadOnly?: boolean }, depth: number, stack: string[]) {
  const out: Record<string, unknown> = {};
  for (const [key, prop] of Object.entries(s.properties ?? {})) {
    const p = isRef(prop) ? undefined : prop;
    if (p?.readOnly && !opts.includeReadOnly) continue;
    const v = sampleFromSchema(spec, prop, opts, depth + 1, stack);
    if (v !== undefined) out[key] = v;
  }
  return out;
}

/** Spec examples are often strings where the type says number (or vice versa) — keep the declared type. */
function coerce(s: Schema, value: unknown): unknown {
  const type = Array.isArray(s.type) ? s.type[0] : s.type;
  if (type === "string" && (typeof value === "number" || typeof value === "boolean")) return String(value);
  if ((type === "integer" || type === "number") && typeof value === "string" && value.trim() !== "" && !isNaN(Number(value)))
    return Number(value);
  if (type === "boolean" && (value === "true" || value === "false")) return value === "true";
  return value;
}

function primitive(s: Schema, type: string | undefined): unknown {
  switch (type) {
    case "string":
      switch (s.format) {
        case "date-time":
          return "2026-01-01T10:00:00.000Z";
        case "date":
          return "2026-01-01";
        case "email":
          return "dev@example.com";
        case "uri":
        case "url":
          return "https://merchant.example.com/callback";
        case "uuid":
          return "3fa85f64-5717-4562-b3fc-2c963f66afa6";
        default:
          return "string";
      }
    case "integer":
      return 0;
    case "number":
      return 0;
    case "boolean":
      return true;
    default:
      return undefined;
  }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export interface NamedExample {
  key: string;
  label: string;
  value: unknown;
}

/**
 * All examples for a media type: named `examples` from the spec first, then one per
 * oneOf branch (labelled with the branch title / ref name), then a generated fallback.
 */
export function mediaExamples(spec: OpenAPISpec, media: MediaType | undefined): NamedExample[] {
  if (!media) return [];
  const out: NamedExample[] = [];
  if (media.examples) {
    for (const [key, ex] of Object.entries(media.examples)) {
      const e = deref(spec, ex);
      if (e && e.value !== undefined) out.push({ key, label: e.summary ?? key, value: e.value });
    }
  }
  if (!out.length && media.example !== undefined) out.push({ key: "example", label: "Example", value: media.example });
  if (out.length) return out;

  const root = media.schema ? deref<Schema>(spec, media.schema) : undefined;
  const variants = root ? (mergeAllOf(spec, root).oneOf ?? mergeAllOf(spec, root).anyOf) : undefined;
  if (variants && variants.length > 1) {
    variants.forEach((v, i) => {
      const label = isRef(v) ? v.$ref.split("/").pop()! : (v.title ?? `Option ${i + 1}`);
      out.push({ key: `variant-${i}`, label: humanize(label), value: sampleFromSchema(spec, media.schema, { branch: i }) });
    });
    return out;
  }
  const value = sampleFromSchema(spec, media.schema);
  return value === undefined ? [] : [{ key: "generated", label: "Example", value }];
}

export function humanize(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
