import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { signToken, verifyToken } from "../crypto";
import { env } from "../env";
import { store, type Membership, type Organization, type User } from "../store";

export const SESSION_COOKIE = "m1dp_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12h

interface SessionPayload {
  uid: string;
  oid: string;
  exp: number; // unix seconds
}

export interface SessionContext {
  user: Omit<User, "passwordHash">;
  org: Organization;
  role: Membership["role"];
  isPortalAdmin: boolean;
}

export async function createSession(userId: string, orgId: string) {
  const payload: SessionPayload = { uid: userId, oid: orgId, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS };
  const jar = await cookies();
  jar.set(SESSION_COOKIE, signToken(payload, env.SESSION_SECRET), {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionContext | null> {
  const jar = await cookies();
  const payload = verifyToken<SessionPayload>(jar.get(SESSION_COOKIE)?.value, env.SESSION_SECRET);
  if (!payload || payload.exp * 1000 < Date.now()) return null;
  return store.read((db) => {
    const user = db.users.find((u) => u.id === payload.uid);
    const membership = db.memberships.find((m) => m.userId === payload.uid && m.orgId === payload.oid);
    const org = db.organizations.find((o) => o.id === payload.oid);
    if (!user || !membership || !org) return null;
    const { passwordHash: _omit, ...safeUser } = user;
    return {
      user: safeUser,
      org,
      role: membership.role,
      isPortalAdmin: env.adminEmails.includes(user.email.toLowerCase()),
    };
  });
}

/** For server components/pages: redirect to login when signed out. */
export async function requireSession(next = "/dashboard"): Promise<SessionContext> {
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(next)}`);
  return session;
}
