import { z } from "zod";
import { parseJson, requireApiSession, route } from "@/lib/http";
import { addWebhook, listWebhooks } from "@/lib/services/webhooks";

export const GET = route(async () => {
  const s = await requireApiSession();
  return listWebhooks(s.org.id);
});

const Body = z.object({
  url: z.string().trim().max(2048),
  kind: z.enum(["primary", "fallback"]),
  environment: z.enum(["sandbox", "production"]).default("sandbox"),
  description: z.string().max(200).optional(),
});

export const POST = route(async (req) => {
  const s = await requireApiSession("admin");
  const input = await parseJson(req, Body);
  return { endpoint: await addWebhook(s.org.id, s.user.id, input) };
});
