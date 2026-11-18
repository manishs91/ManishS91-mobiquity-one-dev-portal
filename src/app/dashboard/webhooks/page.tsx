import Link from "next/link";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { requireSession } from "@/lib/auth/session";
import { listCredentials } from "@/lib/services/credentials";
import { listWebhooks } from "@/lib/services/webhooks";
import { WebhooksClient } from "./WebhooksClient";

export const metadata = { title: "Webhooks" };

export default async function WebhooksPage() {
  const s = await requireSession("/dashboard/webhooks");
  const { endpoints, deliveries } = listWebhooks(s.org.id);
  const creds = listCredentials(s.org.id, "sandbox").filter((c) => c.status === "active");
  return (
    <>
      <PageHeader
        title="Webhooks"
        intro={
          <>
            Mobiquity One posts the final transaction status to the <code>primaryWebhookURL</code> you send with each payment, and retries on the{" "}
            <code>fallbackWebhookURL</code>. Save your URLs here to reuse them in the console and to send test events. See the{" "}
            <Link href="/docs/webhooks" className="text-rail underline">webhooks guide</Link>.
          </>
        }
      />
      <WebhooksClient initialEndpoints={endpoints} initialDeliveries={deliveries} credentials={creds.map((c) => ({ id: c.id, label: c.label }))} canManage={s.role !== "developer"} />
    </>
  );
}
