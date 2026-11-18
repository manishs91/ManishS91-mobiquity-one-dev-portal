/**
 * Minimal OpenAPI 3.0 typings — only what the portal reads.
 * Kept local so the reference renderer has no runtime dependency on a spec library.
 */

export type HttpMethod = "get" | "post" | "put" | "patch" | "delete";
export const HTTP_METHODS: HttpMethod[] = ["get", "post", "put", "patch", "delete"];

export interface Reference {
  $ref: string;
}

export interface Schema {
  type?: string | string[];
  format?: string;
  title?: string;
  description?: string;
  properties?: Record<string, Schema | Reference>;
  required?: string[];
  items?: Schema | Reference;
  additionalProperties?: boolean | Schema | Reference;
  enum?: unknown[];
  example?: unknown;
  examples?: unknown[];
  default?: unknown;
  nullable?: boolean;
  deprecated?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
  oneOf?: (Schema | Reference)[];
  anyOf?: (Schema | Reference)[];
  allOf?: (Schema | Reference)[];
  discriminator?: { propertyName: string; mapping?: Record<string, string> };
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  pattern?: string;
}

export interface ExampleObject {
  summary?: string;
  description?: string;
  value?: unknown;
}

export interface MediaType {
  schema?: Schema | Reference;
  example?: unknown;
  examples?: Record<string, ExampleObject | Reference>;
}

export interface Parameter {
  name: string;
  in: "query" | "header" | "path" | "cookie";
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  schema?: Schema | Reference;
  example?: unknown;
}

export interface RequestBody {
  description?: string;
  required?: boolean;
  content?: Record<string, MediaType>;
}

export interface Response {
  description?: string;
  content?: Record<string, MediaType>;
  headers?: Record<string, unknown>;
}

export interface Operation {
  tags?: string[];
  summary?: string;
  description?: string;
  operationId?: string;
  parameters?: (Parameter | Reference)[];
  requestBody?: RequestBody | Reference;
  responses?: Record<string, Response | Reference>;
  security?: Record<string, string[]>[];
  deprecated?: boolean;
}

export type PathItem = Partial<Record<HttpMethod, Operation>> & {
  parameters?: (Parameter | Reference)[];
};

export interface SecurityScheme {
  type?: string;
  scheme?: string;
  bearerFormat?: string;
  description?: string;
  name?: string;
  in?: string;
}

export interface OpenAPISpec {
  openapi: string;
  info: { title: string; version?: string; description?: string };
  servers?: { url: string; description?: string }[];
  paths: Record<string, PathItem>;
  components?: {
    schemas?: Record<string, Schema>;
    parameters?: Record<string, Parameter>;
    securitySchemes?: Record<string, SecurityScheme>;
    requestBodies?: Record<string, RequestBody>;
    responses?: Record<string, Response>;
    examples?: Record<string, ExampleObject>;
  };
  security?: Record<string, string[]>[];
  tags?: { name: string; description?: string }[];
}

export function isRef(x: unknown): x is Reference {
  return typeof x === "object" && x !== null && typeof (x as Reference).$ref === "string";
}
