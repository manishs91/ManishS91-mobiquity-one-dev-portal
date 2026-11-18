/**
 * Code sample generation for the API reference and the "Try it" console.
 * Pure functions — given a request description, return a snippet per language.
 */

export interface RequestDescription {
  method: string;
  url: string; // fully qualified, path params already substituted
  headers: Record<string, string>;
  query?: Record<string, string>;
  body?: unknown;
}

export type Language = "curl" | "node" | "python" | "java" | "php";

export const LANGUAGES: { id: Language; label: string }[] = [
  { id: "curl", label: "cURL" },
  { id: "node", label: "Node.js" },
  { id: "python", label: "Python" },
  { id: "java", label: "Java" },
  { id: "php", label: "PHP" },
];

export function buildUrl(base: string, path: string, pathParams: Record<string, string> = {}, query: Record<string, string> = {}) {
  const filled = path.replace(/\{([^}]+)\}/g, (_, name: string) => encodeURIComponent(pathParams[name] ?? `{${name}}`));
  const qs = Object.entries(query)
    .filter(([, v]) => v !== "" && v !== undefined)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  return `${base.replace(/\/$/, "")}${filled}${qs ? `?${qs}` : ""}`;
}

const sq = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;
const dq = (s: string) => JSON.stringify(s);
const pretty = (b: unknown) => JSON.stringify(b, null, 2);
const indent = (s: string, n: number) => s.replace(/\n/g, `\n${" ".repeat(n)}`);

export function generate(lang: Language, req: RequestDescription): string {
  switch (lang) {
    case "curl":
      return curl(req);
    case "node":
      return node(req);
    case "python":
      return python(req);
    case "java":
      return java(req);
    case "php":
      return php(req);
  }
}

function hasBody(req: RequestDescription) {
  return req.body !== undefined && !["GET", "HEAD"].includes(req.method.toUpperCase());
}

function curl(req: RequestDescription) {
  const lines = [`curl --request ${req.method.toUpperCase()} \\`, `  --url ${sq(req.url)} \\`];
  for (const [k, v] of Object.entries(req.headers)) lines.push(`  --header ${sq(`${k}: ${v}`)} \\`);
  if (hasBody(req)) lines.push(`  --data ${sq(pretty(req.body))}`);
  else lines[lines.length - 1] = lines[lines.length - 1].replace(/ \\$/, "");
  return lines.join("\n");
}

function node(req: RequestDescription) {
  const opts = [`method: ${dq(req.method.toUpperCase())}`, `headers: ${indent(pretty(req.headers), 2)}`];
  if (hasBody(req)) opts.push(`body: JSON.stringify(${indent(pretty(req.body), 2)})`);
  return [
    `// Node.js 18+ (built-in fetch)`,
    `const response = await fetch(${dq(req.url)}, {`,
    `  ${opts.join(",\n  ")},`,
    `});`,
    ``,
    `const data = await response.json();`,
    `console.log(response.status, data);`,
  ].join("\n");
}

function pyLiteral(v: unknown, level = 0): string {
  const pad = "    ".repeat(level + 1);
  const end = "    ".repeat(level);
  if (v === null || v === undefined) return "None";
  if (v === true) return "True";
  if (v === false) return "False";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return JSON.stringify(v);
  if (Array.isArray(v)) return v.length ? `[\n${v.map((x) => pad + pyLiteral(x, level + 1)).join(",\n")}\n${end}]` : "[]";
  const entries = Object.entries(v as Record<string, unknown>);
  return entries.length ? `{\n${entries.map(([k, x]) => `${pad}${JSON.stringify(k)}: ${pyLiteral(x, level + 1)}`).join(",\n")}\n${end}}` : "{}";
}

function python(req: RequestDescription) {
  const lines = [`import requests`, ``, `url = ${dq(req.url)}`, `headers = ${pyLiteral(req.headers)}`];
  if (hasBody(req)) lines.push(`payload = ${pyLiteral(req.body)}`);
  lines.push(
    ``,
    `response = requests.request(${dq(req.method.toUpperCase())}, url, headers=headers${hasBody(req) ? ", json=payload" : ""}, timeout=30)`,
    `print(response.status_code, response.json())`,
  );
  return lines.join("\n");
}

function java(req: RequestDescription) {
  const body = hasBody(req)
    ? `HttpRequest.BodyPublishers.ofString("""\n${pretty(req.body)}\n""")`
    : "HttpRequest.BodyPublishers.noBody()";
  const headers = Object.entries(req.headers)
    .map(([k, v]) => `    .header(${dq(k)}, ${dq(v)})`)
    .join("\n");
  return [
    `// Java 15+ (java.net.http)`,
    `import java.net.URI;`,
    `import java.net.http.*;`,
    ``,
    `HttpClient client = HttpClient.newHttpClient();`,
    `HttpRequest request = HttpRequest.newBuilder()`,
    `    .uri(URI.create(${dq(req.url)}))`,
    headers,
    `    .method(${dq(req.method.toUpperCase())}, ${body})`,
    `    .build();`,
    ``,
    `HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());`,
    `System.out.println(response.statusCode() + " " + response.body());`,
  ]
    .filter((l) => l !== "")
    .join("\n")
    .replace("HttpClient client", "\nHttpClient client")
    .replace("HttpResponse<String>", "\nHttpResponse<String>");
}

function php(req: RequestDescription) {
  const headers = Object.entries(req.headers)
    .map(([k, v]) => `        ${sq(`${k}: ${v}`)},`)
    .join("\n");
  const lines = [
    `<?php`,
    `$curl = curl_init();`,
    ``,
    `curl_setopt_array($curl, [`,
    `    CURLOPT_URL => ${sq(req.url)},`,
    `    CURLOPT_RETURNTRANSFER => true,`,
    `    CURLOPT_TIMEOUT => 30,`,
    `    CURLOPT_CUSTOMREQUEST => ${sq(req.method.toUpperCase())},`,
    `    CURLOPT_HTTPHEADER => [`,
    headers,
    `    ],`,
  ];
  if (hasBody(req)) lines.push(`    CURLOPT_POSTFIELDS => json_encode(${phpLiteral(req.body, 1)}),`);
  lines.push(
    `]);`,
    ``,
    `$response = curl_exec($curl);`,
    `$status = curl_getinfo($curl, CURLINFO_HTTP_CODE);`,
    `curl_close($curl);`,
    ``,
    `echo $status . PHP_EOL . $response;`,
  );
  return lines.join("\n");
}

function phpLiteral(v: unknown, level = 0): string {
  const pad = "    ".repeat(level + 1);
  const end = "    ".repeat(level);
  if (v === null || v === undefined) return "null";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return sq(v);
  if (Array.isArray(v)) return v.length ? `[\n${v.map((x) => pad + phpLiteral(x, level + 1)).join(",\n")},\n${end}]` : "[]";
  const entries = Object.entries(v as Record<string, unknown>);
  return entries.length ? `[\n${entries.map(([k, x]) => `${pad}${sq(k)} => ${phpLiteral(x, level + 1)}`).join(",\n")},\n${end}]` : "[]";
}
