import { z } from "zod";
import { parseJson, requireApiSession, route } from "@/lib/http";
import { createInvite, listMembers } from "@/lib/services/accounts";

export const GET = route(async () => {
  const s = await requireApiSession();
  return listMembers(s.org.id);
});

const Body = z.object({ email: z.string().trim().email().max(254), role: z.enum(["admin", "developer"]) });

export const POST = route(async (req) => {
  const s = await requireApiSession("admin");
  const input = await parseJson(req, Body);
  return createInvite(s.org.id, s.user.id, input.email, input.role);
});
