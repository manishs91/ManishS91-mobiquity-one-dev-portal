import { renderInline } from "@/components/Markdown";
import type { ParamRow } from "@/lib/openapi/flatten";

const REQ = {
  yes: <span className="font-semibold text-signal-ink">Yes</span>,
  no: <span className="text-ink-soft">No</span>,
  conditional: <span className="font-semibold text-ink-soft">Conditional</span>,
  unspecified: <span className="text-ink-faint">Not specified</span>,
};

/** Parameter table generated from the OpenAPI schema. Nested fields use dotted names. */
export function ParamTable({ rows, title }: { rows: ParamRow[]; title?: string }) {
  return (
    <figure className="my-6 max-w-none">
      {title ? <figcaption className="mb-2 text-sm font-semibold">{title}</figcaption> : null}
      <div className="overflow-x-auto rounded-[var(--radius-md)] border border-line bg-surface">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead className="bg-line-soft text-ink-soft">
            <tr>
              <th scope="col" className="px-3 py-2 font-semibold">Parameter</th>
              <th scope="col" className="px-3 py-2 font-semibold">Type</th>
              <th scope="col" className="px-3 py-2 font-semibold">Required</th>
              <th scope="col" className="px-3 py-2 font-semibold">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft align-top">
            {rows.map((r) => (
              <tr key={r.name}>
                <td className="px-3 py-2.5" style={{ paddingLeft: `${0.75 + r.depth * 1}rem` }}>
                  <code className="break-all font-semibold text-ink">{r.name}</code>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-ink-soft">{r.type}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-xs">{REQ[r.required]}</td>
                <td className="px-3 py-2.5 text-ink-soft">
                  {r.description ? (
                    <span className="[&_code]:rounded [&_code]:bg-line-soft [&_code]:px-1" dangerouslySetInnerHTML={{ __html: renderInline(r.description) }} />
                  ) : (
                    <span className="text-ink-faint">No description in the spec.</span>
                  )}
                  {r.allowed?.length ? (
                    <span className="mt-1 block text-xs">
                      Allowed: {r.allowed.map((a) => <code key={a} className="mr-1 rounded bg-line-soft px-1">{a}</code>)}
                    </span>
                  ) : null}
                  {r.example ? (
                    <span className="mt-1 block text-xs text-ink-faint">
                      Example: <code className="break-all text-ink-soft">{r.example}</code>
                    </span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
