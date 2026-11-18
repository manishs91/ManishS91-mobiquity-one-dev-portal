import { API_GROUPS, OTHER_GROUP, type ApiGroup } from "../../config/api-groups";
import { deref } from "./resolve";
import {
  HTTP_METHODS,
  type HttpMethod,
  type OpenAPISpec,
  type Operation,
  type Parameter,
  type RequestBody,
  type Response,
} from "./types";

export interface OperationEntry {
  slug: string;
  method: HttpMethod;
  path: string;
  summary: string;
  description?: string;
  operation: Operation;
  parameters: Parameter[];
  requestBody?: RequestBody;
  responses: { status: string; response: Response }[];
  requiresAuth: boolean;
  group: ApiGroup;
  deprecated: boolean;
}

export function slugFor(method: string, path: string): string {
  return `${method}-${path}`
    .replace(/[{}]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

export function groupFor(method: string, path: string): ApiGroup {
  const key = `${method.toUpperCase()} ${path}`;
  return API_GROUPS.find((g) => g.match.some((re) => re.test(key))) ?? OTHER_GROUP;
}

/** Flatten the spec into a list of operations with refs resolved one level. */
export function listOperations(spec: OpenAPISpec): OperationEntry[] {
  const out: OperationEntry[] = [];
  const globalSecurity = spec.security;
  for (const [path, item] of Object.entries(spec.paths ?? {})) {
    const shared = (item.parameters ?? []).map((p) => deref<Parameter>(spec, p)).filter(Boolean) as Parameter[];
    for (const method of HTTP_METHODS) {
      const op = item[method];
      if (!op) continue;
      const own = (op.parameters ?? []).map((p) => deref<Parameter>(spec, p)).filter((p): p is Parameter => !!p?.name);
      const byKey = new Map<string, Parameter>();
      for (const p of [...shared, ...own]) byKey.set(`${p.in}:${p.name}`, p);
      const security = op.security ?? globalSecurity;
      out.push({
        slug: slugFor(method, path),
        method,
        path,
        summary: (op.summary ?? `${method.toUpperCase()} ${path}`).replace(/\s+/g, " ").trim(),
        description: op.description,
        operation: op,
        parameters: [...byKey.values()],
        requestBody: op.requestBody ? deref<RequestBody>(spec, op.requestBody) : undefined,
        responses: Object.entries(op.responses ?? {})
          .map(([status, r]) => ({ status, response: deref<Response>(spec, r)! }))
          .filter((r) => !!r.response),
        requiresAuth: !!security?.some((req) => Object.keys(req).length > 0),
        group: groupFor(method, path),
        deprecated: !!op.deprecated,
      });
    }
  }
  return out;
}

export interface GroupedOperations {
  group: ApiGroup;
  operations: OperationEntry[];
}

export function groupOperations(ops: OperationEntry[], { includeHidden = false } = {}): GroupedOperations[] {
  const order = [...API_GROUPS, OTHER_GROUP];
  return order
    .filter((g) => includeHidden || g.visible)
    .map((group) => ({ group, operations: ops.filter((o) => o.group.id === group.id) }))
    .filter((g) => g.operations.length > 0);
}

export function jsonMedia(body: { content?: Record<string, import("./types").MediaType> } | undefined) {
  if (!body?.content) return undefined;
  return body.content["application/json"] ?? Object.values(body.content)[0];
}
