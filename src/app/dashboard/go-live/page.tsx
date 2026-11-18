import Link from "next/link";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { requireSession } from "@/lib/auth/session";
import { getGoLive, readiness } from "@/lib/services/golive";
import { GoLiveForm } from "./GoLiveForm";

export const metadata = { title: "Go live" };

export default async function GoLivePage() {
  const s = await requireSession("/dashboard/go-live");
  const steps = readiness(s.org.id);
  const latest = getGoLive(s.org.id);
  const required = steps.filter((x) => ["credentials", "payment", "webhook"].includes(x.id));
  const ready = required.every((x) => x.done);
  const status = s.org.productionStatus;

  return (
    <>
      <PageHeader title="Go live" intro="Tell us about your business so the Mobiquity One team can enable production. Reviews usually take a few business days." />

      {status === "approved" ? (
        <div className="panel border-rail p-6">
          <p className="text-lg font-bold">You&apos;re live</p>
          <p className="mt-1 text-ink-soft">Create production credentials and swap the base URL in your app.</p>
          <Link href="/dashboard/credentials" className="btn btn-primary mt-4">Create production credentials</Link>
        </div>
      ) : status === "pending" ? (
        <div className="panel p-6">
          <p className="text-lg font-bold">Your request is under review</p>
          <p className="mt-1 text-ink-soft">Submitted {latest ? new Date(latest.createdAt).toLocaleDateString() : ""}. We&apos;ll contact {latest?.contactEmail} if we need anything else.</p>
        </div>
      ) : (
        <>
          {status === "rejected" && latest?.reviewerNote ? (
            <div className="mb-6 rounded-[var(--radius-md)] border-l-[3px] border-danger bg-danger-wash px-4 py-3 text-sm">
              <p className="font-semibold">Your last request needs changes</p>
              <p className="mt-1">{latest.reviewerNote}</p>
            </div>
          ) : null}
          <section className="panel mb-8 p-5">
            <h2 className="font-bold">Before you submit</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {required.map((x) => (
                <li key={x.id} className="flex items-center gap-2">
                  <span className={x.done ? "text-rail" : "text-ink-faint"}>{x.done ? "✓" : "○"}</span>
                  <span className={x.done ? "" : "font-semibold"}>{x.label}</span>
                  {!x.done ? <Link href={x.href} className="text-rail underline">Do this</Link> : null}
                </li>
              ))}
            </ul>
          </section>
          {s.role === "owner" ? <GoLiveForm ready={ready} defaultEmail={s.user.email} defaultName={s.user.name} orgName={s.org.name} /> : <p className="text-ink-soft">Only the account owner can submit the go-live request.</p>}
        </>
      )}
    </>
  );
}
