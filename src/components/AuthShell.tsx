import { Logo } from "./Logo";

export function AuthShell({ title, intro, children }: { title: string; intro?: React.ReactNode; children: React.ReactNode }) {
  return (
    <main id="main" className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {intro ? <div className="mt-2 text-ink-soft">{intro}</div> : null}
          <div className="mt-8">{children}</div>
        </div>
      </div>
      <aside className="hidden flex-col justify-center bg-ink px-16 text-[#d9e2ec] lg:flex">
        <p className="max-w-md text-2xl font-semibold leading-snug text-white">Your sandbox comes with everything a payment needs.</p>
        <ul className="mt-8 max-w-md space-y-4 text-[15px]">
          <li><span className="font-semibold text-white">Tenant ID and client secret</span> for OAuth2 access tokens.</li>
          <li><span className="font-semibold text-white">Business unit ID and hierarchy</span> to send on payment requests.</li>
          <li><span className="font-semibold text-white">Checksum salt</span> to sign requests and verify webhooks.</li>
          <li><span className="font-semibold text-white">A request console</span> that calls the sandbox from the API reference.</li>
        </ul>
      </aside>
    </main>
  );
}
