import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { getSession } from "@/lib/auth/session";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  if (await getSession()) redirect(safeNext);
  return (
    <AuthShell title="Sign in" intro={<>New here? <Link className="font-semibold text-rail hover:underline" href={`/signup?next=${encodeURIComponent(safeNext)}`}>Create a sandbox account</Link>.</>}>
      <LoginForm next={safeNext} />
    </AuthShell>
  );
}
