"use client";
import { useRouter } from "next/navigation";
import { useApi } from "@/components/useApi";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const { call, busy, error } = useApi();

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const ok = await call("/api/auth/login", { body: { email: f.get("email"), password: f.get("password") } });
        if (ok) {
          router.push(next);
          router.refresh();
        }
      }}
    >
      <div>
        <label className="label" htmlFor="email">Work email</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="field" />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="field" />
      </div>
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
      <button className="btn btn-primary w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
