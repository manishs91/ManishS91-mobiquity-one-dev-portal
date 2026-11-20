"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function DashNav({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Dashboard" className="flex gap-1 overflow-x-auto lg:flex-col">
      {items.map((i) => {
        const active = i.href === "/dashboard" ? pathname === i.href : pathname.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 rounded-[var(--radius-md)] px-3 py-2 text-sm ${active ? "bg-brand-wash font-semibold text-brand-deep" : "text-ink-soft hover:bg-line-soft hover:text-ink"}`}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
