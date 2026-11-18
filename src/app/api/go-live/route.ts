import { z } from "zod";
import { parseJson, requireApiSession, route } from "@/lib/http";
import { submitGoLive } from "@/lib/services/golive";

const Body = z.object({
  legalName: z.string().trim().min(2).max(200),
  registrationNumber: z.string().trim().min(2).max(100),
  website: z.string().trim().url().max(300),
  businessCategory: z.string().trim().min(2).max(100),
  expectedMonthlyVolume: z.string().trim().min(1).max(100),
  paymentMethods: z.array(z.enum(["cards", "upi", "wallets", "netbanking", "emi", "bnpl"])).min(1, "Pick at least one payment method"),
  integrationType: z.enum(["s2s", "hosted", "both"]),
  contactName: z.string().trim().min(2).max(100),
  contactEmail: z.string().trim().email().max(254),
  contactPhone: z.string().trim().min(6).max(30),
  notes: z.string().max(2000).optional(),
});

export const POST = route(async (req) => {
  const s = await requireApiSession("owner");
  return { request: await submitGoLive(s.org.id, s.user.id, await parseJson(req, Body)) };
});
