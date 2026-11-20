"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SecretReveal, type Revealed } from "@/components/dashboard/SecretReveal";
import { useApi } from "@/components/useApi";

export function SignupForm({ next, inviteToken, invitedEmail }: { next: string; inviteToken?: string; invitedEmail?: string }) {
  const router = useRouter();
  const { call, busy, error, fieldErrors } = useApi<{ firstCredentials: Revealed | null }>();
  const [issued, setIssued] = useState<Revealed | null>(null);

  if (issued) {
    return (
      <div>
        <p className="mb-4 text-ink-soft">Your sandbox is ready. Copy these now: the client secret and salt won&apos;t be shown again.</p>
        <SecretReveal revealed={issued} />
        <button className="btn btn-primary mt-6 w-full" onClick={() => { router.push(next); router.refresh(); }}>
          I&apos;ve saved them, continue
        </button>
      </div>
    );
  }

  const err = (k: string) => (fieldErrors[k] ? <p className="mt-1 text-xs text-danger">{fieldErrors[k]}</p> : null);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const data = await call("/api/auth/signup", {
          body: {
            name: f.get("name"),
            email: f.get("email"),
            company: f.get("company") ?? "",
            password: f.get("password"),
            acceptTerms: f.get("terms") === "on",
            inviteToken,
          },
        });
        if (!data) return;
        if (data.firstCredentials) setIssued(data.firstCredentials);
        else { router.push(next); router.refresh(); }
      }}
    >
      <div>
        <label className="label" htmlFor="name">Your name</label>
        <input id="name" name="name" autoComplete="name" required className="field" />
        {err("name")}
      </div>
      <div>
        <label className="label" htmlFor="email">Work email</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="field" defaultValue={invitedEmail} readOnly={!!invitedEmail} />
        {err("email")}
      </div>
      {!inviteToken && (
        <div>
          <label className="label" htmlFor="company">Company</label>
          <input id="company" name="company" autoComplete="organization" required className="field" />
          {err("company")}
        </div>
      )}
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={12} className="field" />
        <p className="hint">At least 12 characters, with letters and a number.</p>
        {err("password")}
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="terms" className="mt-1" required />
        <span>I agree to the <Link href="/legal/terms" className="text-brand-ink underline" target="_blank">developer terms</Link>.</span>
      </label>
      {err("acceptTerms")}
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
      <button className="btn btn-primary w-full" disabled={busy}>{busy ? "Creating your sandbox…" : inviteToken ? "Join team" : "Create account"}</button>
    </form>
  );
}
