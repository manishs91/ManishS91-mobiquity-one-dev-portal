import Link from "next/link";
import { getApi } from "@/lib/openapi/spec";
import { MethodBadge } from "../MethodBadge";

export function ApiNav({ activeSlug }: { activeSlug?: string }) {
  const { groups } = getApi();
  return (
    <nav aria-label="API reference" className="space-y-6 text-sm">
      <div>
        <Link href="/api-reference" className={`block rounded px-2 py-1 font-semibold ${!activeSlug ? "bg-brand-wash text-brand-deep" : "hover:text-ink"}`}>
          Overview
        </Link>
      </div>
      {groups.map(({ group, operations }) => (
        <div key={group.id}>
          <p className="mb-1.5 px-2 font-semibold text-ink">
            {group.title}
            {group.badge ? <span className="ml-2 rounded bg-signal-wash px-1.5 py-0.5 text-[10px] font-semibold text-signal-ink">{group.badge}</span> : null}
          </p>
          <ul className="space-y-px">
            {operations.map((op) => (
              <li key={op.slug}>
                <Link
                  href={`/api-reference/${op.slug}`}
                  aria-current={op.slug === activeSlug ? "page" : undefined}
                  className={`flex items-center gap-2 rounded px-2 py-1 ${
                    op.slug === activeSlug ? "bg-brand-wash font-semibold text-brand-deep" : "text-ink-soft hover:bg-line-soft hover:text-ink"
                  }`}
                >
                  <MethodBadge method={op.method} size="sm" />
                  <span className="truncate">{op.summary}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
