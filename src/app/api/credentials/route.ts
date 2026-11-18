import { z } from "zod";
import { parseJson, requireApiSession, route } from "@/lib/http";
import { issueCredentials, listCredentials } from "@/lib/services/credentials";

export const GET = route(async () => {
  const s = await requireApiSession();
  return { credentials: listCredentials(s.org.id) };
});

const Body = z.object({
  label: z.string().trim().max(60).default(""),
  environment: z.enum(["sandbox", "production"]).default("sandbox"),
});

export const POST = route(async (req) => {
  const s = await requireApiSession("admin");
  const input = await parseJson(req, Body);
  return issueCredentials({ orgId: s.org.id, userId: s.user.id, environment: input.environment, label: input.label });
});
