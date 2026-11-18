import { requireApiSession, route } from "@/lib/http";
import { rotateSecret } from "@/lib/services/credentials";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route<Ctx>(async (_req, { params }) => {
  const s = await requireApiSession("admin");
  return rotateSecret(s.org.id, s.user.id, (await params).id);
});
