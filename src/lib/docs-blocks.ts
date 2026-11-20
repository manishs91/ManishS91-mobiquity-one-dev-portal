import { flattenParams, operationParamRows, schemaRef, type ParamRow } from "./openapi/flatten";
import { jsonMedia, type OperationEntry } from "./openapi/operations";
import { mediaExamples, sampleFromSchema } from "./openapi/sample";
import type { OpenAPISpec } from "./openapi/types";

/** Resolves {{params}} and {{example}} blocks against the spec. Pure, so tests can check every guide. */

export function resolveParams(spec: OpenAPISpec, attrs: Record<string, string>, operations: OperationEntry[] = []): { rows: ParamRow[] } | { error: string } {
  if (attrs.op) {
    const [method, path] = attrs.op.split(/\s+/);
    const op = operations.find((o) => o.method === method?.toLowerCase() && o.path === path);
    if (!op) return { error: `Unknown operation: ${attrs.op}` };
    const where = attrs.in ?? "query";
    const params = op.parameters.filter((p) => p.in === where);
    if (!params.length) return { error: `${attrs.op} has no ${where} parameters` };
    return { rows: operationParamRows(params, spec) };
  }
  const names = (attrs.schema ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!names.length) return { error: 'params needs schema="Name"' };
  const missing = names.filter((n) => !spec.components?.schemas?.[n]);
  if (missing.length) return { error: `Unknown schema: ${missing.join(", ")}` };
  const rows = flattenParams(spec, names.map(schemaRef));
  const omit = new Set((attrs.omit ?? "").split(",").map((s) => s.trim()).filter(Boolean));
  return { rows: rows.filter((r) => !omit.has(r.name.split(/[.[]/)[0])) };
}

export function resolveExample(spec: OpenAPISpec, operations: OperationEntry[], attrs: Record<string, string>): { value: unknown } | { error: string } {
  if (attrs.schema) {
    if (!spec.components?.schemas?.[attrs.schema]) return { error: `Unknown schema: ${attrs.schema}` };
    const value = sampleFromSchema(spec, schemaRef(attrs.schema));
    return value === undefined ? { error: `No example for ${attrs.schema}` } : { value };
  }
  const [method, path] = (attrs.op ?? "").split(/\s+/);
  const op = operations.find((o) => o.method === method?.toLowerCase() && o.path === path);
  if (!op) return { error: `Unknown operation: ${attrs.op}` };
  const media = attrs.status
    ? jsonMedia(op.responses.find((r) => r.status === attrs.status)?.response)
    : jsonMedia(op.requestBody);
  const examples = mediaExamples(spec, media);
  const pick = attrs.variant ? examples.find((e) => e.ref === attrs.variant || e.key === attrs.variant) : examples[0];
  if (!pick) return { error: `No example ${attrs.variant ?? ""} for ${attrs.op}${attrs.status ? ` ${attrs.status}` : ""}` };
  return { value: pick.value };
}
