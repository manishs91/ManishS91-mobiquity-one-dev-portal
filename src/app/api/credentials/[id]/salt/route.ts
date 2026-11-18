import { NextResponse } from "next/server";
import { requireApiSession, route } from "@/lib/http";
import { revealSandboxSalt } from "@/lib/services/credentials";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req, { params }) => {
  const s = await requireApiSession("admin");
  const salt = revealSandboxSalt(s.org.id, (await params).id);
  return NextResponse.json({ checksumSalt: salt }, { headers: { "Cache-Control": "no-store" } });
});
