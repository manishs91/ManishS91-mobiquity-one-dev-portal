"use client";
import { useState } from "react";
import { CopyButton } from "@/components/CopyButton";
import { useApi } from "@/components/useApi";

interface Member { userId: string; name: string; email: string; role: string; lastLoginAt?: string }
interface Invite { id: string; email: string; role: string; expiresAt: string }

export function TeamClient({ members: m0, invites: i0, canManage, selfId }: { members: Member[]; invites: Invite[]; canManage: boolean; selfId: string }) {
  const [members, setMembers] = useState(m0);
  const [invites, setInvites] = useState(i0);
  const [link, setLink] = useState<string | null>(null);
  const inv = useApi<{ inviteUrl: string }>();
  const act = useApi();

  return (
    <div className="space-y-8">
      <ul className="panel divide-y divide-line-soft">
        {members.map((m) => (
          <li key={m.userId} className="flex flex-wrap items-center gap-3 px-5 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{m.name}{m.userId === selfId ? <span className="ml-2 text-xs font-normal text-ink-faint">you</span> : null}</p>
              <p className="text-sm text-ink-soft">{m.email}</p>
            </div>
            <span className="text-sm capitalize text-ink-soft">{m.role}</span>
            {canManage && m.role !== "owner" && m.userId !== selfId ? (
              <button
                className="btn btn-danger btn-sm"
                onClick={async () => {
                  if (!confirm(`Remove ${m.name} from the team?`)) return;
                  if (await act.call(`/api/team/members/${m.userId}`, { method: "DELETE" })) setMembers((l) => l.filter((x) => x.userId !== m.userId));
                }}
              >
                Remove
              </button>
            ) : null}
          </li>
        ))}
        {invites.map((i) => (
          <li key={i.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink-soft">{i.email}</p>
              <p className="text-xs text-ink-faint">Invited, expires {new Date(i.expiresAt).toLocaleDateString()}</p>
            </div>
            <span className="text-sm capitalize text-ink-soft">{i.role}</span>
            {canManage ? (
              <button
                className="btn btn-secondary btn-sm"
                onClick={async () => {
                  if (await act.call(`/api/team/invites/${i.id}`, { method: "DELETE" })) setInvites((l) => l.filter((x) => x.id !== i.id));
                }}
              >
                Cancel invite
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      {act.error ? <p role="alert" className="text-sm text-danger">{act.error}</p> : null}

      {canManage ? (
        <form
          className="panel flex flex-wrap items-end gap-3 p-5"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const f = new FormData(form);
            const email = String(f.get("email"));
            const role = String(f.get("role"));
            const r = await inv.call("/api/team/invites", { body: { email, role } });
            if (r) {
              setLink(r.inviteUrl);
              setInvites((l) => [...l.filter((x) => x.email !== email), { id: crypto.randomUUID(), email, role, expiresAt: new Date(Date.now() + 7 * 864e5).toISOString() }]);
              form.reset();
            }
          }}
        >
          <div className="min-w-[16rem] flex-1">
            <label className="label" htmlFor="inv-email">Invite by email</label>
            <input id="inv-email" name="email" type="email" required className="field" placeholder="teammate@company.com" />
          </div>
          <div>
            <label className="label" htmlFor="inv-role">Role</label>
            <select id="inv-role" name="role" className="field">
              <option value="developer">Developer</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button className="btn btn-primary" disabled={inv.busy}>{inv.busy ? "Creating…" : "Create invite link"}</button>
          {inv.error ? <p role="alert" className="w-full text-sm text-danger">{inv.error}</p> : null}
          {link ? (
            <div className="w-full rounded-[var(--radius-md)] bg-ok-wash p-3 text-sm">
              <p className="font-semibold">Send this link to your teammate. It works once and expires in 7 days.</p>
              <div className="mt-1 flex items-center gap-2">
                <code className="min-w-0 flex-1 break-all">{link}</code>
                <CopyButton text={link} className="!text-brand-ink hover:!bg-white" />
              </div>
            </div>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
