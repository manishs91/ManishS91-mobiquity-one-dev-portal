import { CodeTabs } from "@/components/CodeTabs";
import { Markdown } from "@/components/Markdown";
import { resolveExample, resolveParams } from "@/lib/docs-blocks";
import { splitDirectives } from "@/lib/docs-directives";
import { getApi } from "@/lib/openapi/spec";
import { ParamTable } from "./ParamTable";

/** Renders a guide: markdown, with {{params}} tables and {{example}} blocks generated from the spec. */
export function GuideBody({ body }: { body: string }) {
  const { spec, operations } = getApi();
  return (
    <>
      {splitDirectives(body).map((seg, i) => {
        if (seg.kind === "markdown") return seg.text.trim() ? <Markdown key={i} source={seg.text} /> : null;
        if (seg.kind === "params") {
          const r = resolveParams(spec, seg.attrs, operations);
          return "error" in r ? <BlockError key={i} raw={seg.raw} error={r.error} /> : <ParamTable key={i} rows={r.rows} title={seg.attrs.title} />;
        }
        const r = resolveExample(spec, operations, seg.attrs);
        if ("error" in r) return <BlockError key={i} raw={seg.raw} error={r.error} />;
        return (
          <div key={i} className="my-6 max-w-[72ch]">
            <CodeTabs tabs={[{ id: "json", label: "JSON", code: JSON.stringify(r.value, null, 2), json: true }]} title={seg.attrs.title ?? "Example"} maxHeight="32rem" />
          </div>
        );
      })}
    </>
  );
}

function BlockError({ raw, error }: { raw: string; error: string }) {
  return (
    <p role="alert" className="my-4 rounded-[var(--radius-md)] bg-danger-wash px-3 py-2 text-sm text-danger">
      Couldn&apos;t render <code>{raw}</code>: {error}
    </p>
  );
}
