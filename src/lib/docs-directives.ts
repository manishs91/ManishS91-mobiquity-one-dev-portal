/**
 * Guides can embed spec-driven blocks on their own line:
 *
 *   {{params schema="InitiatePaymentRequest"}}
 *   {{params schema="InitiatePaymentResponse,InitiateUPIPaymentResponses"}}
 *   {{example op="POST /ecom/initiatePayment" variant="UPIPaymentRequest"}}
 *   {{example op="POST /ecom/initiatePayment" status="200" variant="InitiateUPIPaymentResponses"}}
 *   {{example schema="MerchantDetailsRequest"}}
 *
 * Everything else is ordinary markdown.
 */
export type Segment =
  | { kind: "markdown"; text: string }
  | { kind: "params" | "example"; attrs: Record<string, string>; raw: string };

const LINE = /^\{\{(params|example)((?:\s+[a-zA-Z]+="[^"]*")*)\s*\}\}\s*$/;
const ATTR = /([a-zA-Z]+)="([^"]*)"/g;

export function splitDirectives(body: string): Segment[] {
  const out: Segment[] = [];
  let buf: string[] = [];
  let inFence = false;
  const flush = () => {
    if (buf.length) out.push({ kind: "markdown", text: buf.join("\n") });
    buf = [];
  };
  for (const line of body.split("\n")) {
    if (/^```/.test(line.trim())) inFence = !inFence;
    const m = !inFence && LINE.exec(line.trim());
    if (m) {
      flush();
      const attrs: Record<string, string> = {};
      for (const a of m[2].matchAll(ATTR)) attrs[a[1]] = a[2];
      out.push({ kind: m[1] as "params" | "example", attrs, raw: line.trim() });
    } else buf.push(line);
  }
  flush();
  return out;
}
