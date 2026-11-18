import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { getSession } from "@/lib/auth/session";
import { SignupForm } from "./SignupForm";

export const metadata = { title: "Create a sandbox account" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string; invite?: string; email?: string }> }) {
  const { next, invite, email } = await searchParams;
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  if (await getSession()) redirect(safeNext);
  return (
    <AuthShell
      title={invite ? "Join your team" : "Create a sandbox account"}
      intro={<>Already have an account? <Link className="font-semibold text-rail hover:underline" href={`/login?next=${encodeURIComponent(safeNext)}`}>Sign in</Link>.</>}
    >
      <SignupForm next={safeNext} inviteToken={invite} invitedEmail={email} />
    </AuthShell>
  );
}
