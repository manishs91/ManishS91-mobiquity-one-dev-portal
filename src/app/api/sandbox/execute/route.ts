import { z } from "zod";
import { HttpError, parseJson, requireApiSession, route } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { executeSandboxCall } from "@/lib/services/sandbox";

/** String map with bounded key length, value length and entry count. */
const smallRecord = (maxValue: number) =>
  z
    .record(z.string().max(100), z.string().max(maxValue))
    .refine((o) => Object.keys(o).length <= 30, "Too many entries");

const Body = z.object({
  slug: z.string().min(1).max(200),
  credentialId: z.string().min(1).max(100),
  pathParams: smallRecord(500).optional(),
  query: smallRecord(2000).optional(),
  headers: smallRecord(512).optional(),
  body: z.unknown().optional(),
  autoChecksum: z.boolean().optional(),
});

export const POST = route(async (req) => {
  const s = await requireApiSession();
  const rl = rateLimit(`sandbox:${s.org.id}`, 120, 60_000);
  if (!rl.ok) throw new HttpError(429, `Sandbox console rate limit reached. Try again in ${rl.retryAfter}s.`);
  return executeSandboxCall(s.org.id, s.user.id, await parseJson(req, Body));
});
