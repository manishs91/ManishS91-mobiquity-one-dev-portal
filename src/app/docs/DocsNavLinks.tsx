"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function DocsNavLinks({ nav }: { nav: { section: string; docs: { slug: string; title: string }[] }[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Guides" className="space-y-6">
      {nav.map((s) => (
        <div key={s.section}>
          <p className="mb-1.5 px-2 font-semibold">{s.section}</p>
          <ul className="space-y-px">
            {s.docs.map((d) => {
              const href = `/docs/${d.slug}`;
              const active = pathname === href;
              return (
                <li key={d.slug}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`block rounded px-2 py-1 ${active ? "bg-rail-wash font-semibold text-rail-deep" : "text-ink-soft hover:bg-line-soft hover:text-ink"}`}
                  >
                    {d.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
