import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/Markdown";
import { getDoc, headings, neighbours } from "@/lib/docs";
import { codeCategory, collectResponseCodes } from "@/lib/openapi/codes";
import { getApi } from "@/lib/openapi/spec";

type Props = { params: Promise<{ slug: string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const doc = getDoc((await params).slug.join("/"));
  return { title: doc?.title ?? "Not found", description: doc?.summary };
}

export default async function DocPage({ params }: Props) {
  const slug = (await params).slug.join("/");
  const doc = getDoc(slug);
  if (!doc || slug === "index") notFound();
  const toc = headings(doc.body);
  const { prev, next } = neighbours(slug);

  return (
    <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_220px]">
      <article>
        <p className="mb-2 text-sm font-semibold text-brand-ink">{doc.section}</p>
        <Markdown source={doc.body} />
        {slug === "errors" ? <ResponseCodeTable /> : null}
        <nav aria-label="More guides" className="mt-12 flex justify-between gap-4 border-t border-line pt-6 text-sm">
          {prev ? <Link href={`/docs/${prev.slug}`} className="font-semibold text-ink-soft hover:text-ink">Previous: {prev.title}</Link> : <span />}
          {next ? <Link href={`/docs/${next.slug}`} className="font-semibold text-brand-ink hover:underline">Next: {next.title}</Link> : null}
        </nav>
      </article>
      {toc.length > 1 ? (
        <aside className="hidden xl:block">
          <div className="sticky top-24 text-sm">
            <p className="mb-2 font-semibold">On this page</p>
            <ul className="space-y-1.5 border-l border-line pl-3">
              {toc.map((h) => (
                <li key={h.id}><a href={`#${h.id}`} className="text-ink-soft hover:text-ink">{h.text}</a></li>
              ))}
            </ul>
          </div>
        </aside>
      ) : null}
    </div>
  );
}

function ResponseCodeTable() {
  const codes = collectResponseCodes(getApi().spec);
  return (
    <div className="prose-doc mt-2">
      <h2 id="all-response-codes">All response codes</h2>
      <p>Generated from the response examples in the API specification ({codes.length} codes).</p>
      <table>
        <thead>
          <tr><th>Code</th><th>Type</th><th>Message</th></tr>
        </thead>
        <tbody>
          {codes.map((c) => (
            <tr key={c.code}>
              <td><code>{c.code}</code></td>
              <td className="whitespace-nowrap">{codeCategory(c.code)}</td>
              <td>{c.messages.join(" / ") || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
