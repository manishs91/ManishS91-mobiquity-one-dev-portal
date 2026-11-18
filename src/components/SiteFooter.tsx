import Link from "next/link";
import { site } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-10 text-sm text-ink-soft sm:grid-cols-3 lg:px-8">
        <div>
          <p className="font-semibold text-ink">{site.portalName}</p>
          <p className="mt-1 max-w-xs">Questions about an integration? Write to <a className="underline" href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>.</p>
        </div>
        <ul className="space-y-1.5">
          <li><Link href="/docs/getting-started" className="hover:text-ink">Quickstart</Link></li>
          <li><Link href="/api-reference" className="hover:text-ink">API reference</Link></li>
          <li><Link href="/docs/webhooks" className="hover:text-ink">Webhooks</Link></li>
          <li><Link href="/docs/go-live" className="hover:text-ink">Going live</Link></li>
        </ul>
        <ul className="space-y-1.5">
          <li><Link href={site.termsUrl} className="hover:text-ink">Developer terms</Link></li>
          <li><Link href={site.privacyUrl} className="hover:text-ink">Privacy</Link></li>
          {site.statusUrl ? <li><a href={site.statusUrl} className="hover:text-ink">API status</a></li> : null}
        </ul>
      </div>
    </footer>
  );
}
