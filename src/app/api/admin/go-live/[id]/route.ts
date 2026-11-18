import { z } from "zod";
import { HttpError, parseJson, requireApiSession, route } from "@/lib/http";
import { reviewGoLive } from "@/lib/services/golive";

type Ctx = { params: Promise<{ id: string }> };
const Body = z.object({ decision: z.enum(["approved", "rejected"]), note: z.string().max(2000).optional() });

export const POST = route<Ctx>(async (req, { params }) => {
  const s = await requireApiSession();
  if (!s.isPortalAdmin) throw new HttpError(403, "Portal admins only.");
  const input = await parseJson(req, Body);
  return { request: await reviewGoLive(s.user.id, (await params).id, input.decision, input.note) };
});
