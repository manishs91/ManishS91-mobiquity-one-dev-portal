import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { generate, LANGUAGES } from "../src/lib/openapi/codegen";
import { collectResponseCodes } from "../src/lib/openapi/codes";
import { normalizeSpec } from "../src/lib/openapi/normalize";
import { jsonMedia, listOperations, slugFor } from "../src/lib/openapi/operations";
import { mediaExamples, sampleFromSchema } from "../src/lib/openapi/sample";
import type { OpenAPISpec } from "../src/lib/openapi/types";

const raw = JSON.parse(readFileSync("openapi/mobiquity-one.json", "utf8")) as OpenAPISpec;
const { spec, fixes } = normalizeSpec(raw, { sandboxBaseUrl: "http://localhost:4010", productionBaseUrl: "https://api.example.com" });
const ops = listOperations(spec);

test("normalisation reports what it changed and never mutates the source", () => {
  assert.ok(fixes.some((f) => f.id === "info-version"));
  assert.equal(spec.components?.securitySchemes?.bearerAuth.type, "http");
  assert.equal(raw.components?.securitySchemes?.bearerAuth.type, undefined);
  assert.deepEqual(spec.servers?.map((s) => s.description), ["Sandbox", "Production"]);
});

test("every operation is assigned to a navigation group", () => {
  const ungrouped = ops.filter((o) => o.group.id === "other").map((o) => `${o.method} ${o.path}`);
  assert.deepEqual(ungrouped, []);
});

test("slugs are unique and URL-safe", () => {
  const slugs = ops.map((o) => o.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const s of slugs) assert.match(s, /^[a-z0-9-]+$/);
  assert.equal(slugFor("post", "/ecom/initiatePayment"), "post-ecom-initiate-payment");
});

test("every request body produces at least one example", () => {
  for (const o of ops) {
    if (!o.requestBody) continue;
    assert.ok(mediaExamples(spec, jsonMedia(o.requestBody)).length > 0, `${o.method} ${o.path} has no example`);
  }
});

test("initiate payment exposes one example per payment method variant", () => {
  const op = ops.find((o) => o.path === "/ecom/initiatePayment")!;
  const ex = mediaExamples(spec, jsonMedia(op.requestBody));
  assert.ok(ex.length >= 10);
  assert.ok(ex.some((e) => (e.value as Record<string, unknown>).method === "UPI"));
});

test("sampler handles recursion and type coercion", () => {
  const s: OpenAPISpec = {
    openapi: "3.0.3",
    info: { title: "t" },
    paths: {},
    components: { schemas: { Node: { type: "object", properties: { n: { type: "integer", example: "5" }, child: { $ref: "#/components/schemas/Node" } } } } },
  };
  assert.deepEqual(sampleFromSchema(s, { $ref: "#/components/schemas/Node" }), { n: 5 }); // recursive child is omitted, string example coerced to integer
});

test("code samples are generated for every language", () => {
  const req = { method: "POST", url: "https://x/ecom/refund", headers: { Authorization: "Bearer t" }, body: { a: "it's" } };
  for (const l of LANGUAGES) assert.ok(generate(l.id, req).includes("ecom/refund"), l.id);
  assert.ok(generate("curl", req).includes(`'\\''`), "single quotes escaped in curl");
  assert.ok(generate("python", { ...req, body: { ok: true, n: null } }).includes("True"));
});

test("response codes are collected from the spec", () => {
  const codes = collectResponseCodes(spec);
  assert.ok(codes.length > 50);
  assert.ok(codes.some((c) => c.code === "7703"));
});
