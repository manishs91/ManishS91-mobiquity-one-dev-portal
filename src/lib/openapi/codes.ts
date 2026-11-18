import type { OpenAPISpec, Schema } from "./types";

export interface ResponseCode {
  code: string;
  messages: string[];
  schemas: string[];
}

/**
 * Collect every documented responseCode/responseMessage pair from the spec's
 * example response schemas, so the error reference never drifts from the spec.
 */
export function collectResponseCodes(spec: OpenAPISpec): ResponseCode[] {
  const map = new Map<string, ResponseCode>();
  for (const [name, schema] of Object.entries(spec.components?.schemas ?? {})) {
    const props = (schema as Schema).properties ?? {};
    const code = (props.responseCode as Schema | undefined)?.example;
    if (code === undefined || code === null) continue;
    const msg = (props.responseMessage as Schema | undefined)?.example;
    const key = String(code).trim();
    const entry = map.get(key) ?? { code: key, messages: [], schemas: [] };
    const m = msg === undefined ? "" : String(msg).trim();
    if (m && !entry.messages.includes(m)) entry.messages.push(m);
    entry.schemas.push(name);
    map.set(key, entry);
  }
  return [...map.values()].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
}

export function codeCategory(code: string): string {
  if (/^0+$/.test(code)) return "Success";
  if (/^(200|201)$/.test(code)) return "Success";
  if (code === "401" || code === "9111" || code === "4471") return "Authentication";
  if (code === "7703" || code === "4414") return "Checksum";
  if (code === "7000") return "Pending";
  if (/^44(0|1|2|3|5)\d$/.test(code)) return "Validation";
  if (/^44[6-8]\d$/.test(code)) return "Pay later / credit";
  if (/^40[0-4]\d$/.test(code)) return "Mandates";
  if (/^45/.test(code)) return "Offers";
  return "Processing";
}
