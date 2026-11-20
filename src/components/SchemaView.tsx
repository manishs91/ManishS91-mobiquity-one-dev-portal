import { deref, mergeAllOf, refName, typeLabel } from "@/lib/openapi/resolve";
import { humanize } from "@/lib/openapi/sample";
import { isRef, type OpenAPISpec, type Reference, type Schema } from "@/lib/openapi/types";

const MAX_DEPTH = 6;

/**
 * Renders a schema as a nested field list. Objects and arrays of objects expand
 * with <details>, so a 450-schema spec stays readable and works without JavaScript.
 */
export function SchemaView({ spec, schema, stack = [], depth = 0 }: { spec: OpenAPISpec; schema: Schema | Reference | undefined; stack?: string[]; depth?: number }) {
  if (!schema) return <p className="text-sm text-ink-soft">No schema documented.</p>;
  const ref = isRef(schema) ? schema.$ref : undefined;
  if (ref && stack.includes(ref)) return <p className="text-sm text-ink-soft">Recursive reference to {refName(ref)}.</p>;
  const nextStack = ref ? [...stack, ref] : stack;
  const resolved = deref<Schema>(spec, schema);
  if (!resolved) return <p className="text-sm text-danger">Unresolvable reference {ref}.</p>;
  const s = mergeAllOf(spec, resolved);

  const variants = s.oneOf ?? s.anyOf;
  if (variants?.length) {
    return (
      <div className="space-y-2">
        {s.description ? <p className="text-sm text-ink-soft">{s.description}</p> : null}
        <p className="text-sm text-ink-soft">{s.oneOf ? "One of" : "Any of"} these {variants.length} shapes:</p>
        {variants.map((v, i) => {
          const name = isRef(v) ? humanize(refName(v.$ref)) : (v.title ?? `Option ${i + 1}`);
          return (
            <details key={i} className="group rounded-[var(--radius-md)] border border-line bg-surface">
              <summary className="cursor-pointer list-none px-3 py-2 text-sm font-semibold marker:hidden">
                <span className="mr-2 inline-block text-ink-faint transition group-open:rotate-90">›</span>
                {name}
              </summary>
              <div className="border-t border-line-soft px-3 py-2">
                <SchemaView spec={spec} schema={v} stack={nextStack} depth={depth + 1} />
              </div>
            </details>
          );
        })}
      </div>
    );
  }

  if (s.type === "array") {
    return (
      <div>
        <p className="mb-2 text-sm text-ink-soft">Array of {typeLabel(spec, s.items)}</p>
        <SchemaView spec={spec} schema={s.items} stack={nextStack} depth={depth + 1} />
      </div>
    );
  }

  const props = Object.entries(s.properties ?? {});
  if (!props.length) {
    return (
      <p className="text-sm text-ink-soft">
        <code>{typeLabel(spec, s)}</code>
        {s.description ? ` — ${s.description}` : null}
      </p>
    );
  }

  const required = new Set(s.required ?? []);
  return (
    <ul className="divide-y divide-line-soft">
      {props.map(([name, prop]) => (
        <Field key={name} spec={spec} name={name} prop={prop} required={required.has(name)} stack={nextStack} depth={depth} />
      ))}
    </ul>
  );
}

function Field({ spec, name, prop, required, stack, depth }: { spec: OpenAPISpec; name: string; prop: Schema | Reference; required: boolean; stack: string[]; depth: number }) {
  const resolved = deref<Schema>(spec, prop);
  const p = resolved ? mergeAllOf(spec, resolved) : undefined;
  const itemSchema = p?.type === "array" && p.items ? deref<Schema>(spec, p.items) : undefined;
  const expandable = depth < MAX_DEPTH && !!p && (!!p.properties || !!p.oneOf || !!p.anyOf || !!itemSchema?.properties || !!itemSchema?.oneOf);
  // The spec often marks required-ness in prose: "(Mandatory)" / "(Optional)".
  const desc = p?.description?.trim();
  const mandatoryInText = !!desc && /\(mandatory\)/i.test(desc);
  const isRequired = required || mandatoryInText;
  const example = p?.example ?? (Array.isArray(p?.examples) ? p?.examples[0] : undefined);

  const head = (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <code className="font-semibold text-ink">{name}</code>
      <span className="font-mono text-xs text-ink-soft">{typeLabel(spec, prop)}</span>
      {isRequired ? <span className="text-xs font-semibold text-signal-ink">required</span> : null}
      {p?.deprecated ? <span className="text-xs font-semibold text-danger">deprecated</span> : null}
    </div>
  );
  const body = (
    <>
      {desc ? <p className="mt-1 text-sm text-ink-soft">{desc.replace(/\s*\((mandatory|optional)\)\s*/gi, " ").trim()}</p> : null}
      {p?.enum?.length ? (
        <p className="mt-1 text-xs text-ink-soft">
          Allowed:{" "}
          {p.enum.map((v, i) => (
            <code key={i} className="mr-1 rounded bg-line-soft px-1">
              {String(v)}
            </code>
          ))}
        </p>
      ) : null}
      {example !== undefined && typeof example !== "object" ? (
        <p className="mt-1 text-xs text-ink-faint">
          Example: <code className="text-ink-soft">{String(example)}</code>
        </p>
      ) : null}
    </>
  );

  if (!expandable) {
    return (
      <li className="py-2.5">
        {head}
        {body}
      </li>
    );
  }
  return (
    <li className="py-2.5">
      <details className="group">
        <summary className="cursor-pointer list-none marker:hidden">
          <div className="flex gap-2">
            <span className="mt-0.5 inline-block text-ink-faint transition group-open:rotate-90">›</span>
            <div className="min-w-0 flex-1">
              {head}
              {body}
            </div>
          </div>
        </summary>
        <div className="ml-4 mt-2 border-l-2 border-line-soft pl-4">
          <SchemaView spec={spec} schema={prop} stack={stack} depth={depth + 1} />
        </div>
      </details>
    </li>
  );
}
