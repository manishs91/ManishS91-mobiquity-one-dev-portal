import Link from "next/link";
import { DashNav } from "@/components/dashboard/DashNav";
import { LogoutButton } from "@/components/dashboard/LogoutButton";
import { Logo } from "@/components/Logo";
import { dashboardNav, primaryNav } from "@/config/site";
import { requireSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = {
  not_requested: "Sandbox only",
  pending: "Go-live under review",
  approved: "Live",
  rejected: "Go-live needs changes",
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const s = await requireSession();
  const nav = s.isPortalAdmin ? [...dashboardNav, { href: "/dashboard/admin", label: "Go-live reviews" }] : dashboardNav;
  return (
    <>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-6 px-5 lg:px-8">
          <Logo />
          <nav className="hidden gap-5 text-sm font-medium text-ink-soft md:flex">
            {primaryNav.slice(0, 2).map((n) => (
              <Link key={n.href} href={n.href} className="hover:text-ink">{n.label}</Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-4">
            <span className="hidden text-sm text-ink-soft sm:inline">{s.user.email}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:px-8">
        <aside>
          <div className="mb-4 hidden lg:block">
            <p className="font-bold">{s.org.name}</p>
            <p className="text-sm text-ink-soft">{STATUS[s.org.productionStatus]}</p>
            <p className="text-xs text-ink-faint">Your role: {s.role}</p>
          </div>
          <DashNav items={nav} />
        </aside>
        <main id="main" className="min-w-0">{children}</main>
      </div>
    </>
  );
}
