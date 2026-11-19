import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { getSession, type SessionContext } from "./auth/session";
import type { Role } from "./store";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

/**
 * CSRF defence for cookie-authenticated JSON routes: the browser always sends
 * Origin on cross-site POST/DELETE; reject anything that is not this host.
 */
export function assertSameOrigin(req: Request) {
  if (req.method === "GET" || req.method === "HEAD") return;
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!origin || !host) throw new HttpError(403, "Missing origin");
  if (new URL(origin).host !== host) throw new HttpError(403, "Cross-origin request blocked");
}

export async function parseJson<S extends z.ZodType>(req: Request, schema: S): Promise<z.output<S>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new HttpError(400, "Request body must be valid JSON");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new HttpError(422, "Validation failed", parsed.error.issues.map((i) => ({ field: i.path.map(String).join("."), message: i.message })));
  }
  return parsed.data;
}

const ROLE_RANK: Record<Role, number> = { developer: 1, admin: 2, owner: 3 };

export async function requireApiSession(minRole: Role = "developer"): Promise<SessionContext> {
  const session = await getSession();
  if (!session) throw new HttpError(401, "Sign in required");
  if (ROLE_RANK[session.role] < ROLE_RANK[minRole]) throw new HttpError(403, `Requires ${minRole} role`);
  return session;
}

/** Wrap a route handler: same-origin check, uniform JSON errors, no stack traces leaked. */
export function route<C = unknown>(handler: (req: Request, ctx: C) => Promise<Response | unknown>) {
  return async (req: Request, ctx: C) => {
    try {
      assertSameOrigin(req);
      const result = await handler(req, ctx);
      return result instanceof Response ? result : NextResponse.json(result ?? { ok: true });
    } catch (err) {
      if (err instanceof HttpError) {
        return NextResponse.json({ error: err.message, details: err.details }, { status: err.status });
      }
      console.error("[api]", err);
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
  };
}
