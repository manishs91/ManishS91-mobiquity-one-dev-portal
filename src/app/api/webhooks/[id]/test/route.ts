import { z } from "zod";
import { HttpError, parseJson, requireApiSession, route } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { sendTestEvent, TEST_EVENTS, type TestEvent } from "@/lib/services/webhooks";

type Ctx = { params: Promise<{ id: string }> };

const Body = z.object({
  event: z.enum(Object.keys(TEST_EVENTS) as [TestEvent, ...TestEvent[]]),
  credentialId: z.string().min(1),
});

export const POST = route<Ctx>(async (req, { params }) => {
  const s = await requireApiSession();
  if (!rateLimit(`wh-test:${s.org.id}`, 30, 60 * 60_000).ok) throw new HttpError(429, "Test event limit reached. Try again later.");
  const input = await parseJson(req, Body);
  return { delivery: await sendTestEvent(s.org.id, s.user.id, { endpointId: (await params).id, ...input }) };
});
