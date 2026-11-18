import { z } from "zod";
import { createSession } from "@/lib/auth/session";
import { HttpError, parseJson, route } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { login } from "@/lib/services/accounts";

const Body = z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(200) });

export const POST = route(async (req) => {
  const input = await parseJson(req, Body);
  const byIp = rateLimit(`login-ip:${clientIp(req)}`, 30, 15 * 60_000);
  const byEmail = rateLimit(`login-email:${input.email.toLowerCase()}`, 8, 15 * 60_000);
  if (!byIp.ok || !byEmail.ok) throw new HttpError(429, "Too many sign-in attempts. Wait a few minutes and try again.");
  const { userId, orgId } = await login(input.email, input.password);
  await createSession(userId, orgId);
  return { ok: true };
});
