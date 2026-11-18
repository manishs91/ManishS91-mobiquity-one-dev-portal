import Link from "next/link";
import { Markdown } from "@/components/Markdown";
import { docNav, getDoc } from "@/lib/docs";

export const metadata = { title: "Guides" };

export default function DocsIndex() {
  const intro = getDoc("index");
  return (
    <div className="max-w-4xl">
      {intro ? <Markdown source={intro.body} /> : <h1 className="text-3xl font-bold">Guides</h1>}
      <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2">
        {docNav().map((s) => (
          <section key={s.section}>
            <h2 className="mb-2 font-bold">{s.section}</h2>
            <ul className="space-y-3">
              {s.docs.map((d) => (
                <li key={d.slug}>
                  <Link href={`/docs/${d.slug}`} className="font-semibold text-rail hover:underline">{d.title}</Link>
                  {d.summary ? <p className="text-sm text-ink-soft">{d.summary}</p> : null}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
