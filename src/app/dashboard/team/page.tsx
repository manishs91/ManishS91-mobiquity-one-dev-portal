import { PageHeader } from "@/components/dashboard/PageHeader";
import { requireSession } from "@/lib/auth/session";
import { listMembers } from "@/lib/services/accounts";
import { TeamClient } from "./TeamClient";

export const metadata = { title: "Team" };

export default async function TeamPage() {
  const s = await requireSession("/dashboard/team");
  const { members, invites } = listMembers(s.org.id);
  return (
    <>
      <PageHeader
        title="Team"
        intro="Owners and admins can manage credentials and webhooks. Developers can use the console and read logs, but can't see or change secrets."
      />
      <TeamClient members={members} invites={invites} canManage={s.role !== "developer"} selfId={s.user.id} />
    </>
  );
}
