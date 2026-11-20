import { deref, mergeAllOf, refName } from "./resolve";
import { humanize } from "./sample";
import { isRef, type OpenAPISpec, type Reference, type Schema } from "./types";

export interface ParamRow {
  /** Dotted path, e.g. "orderDetails.items[].sku". */
  name: string;
  depth: number;
  type: string;
  /** "yes" / "no" from the schema's required list or the spec's "(Mandatory)/(Optional)" wording. */
  required: "yes" | "no" | "conditional" | "unspecified";
  description: string;
  allowed?: string[];
  example?: string;
}

const MAX_DEPTH = 4;

function view(spec: OpenAPISpec, s: Schema | Reference | undefined): Schema | undefined {
  const d = s ? deref<Schema>(spec, s) : undefined;
  return d ? mergeAllOf(spec, d) : undefined;
}

function label(spec: OpenAPISpec, s: Schema | undefined): string {
  if (!s) return "any";
  if (s.oneOf || s.anyOf) return "object (one of)";
  const t = Array.isArray(s.type) ? s.type[0] : s.type;
  if (t === "array") {
    const item = view(spec, s.items);
    const it = item?.properties || item?.oneOf ? "objects" : label(spec, item) + "s";
    return `array of ${it}`;
  }
  if (t === "object" || s.properties) return "object";
  return s.format ? `${t ?? "any"} (${s.format})` : (t ?? "any");
}

function requiredness(parentRequired: Set<string>, key: string, description = ""): ParamRow["required"] {
  if (/\bconditional\b/i.test(description)) return "conditional";
  if (parentRequired.has(key) || /\(\s*mandatory\s*\)/i.test(description)) return "yes";
  if (/\(\s*optional\s*\)/i.test(description)) return "no";
  return "unspecified";
}

function clean(description = ""): string {
  return description
    .replace(/\s*\(\s*(mandatory|optional)\s*\)\s*/gi, " ")
    .replace(/\*\*\s*\*\*/g, " ") // "**Conditional** **Mandatory…**" → one run
    .replace(/\s+/g, " ")
    .trim();
}

function scalarExample(s: Schema | undefined): string | undefined {
  const ex = s?.example ?? (Array.isArray(s?.examples) ? s?.examples[0] : undefined);
  return ex === undefined || ex === null || typeof ex === "object" ? undefined : String(ex);
}

/**
 * Flatten one or more schemas into table rows. Several schemas are merged in order,
 * which is how a request is documented: common fields + one payment method's fields.
 * Nested objects and arrays of objects are expanded with dotted names.
 */
export function flattenParams(spec: OpenAPISpec, schemas: (Schema | Reference)[]): ParamRow[] {
  const rows: ParamRow[] = [];
  const seen = new Set<string>();

  const walk = (s: Schema, prefix: string, depth: number, stack: string[]) => {
    const req = new Set(s.required ?? []);
    for (const [key, raw] of Object.entries(s.properties ?? {})) {
      const name = `${prefix}${key}`;
      if (seen.has(name)) continue;
      seen.add(name);
      const ref = isRef(raw) ? raw.$ref : undefined;
      const p = view(spec, raw);
      let description = clean(p?.description);
      const variants = p?.oneOf ?? p?.anyOf;
      if (variants?.length) {
        const names = variants.map((v) => (isRef(v) ? humanize(refName(v.$ref)) : (v.title ?? "object")));
        description = `${description}${description ? " " : ""}One of: ${names.join(", ")}.`;
      }
      rows.push({
        name,
        depth,
        type: label(spec, p),
        required: requiredness(req, key, p?.description),
        description,
        allowed: p?.enum?.map(String),
        example: scalarExample(p),
      });
      if (!p || depth >= MAX_DEPTH || (ref && stack.includes(ref))) continue;
      const next = ref ? [...stack, ref] : stack;
      if (p.properties) walk(p, `${name}.`, depth + 1, next);
      else if ((Array.isArray(p.type) ? p.type[0] : p.type) === "array") {
        const item = view(spec, p.items);
        const itemRef = p.items && isRef(p.items) ? p.items.$ref : undefined;
        if (item?.properties && !(itemRef && stack.includes(itemRef))) walk(item, `${name}[].`, depth + 1, itemRef ? [...next, itemRef] : next);
      }
    }
  };

  for (const s of schemas) {
    const v = view(spec, s);
    if (v) walk(v, "", 0, isRef(s) ? [s.$ref] : []);
  }
  return rows;
}

/** Rows for an operation's query/path/header parameters (e.g. the hosted checkout URL). */
export function operationParamRows(params: { name: string; in: string; required?: boolean; description?: string; schema?: Schema | Reference; example?: unknown }[], spec: OpenAPISpec): ParamRow[] {
  return params.map((p) => {
    const s = view(spec, p.schema);
    return {
      name: p.name,
      depth: 0,
      type: label(spec, s),
      required: p.required ? "yes" : requiredness(new Set(), p.name, p.description),
      description: clean(p.description),
      allowed: s?.enum?.map(String),
      example: p.example !== undefined && typeof p.example !== "object" ? String(p.example) : scalarExample(s),
    };
  });
}

export function schemaRef(name: string): Reference {
  return { $ref: `#/components/schemas/${name}` };
}
