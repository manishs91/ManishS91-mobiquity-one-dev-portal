import Link from "next/link";
import { RoutingHero } from "@/components/RoutingHero";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getApi } from "@/lib/openapi/spec";

export default function Home() {
  const { groups, operations } = getApi();
  const visible = operations.filter((o) => o.group.visible).length;

  return (
    <>
      <SiteHeader />
      <main id="main">
        <section className="border-b border-line">
          <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-5 py-16 lg:grid-cols-[minmax(0,1fr)_560px] lg:px-8 lg:py-24">
            <div>
              <h1 className="max-w-[16ch] text-[2.6rem] font-bold leading-[1.08] tracking-[-0.025em] sm:text-[3.2rem]">
                Send one payment request. We route it.
              </h1>
              <p className="mt-5 max-w-[52ch] text-lg text-ink-soft">
                Mobiquity One connects your checkout to cards, UPI, wallets and net banking across multiple processors,
                with retries and fallback built in. Get sandbox keys in under a minute and make your first test payment
                from this site.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/signup" className="btn btn-primary">Get sandbox keys</Link>
                <Link href="/docs/getting-started" className="btn btn-secondary">Read the quickstart</Link>
              </div>
            </div>
            <RoutingHero />
          </div>
        </section>

        <section className="mx-auto max-w-[1200px] px-5 py-16 lg:px-8">
          <h2 className="text-2xl font-bold tracking-tight">From sign-up to a test payment</h2>
          <ol className="mt-8 grid gap-8 md:grid-cols-3">
            {[
              { title: "Create a sandbox account", body: "You get a tenant ID, client secret and checksum salt straight away. No approval needed for testing.", href: "/signup", cta: "Create account" },
              { title: "Get an access token", body: "Exchange your credentials for a bearer token with one call to the OAuth2 token endpoint.", href: "/docs/authentication", cta: "Authentication guide" },
              { title: "Initiate a payment", body: "Send a card or UPI payment from the API reference console. It signs the checksum for you.", href: "/api-reference/post-ecom-initiate-payment", cta: "Open Initiate Payment" },
            ].map((s, i) => (
              <li key={s.title} className="border-t-2 border-ink pt-4">
                <p className="font-mono text-sm font-semibold text-signal-ink">Step {i + 1}</p>
                <h3 className="mt-1 text-lg font-bold">{s.title}</h3>
                <p className="mt-2 text-ink-soft">{s.body}</p>
                <Link href={s.href} className="mt-3 inline-block font-semibold text-brand-ink hover:underline">{s.cta}</Link>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-t border-line bg-surface">
          <div className="mx-auto max-w-[1200px] px-5 py-16 lg:px-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="text-2xl font-bold tracking-tight">What the API covers</h2>
              <Link href="/api-reference" className="font-semibold text-brand-ink hover:underline">All {visible} endpoints</Link>
            </div>
            <dl className="mt-8 grid gap-x-12 sm:grid-cols-2 lg:grid-cols-3">
              {groups.map(({ group, operations }) => (
                <div key={group.id} className="border-t border-line py-5">
                  <dt>
                    <Link href={`/api-reference/${operations[0].slug}`} className="font-bold hover:text-brand-ink">{group.title}</Link>
                    <span className="ml-2 text-sm text-ink-faint">{operations.length}</span>
                  </dt>
                  <dd className="mt-1 text-sm text-ink-soft">{group.description}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
