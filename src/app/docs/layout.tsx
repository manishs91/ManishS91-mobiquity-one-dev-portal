import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { docNav } from "@/lib/docs";
import { DocsNavLinks } from "./DocsNavLinks";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const nav = docNav();
  return (
    <>
      <SiteHeader />
      <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-8 lg:grid-cols-[250px_minmax(0,1fr)] lg:px-8">
        <aside className="hidden lg:block">
          <div className="sticky top-24 max-h-[calc(100vh-7rem)] space-y-6 overflow-y-auto pr-2 text-sm">
            <Link href="/docs" className="block px-2 font-semibold">Guides overview</Link>
            <DocsNavLinks nav={nav.map((s) => ({ section: s.section, docs: s.docs.map((d) => ({ slug: d.slug, title: d.title })) }))} />
          </div>
        </aside>
        <main id="main" className="min-w-0">
          <details className="mb-6 rounded-[var(--radius-md)] border border-line bg-surface p-3 text-sm lg:hidden">
            <summary className="cursor-pointer font-semibold">Browse guides</summary>
            <div className="mt-3">
              <DocsNavLinks nav={nav.map((s) => ({ section: s.section, docs: s.docs.map((d) => ({ slug: d.slug, title: d.title })) }))} />
            </div>
          </details>
          {children}
        </main>
      </div>
      <SiteFooter />
    </>
  );
}
