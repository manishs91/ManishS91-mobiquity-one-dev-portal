import { HttpError, requireApiSession, route } from "@/lib/http";
import { removeMember } from "@/lib/services/accounts";

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = route<Ctx>(async (_req, { params }) => {
  const s = await requireApiSession("admin");
  const id = (await params).id;
  if (id === s.user.id) throw new HttpError(422, "You can't remove yourself.");
  await removeMember(s.org.id, s.user.id, id);
  return { ok: true };
});
