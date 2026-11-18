import { requireApiSession, route } from "@/lib/http";
import { revokeCredentials } from "@/lib/services/credentials";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route<Ctx>(async (_req, { params }) => {
  const s = await requireApiSession("admin");
  return { credential: await revokeCredentials(s.org.id, s.user.id, (await params).id) };
});
