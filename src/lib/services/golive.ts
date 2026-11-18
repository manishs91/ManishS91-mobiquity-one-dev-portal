import "server-only";
import { randomId } from "../crypto";
import { HttpError } from "../http";
import { audit, now, store, type GoLiveRequest } from "../store";

export type GoLiveInput = Omit<GoLiveRequest, "id" | "orgId" | "submittedBy" | "status" | "createdAt" | "reviewedAt" | "reviewedBy" | "reviewerNote">;

/** Readiness checklist shown on the dashboard and enforced before submission. */
export function readiness(orgId: string) {
  return store.read((db) => {
    const creds = db.credentials.filter((c) => c.orgId === orgId && c.environment === "sandbox");
    const logs = db.apiLogs.filter((l) => l.orgId === orgId);
    const ok = (p: string) => logs.some((l) => l.path === p && l.status >= 200 && l.status < 300);
    const hasWebhook = db.webhooks.some((w) => w.orgId === orgId && w.environment === "sandbox");
    const webhookTested = db.deliveries.some((d) => d.orgId === orgId && d.responseStatus && d.responseStatus < 300);
    return [
      { id: "credentials", label: "Create sandbox credentials", done: creds.length > 0, href: "/dashboard/credentials" },
      { id: "token", label: "Generate an access token", done: ok("/authorization/auth/oauth2/token") || logs.some((l) => l.status === 200), href: "/api-reference/post-authorization-auth-oauth2-token" },
      { id: "payment", label: "Make a successful test payment", done: ok("/ecom/initiatePayment") || ok("/ecom/unifiedInitiatePayment"), href: "/api-reference/post-ecom-initiate-payment" },
      { id: "status", label: "Check a payment's status", done: ok("/ecom/payments/enquiry") || ok("/ecom/payments/orderEnquiry"), href: "/api-reference/post-ecom-payments-order-enquiry" },
      { id: "webhook", label: "Register a webhook URL", done: hasWebhook, href: "/dashboard/webhooks" },
      { id: "webhook-test", label: "Receive a test webhook (2xx)", done: webhookTested, href: "/dashboard/webhooks" },
      { id: "refund", label: "Issue a test refund", done: ok("/ecom/refund"), href: "/api-reference/post-ecom-refund" },
    ];
  });
}

export function getGoLive(orgId: string) {
  return store.read((db) => db.goLiveRequests.filter((r) => r.orgId === orgId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]);
}

export async function submitGoLive(orgId: string, userId: string, input: GoLiveInput) {
  const required = ["credentials", "payment", "webhook"];
  const missing = readiness(orgId).filter((c) => required.includes(c.id) && !c.done);
  if (missing.length) throw new HttpError(422, `Finish these first: ${missing.map((m) => m.label).join(", ")}.`);

  return store.write((db) => {
    const org = db.organizations.find((o) => o.id === orgId)!;
    if (org.productionStatus === "pending") throw new HttpError(409, "A go-live request is already under review.");
    if (org.productionStatus === "approved") throw new HttpError(409, "Production access is already approved.");
    const rec: GoLiveRequest = { ...input, id: randomId("glr"), orgId, submittedBy: userId, status: "pending", createdAt: now() };
    db.goLiveRequests.push(rec);
    org.productionStatus = "pending";
    audit(db, { orgId, actorId: userId, action: "golive.submitted", target: rec.id });
    return rec;
  });
}

/* ----------------------------- portal admin ------------------------------ */

export function listPendingGoLive() {
  return store.read((db) =>
    db.goLiveRequests
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((r) => ({ ...r, orgName: db.organizations.find((o) => o.id === r.orgId)?.name ?? r.orgId })),
  );
}

export async function reviewGoLive(reviewerId: string, id: string, decision: "approved" | "rejected", note?: string) {
  return store.write((db) => {
    const rec = db.goLiveRequests.find((r) => r.id === id);
    if (!rec) throw new HttpError(404, "Request not found.");
    if (rec.status !== "pending") throw new HttpError(409, "This request has already been reviewed.");
    rec.status = decision;
    rec.reviewerNote = note;
    rec.reviewedBy = reviewerId;
    rec.reviewedAt = now();
    const org = db.organizations.find((o) => o.id === rec.orgId)!;
    org.productionStatus = decision;
    audit(db, { orgId: rec.orgId, actorId: reviewerId, action: `golive.${decision}`, target: id });
    return rec;
  });
}
