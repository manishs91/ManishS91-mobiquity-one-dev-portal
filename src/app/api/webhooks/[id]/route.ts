import { requireApiSession, route } from "@/lib/http";
import { deleteWebhook } from "@/lib/services/webhooks";

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = route<Ctx>(async (_req, { params }) => {
  const s = await requireApiSession("admin");
  await deleteWebhook(s.org.id, s.user.id, (await params).id);
  return { ok: true };
});
