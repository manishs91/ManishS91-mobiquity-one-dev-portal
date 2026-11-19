import { z } from "zod";
import { createSession } from "@/lib/auth/session";
import { HttpError, parseJson, route } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { signup } from "@/lib/services/accounts";

const Body = z.object({
  name: z.string().trim().min(2, "Enter your name").max(100),
  email: z.string().trim().email("Enter a valid email").max(254),
  password: z
    .string()
    .min(12, "Use at least 12 characters")
    .max(200)
    .refine((p) => /[a-z]/i.test(p) && /\d/.test(p), "Include letters and at least one number"),
  company: z.string().trim().max(120).default(""),
  inviteToken: z.string().max(200).optional(),
  acceptTerms: z.literal(true, { error: "Accept the developer terms to continue" }),
});

export const POST = route(async (req) => {
  const rl = rateLimit(`signup:${clientIp(req)}`, 5, 60 * 60_000);
  if (!rl.ok) throw new HttpError(429, `Too many sign-ups from this network. Try again in ${Math.ceil(rl.retryAfter / 60)} minutes.`);
  const input = await parseJson(req, Body);
  if (!input.inviteToken && input.company.length < 2) throw new HttpError(422, "Enter your company name");
  const result = await signup(input);
  await createSession(result.userId, result.orgId);
  return {
    ok: true,
    firstCredentials: result.firstCredentials,
  };
});
