import Link from "next/link";

/** Wordmark: a single rail that splits into three routes — the product in one glyph. */
export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 font-bold tracking-tight text-ink" aria-label="Mobiquity One Developers home">
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
        <rect width="26" height="26" rx="7" fill="var(--color-brand)" />
        <path d="M5 13h6c3 0 4-6 8-6M11 13h8M11 13c3 0 4 6 8 6" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
        <circle cx="5.5" cy="13" r="2.2" fill="var(--color-signal)" />
      </svg>
      <span className="whitespace-nowrap">
        Mobiquity One <span className="hidden font-medium text-ink-soft sm:inline">Developers</span>
      </span>
    </Link>
  );
}
