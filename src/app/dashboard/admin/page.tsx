import { notFound } from "next/navigation";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { requireSession } from "@/lib/auth/session";
import { listPendingGoLive } from "@/lib/services/golive";
import { ReviewButtons } from "./ReviewButtons";

export const metadata = { title: "Go-live reviews" };

export default async function AdminPage() {
  const s = await requireSession("/dashboard/admin");
  if (!s.isPortalAdmin) notFound();
  const requests = listPendingGoLive();
  return (
    <>
      <PageHeader title="Go-live reviews" intro="Visible to Mobiquity One staff listed in PORTAL_ADMIN_EMAILS. Approving enables production credentials for that organisation." />
      {requests.length === 0 ? <p className="text-ink-soft">No requests yet.</p> : null}
      <ul className="space-y-3">
        {requests.map((r) => (
          <li key={r.id} className="panel p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-bold">{r.legalName} <span className="font-normal text-ink-soft">({r.orgName})</span></p>
                <p className="text-sm text-ink-soft">Submitted {new Date(r.createdAt).toLocaleString()}, status: <span className="font-semibold">{r.status}</span></p>
              </div>
              {r.status === "pending" ? <ReviewButtons id={r.id} /> : null}
            </div>
            <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div><dt className="text-xs text-ink-faint">Registration</dt><dd>{r.registrationNumber}</dd></div>
              <div><dt className="text-xs text-ink-faint">Website</dt><dd><a href={r.website} className="text-rail underline" rel="noopener noreferrer" target="_blank">{r.website}</a></dd></div>
              <div><dt className="text-xs text-ink-faint">Category</dt><dd>{r.businessCategory}</dd></div>
              <div><dt className="text-xs text-ink-faint">Monthly volume</dt><dd>{r.expectedMonthlyVolume}</dd></div>
              <div><dt className="text-xs text-ink-faint">Methods</dt><dd>{r.paymentMethods.join(", ")}</dd></div>
              <div><dt className="text-xs text-ink-faint">Integration</dt><dd>{r.integrationType}</dd></div>
              <div><dt className="text-xs text-ink-faint">Contact</dt><dd>{r.contactName}, {r.contactEmail}, {r.contactPhone}</dd></div>
              {r.notes ? <div className="sm:col-span-2"><dt className="text-xs text-ink-faint">Notes</dt><dd>{r.notes}</dd></div> : null}
              {r.reviewerNote ? <div className="sm:col-span-2"><dt className="text-xs text-ink-faint">Reviewer note</dt><dd>{r.reviewerNote}</dd></div> : null}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
