import { PageHeader } from "@/components/dashboard/PageHeader";
import { requireSession } from "@/lib/auth/session";
import { listCredentials } from "@/lib/services/credentials";
import { CredentialsClient } from "./CredentialsClient";

export const metadata = { title: "API credentials" };

export default async function CredentialsPage() {
  const s = await requireSession("/dashboard/credentials");
  return (
    <>
      <PageHeader
        title="API credentials"
        intro="Each credential set has its own tenant ID, client secret and checksum salt. Use separate sets per app or environment so you can rotate one without breaking the others."
      />
      <CredentialsClient
        initial={listCredentials(s.org.id)}
        canManage={s.role !== "developer"}
        productionApproved={s.org.productionStatus === "approved"}
      />
    </>
  );
}
