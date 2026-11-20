import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { resolveExample, resolveParams } from "../src/lib/docs-blocks";
import { splitDirectives } from "../src/lib/docs-directives";
import { flattenParams, schemaRef } from "../src/lib/openapi/flatten";
import { normalizeSpec } from "../src/lib/openapi/normalize";
import { listOperations } from "../src/lib/openapi/operations";
import type { OpenAPISpec } from "../src/lib/openapi/types";

const { spec } = normalizeSpec(JSON.parse(readFileSync("openapi/mobiquity-one.json", "utf8")) as OpenAPISpec);
const operations = listOperations(spec);
const docs = readdirSync("content/docs").filter((f) => f.endsWith(".md"));
const slugs = new Set(docs.map((f) => f.replace(/\.md$/, "")));
const visibleOps = new Set(operations.filter((o) => o.group.visible).map((o) => o.slug));

test("every {{params}} and {{example}} block in the guides resolves against the spec", () => {
  const failures: string[] = [];
  for (const f of docs) {
    for (const seg of splitDirectives(readFileSync(`content/docs/${f}`, "utf8"))) {
      if (seg.kind === "markdown") continue;
      const r = seg.kind === "params" ? resolveParams(spec, seg.attrs, operations) : resolveExample(spec, operations, seg.attrs);
      if ("error" in r) failures.push(`${f}: ${seg.raw} -> ${r.error}`);
      else if ("rows" in r && r.rows.length === 0) failures.push(`${f}: ${seg.raw} -> no rows`);
    }
  }
  assert.deepEqual(failures, []);
});

test("internal links in the guides point at pages that exist", () => {
  const broken: string[] = [];
  for (const f of docs) {
    for (const m of readFileSync(`content/docs/${f}`, "utf8").matchAll(/\]\((\/[^)#\s]*)/g)) {
      const href = m[1];
      if (href.startsWith("/docs/") && !slugs.has(href.slice(6))) broken.push(`${f}: ${href}`);
      if (href.startsWith("/api-reference/") && !visibleOps.has(href.slice(15))) broken.push(`${f}: ${href}`);
    }
  }
  assert.deepEqual(broken, []);
});

test("directives inside code fences are left alone", () => {
  const segs = splitDirectives('text\n```\n{{params schema="X"}}\n```\n{{params schema="Y"}}');
  assert.equal(segs.filter((s) => s.kind === "params").length, 1);
});

test("flattening expands nested objects and arrays with dotted names", () => {
  const rows = flattenParams(spec, [schemaRef("InitiatePaymentResponse"), schemaRef("InitiateUPIPaymentResponses")]);
  const names = rows.map((r) => r.name);
  assert.ok(names.includes("status"));
  assert.ok(names.includes("initiatePaymentResponses[].transactionId"));
  const upi = flattenParams(spec, [schemaRef("UPIPaymentRequest")]);
  assert.equal(upi.find((r) => r.name === "upiId")?.required, "yes"); // from "(Mandatory)" in the description
  assert.equal(upi.find((r) => r.name === "saveVpa")?.required, "no");
  assert.ok(!upi.some((r) => /\(mandatory\)/i.test(r.description)));
});

test("query-parameter tables come from the operation", () => {
  const r = resolveParams(spec, { op: "GET /mpg/web-checkout", in: "query" }, operations);
  assert.ok("rows" in r);
  assert.deepEqual("rows" in r ? r.rows.map((x) => x.name) : [], ["orderId", "hierLabelIdReference", "callbackurl", "merchantData"]);
});
