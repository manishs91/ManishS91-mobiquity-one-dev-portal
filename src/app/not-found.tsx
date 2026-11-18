import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-xl px-5 py-24">
        <h1 className="text-3xl font-bold">This page doesn&apos;t exist</h1>
        <p className="mt-3 text-ink-soft">The link may be out of date. Try the guides or the API reference.</p>
        <div className="mt-6 flex gap-3">
          <Link href="/docs" className="btn btn-primary">Go to guides</Link>
          <Link href="/api-reference" className="btn btn-secondary">API reference</Link>
        </div>
      </main>
    </>
  );
}
