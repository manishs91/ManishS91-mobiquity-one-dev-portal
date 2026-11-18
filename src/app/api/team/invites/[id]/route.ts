import { requireApiSession, route } from "@/lib/http";
import { revokeInvite } from "@/lib/services/accounts";

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = route<Ctx>(async (_req, { params }) => {
  const s = await requireApiSession("admin");
  await revokeInvite(s.org.id, s.user.id, (await params).id);
  return { ok: true };
});
