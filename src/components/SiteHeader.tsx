import Link from "next/link";
import { primaryNav } from "@/config/site";
import { getSession } from "@/lib/auth/session";
import { Logo } from "./Logo";

export async function SiteHeader() {
  const session = await getSession();
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-8 px-5 lg:px-8">
        <Logo />
        <nav aria-label="Primary" className="hidden items-center gap-6 text-sm font-medium text-ink-soft md:flex">
          {primaryNav.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-ink">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {session ? (
            <Link href="/dashboard" className="btn btn-primary btn-sm">
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="whitespace-nowrap text-sm font-semibold text-ink-soft hover:text-ink">
                Sign in
              </Link>
              <Link href="/signup" className="btn btn-primary btn-sm">
                Get sandbox keys
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
