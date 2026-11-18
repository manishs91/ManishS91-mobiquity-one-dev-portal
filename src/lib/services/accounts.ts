import "server-only";
import { createHash } from "node:crypto";
import { hashPassword, randomId, randomSecret, verifyPassword } from "../crypto";
import { env } from "../env";
import { HttpError } from "../http";
import { audit, now, store, type Role } from "../store";
import { issueCredentials } from "./credentials";

const normEmail = (e: string) => e.trim().toLowerCase();
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

export async function signup(input: { name: string; email: string; password: string; company: string; inviteToken?: string }) {
  const email = normEmail(input.email);

  if (input.inviteToken) return acceptInvite({ ...input, email, inviteToken: input.inviteToken });

  if (env.SIGNUP_POLICY === "allowlist") {
    const domain = email.split("@")[1] ?? "";
    if (!env.allowedDomains.includes(domain)) {
      throw new HttpError(403, "Sign-ups are currently limited to approved companies. Contact the Mobiquity One team for access.");
    }
  }

  const passwordHash = await hashPassword(input.password);
  const { userId, orgId } = await store.write((db) => {
    if (db.users.some((u) => u.email === email)) throw new HttpError(409, "An account with this email already exists. Try signing in.");
    const userId = randomId("usr");
    const orgId = randomId("org");
    const t = now();
    db.users.push({ id: userId, email, name: input.name.trim(), passwordHash, createdAt: t, lastLoginAt: t });
    db.organizations.push({ id: orgId, name: input.company.trim(), createdAt: t, productionStatus: "not_requested" });
    db.memberships.push({ userId, orgId, role: "owner" });
    audit(db, { orgId, actorId: userId, action: "org.created" });
    return { userId, orgId };
  });

  // Instant sandbox access: issue the first credential set straight away.
  // Failure here must not block sign-up; the dashboard offers a retry.
  try {
    const issued = await issueCredentials({ orgId, userId, environment: "sandbox", label: "Default sandbox key" });
    return { userId, orgId, firstCredentials: issued };
  } catch (err) {
    console.error("[signup] sandbox provisioning failed", err);
    return { userId, orgId, firstCredentials: null };
  }
}

export async function login(emailRaw: string, password: string) {
  const email = normEmail(emailRaw);
  const user = store.read((db) => db.users.find((u) => u.email === email));
  // Always run a hash comparison so response time doesn't reveal whether the email exists.
  const ok = await verifyPassword(password, user?.passwordHash ?? "scrypt$16384$AAAAAAAAAAAAAAAAAAAAAA==$AAAA");
  if (!user || !ok) throw new HttpError(401, "Incorrect email or password.");
  const orgId = await store.write((db) => {
    const u = db.users.find((x) => x.id === user.id)!;
    u.lastLoginAt = now();
    return db.memberships.find((m) => m.userId === user.id)?.orgId;
  });
  if (!orgId) throw new HttpError(403, "Your account is not part of any organisation.");
  return { userId: user.id, orgId };
}

/* --------------------------------- team ---------------------------------- */

export function listMembers(orgId: string) {
  return store.read((db) => ({
    members: db.memberships
      .filter((m) => m.orgId === orgId)
      .map((m) => {
        const u = db.users.find((x) => x.id === m.userId)!;
        return { userId: u.id, name: u.name, email: u.email, role: m.role, lastLoginAt: u.lastLoginAt };
      }),
    invites: db.invites
      .filter((i) => i.orgId === orgId && !i.acceptedAt && i.expiresAt > now())
      .map(({ tokenHash: _t, ...i }) => i),
  }));
}

export async function createInvite(orgId: string, actorId: string, emailRaw: string, role: Role) {
  if (role === "owner") throw new HttpError(422, "Invite as admin or developer; ownership can be transferred later.");
  const email = normEmail(emailRaw);
  const token = randomSecret(24);
  await store.write((db) => {
    const existing = db.users.find((u) => u.email === email);
    if (existing && db.memberships.some((m) => m.userId === existing.id && m.orgId === orgId)) {
      throw new HttpError(409, "That person is already on your team.");
    }
    db.invites = db.invites.filter((i) => !(i.orgId === orgId && i.email === email && !i.acceptedAt));
    db.invites.push({
      id: randomId("inv"),
      orgId,
      email,
      role,
      tokenHash: sha(token),
      invitedBy: actorId,
      createdAt: now(),
      expiresAt: new Date(Date.now() + 7 * 864e5).toISOString(),
    });
    audit(db, { orgId, actorId, action: "team.invited", target: email });
  });
  return { inviteUrl: `${env.PORTAL_BASE_URL.replace(/\/$/, "")}/signup?invite=${token}&email=${encodeURIComponent(email)}` };
}

export async function revokeInvite(orgId: string, actorId: string, inviteId: string) {
  await store.write((db) => {
    db.invites = db.invites.filter((i) => !(i.orgId === orgId && i.id === inviteId));
    audit(db, { orgId, actorId, action: "team.invite_revoked", target: inviteId });
  });
}

export async function removeMember(orgId: string, actorId: string, userId: string) {
  await store.write((db) => {
    const m = db.memberships.find((x) => x.orgId === orgId && x.userId === userId);
    if (!m) throw new HttpError(404, "Member not found.");
    if (m.role === "owner") throw new HttpError(422, "The owner cannot be removed.");
    db.memberships = db.memberships.filter((x) => x !== m);
    audit(db, { orgId, actorId, action: "team.removed", target: userId });
  });
}

async function acceptInvite(input: { name: string; email: string; password: string; inviteToken: string }) {
  const passwordHash = await hashPassword(input.password);
  return store.write((db) => {
    const invite = db.invites.find((i) => i.tokenHash === sha(input.inviteToken) && !i.acceptedAt);
    if (!invite || invite.expiresAt < now()) throw new HttpError(400, "This invitation is invalid or has expired. Ask for a new one.");
    if (invite.email !== input.email) throw new HttpError(400, "Use the email address the invitation was sent to.");
    let user = db.users.find((u) => u.email === input.email);
    if (user) throw new HttpError(409, "You already have an account. Sign in first, then open the invitation again.");
    user = { id: randomId("usr"), email: input.email, name: input.name.trim(), passwordHash, createdAt: now(), lastLoginAt: now() };
    db.users.push(user);
    db.memberships.push({ userId: user.id, orgId: invite.orgId, role: invite.role });
    invite.acceptedAt = now();
    audit(db, { orgId: invite.orgId, actorId: user.id, action: "team.joined" });
    return { userId: user.id, orgId: invite.orgId, firstCredentials: null };
  });
}
