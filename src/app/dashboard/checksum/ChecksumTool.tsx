"use client";
import { useEffect, useMemo, useState } from "react";
import { CopyButton } from "@/components/CopyButton";

interface Rule {
  id: string;
  label: string;
  field: string;
  inputs: string[];
}

async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function ChecksumTool({ rules }: { rules: Rule[] }) {
  const [ruleId, setRuleId] = useState("initiate-payment");
  const [salt, setSalt] = useState("");
  const [body, setBody] = useState('{\n  "amount": "500",\n  "orderId": "lyqH7",\n  "taxAmount": "1",\n  "electronicGoodsIndicator": "D",\n  "paymentChannelId": "2"\n}');
  const [hash, setHash] = useState("");
  const rule = rules.find((r) => r.id === ruleId)!;

  const parsed = useMemo(() => {
    try {
      const v = JSON.parse(body);
      // A webhook payload wraps entries in ecommPaymentResponseList — use the first one.
      const entry = Array.isArray(v?.ecommPaymentResponseList) ? v.ecommPaymentResponseList[0] : v;
      return { value: entry as Record<string, unknown>, error: null };
    } catch (e) {
      return { value: null, error: (e as Error).message };
    }
  }, [body]);

  const parts = parsed.value ? rule.inputs.map((k) => ({ k, v: parsed.value![k] === undefined || parsed.value![k] === null ? "" : String(parsed.value![k]) })) : [];
  const input = parts.map((p) => p.v).join("") + salt;
  const given = parsed.value?.[rule.field];

  useEffect(() => {
    let live = true;
    if (parsed.value) sha256Hex(input).then((h) => live && setHash(h));
    return () => { live = false; };
  }, [input, parsed.value]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div>
          <label className="label" htmlFor="ck-rule">Request type</label>
          <select id="ck-rule" className="field" value={ruleId} onChange={(e) => setRuleId(e.target.value)}>
            {rules.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="ck-salt">Checksum salt</label>
          <input id="ck-salt" className="field font-mono text-sm" value={salt} onChange={(e) => setSalt(e.target.value)} placeholder="From API credentials" autoComplete="off" />
        </div>
        <div>
          <label className="label" htmlFor="ck-body">JSON body</label>
          <textarea id="ck-body" className="field min-h-[16rem] font-mono text-[12.5px]" spellCheck={false} value={body} onChange={(e) => setBody(e.target.value)} />
          {parsed.error ? <p className="mt-1 text-xs text-danger">Invalid JSON: {parsed.error}</p> : null}
        </div>
      </div>

      <div className="space-y-4">
        <div className="panel p-5">
          <p className="text-sm font-semibold">Fields, in order</p>
          <ol className="mt-2 space-y-1 text-sm">
            {parts.map((p) => (
              <li key={p.k} className="flex gap-2">
                <code className="w-52 shrink-0 text-ink-soft">{p.k}</code>
                {p.v ? <code>{p.v}</code> : <span className="text-danger">missing (empty string used)</span>}
              </li>
            ))}
            <li className="flex gap-2">
              <code className="w-52 shrink-0 text-ink-soft">salt</code>
              {salt ? <code>{"•".repeat(Math.min(salt.length, 16))}</code> : <span className="text-danger">enter your salt</span>}
            </li>
          </ol>
        </div>
        <div className="panel p-5">
          <p className="text-sm font-semibold">String that is hashed</p>
          <code className="mt-1 block break-all text-sm">{parts.map((p) => p.v).join("")}<span className="text-ink-faint">{salt ? "<salt>" : ""}</span></code>
        </div>
        <div className="rounded-[var(--radius-lg)] border-2 border-rail bg-surface p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{rule.field}</p>
            {hash ? <CopyButton text={hash} className="!text-rail hover:!bg-rail-wash" /> : null}
          </div>
          <code className="mt-1 block break-all text-sm">{hash || "—"}</code>
          {typeof given === "string" && given && hash ? (
            <p className={`mt-3 text-sm font-semibold ${given.toLowerCase() === hash ? "text-rail" : "text-danger"}`}>
              {given.toLowerCase() === hash ? "Matches the checksum in the body." : "Doesn't match the checksum in the body. Check field order, values and salt."}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
