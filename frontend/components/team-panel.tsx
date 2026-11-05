"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { btn, Card, ErrorState, Field, input, Skeleton } from "@/components/ui";
import { ApiError, fetcher, send, type Role, type TeamData } from "@/lib/api";
import { fmtAgo } from "@/lib/format";
import { useMe } from "@/lib/me";

const roleName: Record<Role, string> = { owner: "Owner", admin: "Admin", member: "Member", viewer: "Viewer" };
const roleHelp: [string, string][] = [
  ["Owner", "Everything, including billing and plan changes. One per workspace."],
  ["Admin", "Manage websites, subscriptions, alerts and the team. No billing."],
  ["Member", "Add and edit websites and subscriptions, run audits and download reports."],
  ["Viewer", "Read-only: dashboards and reports. Meant for clients (Growth plan and above)."],
];

export function TeamPanel() {
  const { user, isAdmin, role } = useMe();
  const { data, error, mutate } = useSWR<TeamData>("/api/team", fetcher);
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<{ text: string; limit: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  if (error) return <ErrorState message={error.message} retry={() => mutate()} />;
  if (!data) return <div className="flex flex-col gap-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-64" /></div>;
  const full = data.usage.seats >= data.plan.members;

  async function act(fn: () => Promise<unknown>) {
    setErr(null);
    try { await fn(); await mutate(); } catch (e) { setErr({ text: e instanceof Error ? e.message : "Something went wrong.", limit: e instanceof ApiError && e.code === "limit" }); }
  }

  async function invite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget); setBusy(true); setErr(null);
    try { await send("POST", "/api/team/invites", { email: f.get("email"), role: f.get("role") }); await mutate(); setOpen(false); }
    catch (x) { setErr({ text: x instanceof Error ? x.message : "Could not send the invitation.", limit: x instanceof ApiError && x.code === "limit" }); }
    setBusy(false);
  }

  const canManage = (m: TeamData["members"][number]) => isAdmin && m.role !== "owner" && m.id !== user?.id && !(m.role === "admin" && role !== "owner");

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[15px] text-muted">People who can sign in to this workspace.</p>
        {isAdmin && <button onClick={() => { setOpen(true); setErr(null); }} disabled={full} className={btn.primary}>Invite member</button>}
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div><p className="text-base font-semibold">{data.usage.seats} of {data.plan.members} seats used <span className="text-sm font-normal text-muted">· {data.plan.name} plan</span></p>
          <p className="text-sm text-muted">Pending invitations count as seats.</p></div>
        <div className="h-2 w-full max-w-xs rounded-full bg-line"><div className={`h-2 rounded-full ${full ? "bg-bar-warn" : "bg-brand"}`} style={{ width: `${Math.min(100, (data.usage.seats / data.plan.members) * 100)}%` }} /></div>
        {full && isAdmin && <Link href="/settings?tab=billing" className={btn.secondary}>Upgrade for more seats</Link>}
      </Card>

      {err && <p role="alert" className="rounded-lg bg-bad-soft px-4 py-3 text-sm text-bad">{err.text} {err.limit && <Link href="/settings?tab=billing" className="font-semibold underline">See plans</Link>}</p>}

      {open && (
        <Card className="p-5">
          <form onSubmit={invite} className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">Invite a team member</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email address" htmlFor="email"><input id="email" name="email" type="email" required className={input} /></Field>
              <Field label="Role" htmlFor="role"><select id="role" name="role" defaultValue="member" className={input}>
                {role === "owner" && <option value="admin">Admin</option>}<option value="member">Member</option><option value="viewer">Viewer (read only)</option></select></Field>
            </div>
            <p className="text-sm text-muted">They get an email with a link to set a password. The link works for 7 days.</p>
            <div className="flex justify-end gap-3"><button type="button" onClick={() => setOpen(false)} className={btn.secondary}>Cancel</button>
              <button disabled={busy} className={btn.primary}>{busy ? "Sending…" : "Send invitation"}</button></div>
          </form>
        </Card>
      )}

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead><tr className="border-b border-line bg-soft text-xs uppercase tracking-wide text-muted"><th className="px-5 py-3">Member</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Last active</th><th className="px-5 py-3"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>
            {data.members.map((m) => (
              <tr key={m.id} className="border-b border-line-soft">
                <td className="px-5 py-3.5"><span className="font-semibold">{m.first_name} {m.last_name}{m.id === user?.id && " (you)"}</span><span className="block text-muted">{m.email}</span></td>
                <td className="px-5 py-3.5">{canManage(m) ? (
                  <select aria-label={`Role for ${m.email}`} value={m.role} onChange={(e) => act(() => send("PATCH", `/api/team/members/${m.id}`, { role: e.target.value }))} className="min-h-10 rounded-lg border border-[#c9cfd8] bg-surface px-2">
                    {role === "owner" && <option value="admin">Admin</option>}<option value="member">Member</option><option value="viewer">Viewer</option></select>) : roleName[m.role]}</td>
                <td className="px-5 py-3.5"><span className="rounded-full bg-ok-soft px-2.5 py-1 text-xs font-semibold text-ok">Active</span></td>
                <td className="px-5 py-3.5 text-muted">{m.last_login ? fmtAgo(m.last_login) : "Never"}</td>
                <td className="px-5 py-3.5 text-right">{canManage(m) && <button onClick={() => confirm(`Remove ${m.email} from the team?`) && act(() => send("DELETE", `/api/team/members/${m.id}`))} className="min-h-10 px-2 font-semibold text-bad">Remove</button>}
                  {m.id === user?.id && m.role !== "owner" && <button onClick={() => confirm("Leave this workspace?") && act(() => send("DELETE", `/api/team/members/${m.id}`).then(() => { window.location.href = "/overview"; }))} className="min-h-10 px-2 font-semibold text-bad">Leave</button>}</td>
              </tr>
            ))}
            {data.invites.map((i) => (
              <tr key={i.id} className="border-b border-line-soft last:border-0">
                <td className="px-5 py-3.5"><span className="font-semibold">{i.email}</span></td>
                <td className="px-5 py-3.5">{roleName[i.role]}</td>
                <td className="px-5 py-3.5"><span className="rounded-full bg-warn-soft px-2.5 py-1 text-xs font-semibold text-warn">Invite pending</span></td>
                <td className="px-5 py-3.5 text-muted">Sent {fmtAgo(i.created)}</td>
                <td className="px-5 py-3.5 text-right">{isAdmin && <><button onClick={() => act(() => send("POST", `/api/team/invites/${i.id}/resend`))} className="min-h-10 px-2 font-semibold text-brand">Resend</button>
                  <button onClick={() => act(() => send("DELETE", `/api/team/invites/${i.id}`))} className="min-h-10 px-2 font-semibold text-bad">Cancel</button></>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 text-lg font-semibold">What each role can do</h2>
        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">{roleHelp.map(([k, v]) => <div key={k}><dt className="text-sm font-semibold">{k}</dt><dd className="text-sm text-muted">{v}</dd></div>)}</dl>
      </Card>
    </>
  );
}
