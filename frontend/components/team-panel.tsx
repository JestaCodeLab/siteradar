"use client";

import { Select } from "./select";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { MoreHorizontal } from "lucide-react";
import { ErrorState, Skeleton } from "@/components/ui";
import { ApiError, fetcher, send, type Role, type SitesResponse, type TeamData } from "@/lib/api";
import { fmtAgo } from "@/lib/format";
import { useMe } from "@/lib/me";

const roleName: Record<Role, string> = { owner: "Owner", admin: "Admin", member: "Member", viewer: "Viewer" };
const roles: [string, string][] = [
  ["Owner", "Everything, including billing, the plan and deleting the workspace. One per workspace."],
  ["Admin", "Manage websites, subscriptions, alerts and team members. Cannot change billing."],
  ["Member", "Add and edit websites and subscriptions, run audits and download reports."],
  ["Viewer", "Read-only access to dashboards and reports. A good fit for clients. Growth and Scale plans."],
];
const NEXT: Record<string, string> = { free: "Starter", starter: "Growth", growth: "Scale" };
const AVATARS = ["#1f4fd8", "#0b7a4b", "#8a5a00", "#5b6472", "#4a33b0", "#b3261e", "#0f1420"];
const color = (s: string) => AVATARS[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATARS.length];
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
const GRID = "minmax(220px,2fr) 110px 130px 130px 44px";
const field = "min-h-[46px] w-full rounded-lg border border-[#c9cfd8] bg-surface px-3.5 text-[15px]";

function SiteChooser({ sites, value, onChange }: { sites: { id: string; name: string }[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <fieldset className="flex flex-col gap-1.5 rounded-lg border border-line p-3">
      <legend className="px-1 text-[13px] text-muted">Choose the websites they can see</legend>
      {sites.length === 0 && <p className="text-sm text-muted">Add a website first.</p>}
      {sites.map((s) => (
        <label key={s.id} className="flex min-h-9 items-center gap-2.5 text-sm"><input type="checkbox" checked={value.includes(s.id)} className="size-4"
          onChange={(e) => onChange(e.target.checked ? [...value, s.id] : value.filter((x) => x !== s.id))} />{s.name}</label>
      ))}
    </fieldset>
  );
}

function RowMenu({ children }: { children: (close: () => void) => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", down); return () => document.removeEventListener("mousedown", down);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-label="Actions" className="flex size-11 items-center justify-center rounded-lg text-muted hover:bg-soft"><MoreHorizontal size={18} aria-hidden="true" /></button>
      {open && <div role="menu" className="absolute right-0 top-11 z-20 w-56 rounded-xl border border-line bg-surface p-1.5 shadow-lg">{children(() => setOpen(false))}</div>}
    </div>
  );
}
const mi = "flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm hover:bg-soft";

export function TeamPanel() {
  const { user, isAdmin, role } = useMe();
  const { data, error, mutate } = useSWR<TeamData>("/api/team", fetcher);
  const { data: siteData } = useSWR<SitesResponse>("/api/sites", fetcher);
  const [open, setOpen] = useState(false);
  const [access, setAccess] = useState<"all" | "some">("all");
  const [picked, setPicked] = useState<string[]>([]);
  const [editing, setEditing] = useState<{ id: number; ids: string[] } | null>(null);
  const [err, setErr] = useState<{ text: string; limit: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  if (error) return <ErrorState message={error.message} retry={() => mutate()} />;
  if (!data) return <div className="flex flex-col gap-4"><Skeleton className="h-24" /><Skeleton className="h-64" /></div>;
  const sites = (siteData?.sites ?? []).map((s) => ({ id: s.id, name: s.name }));
  const used = data.usage.seats, cap = data.plan.members, full = used >= cap;
  const next = NEXT[data.plan.id];
  const canManage = (m: TeamData["members"][number]) => isAdmin && m.role !== "owner" && m.id !== user?.id && !(m.role === "admin" && role !== "owner");

  async function act(fn: () => Promise<unknown>) {
    setErr(null);
    try { await fn(); await mutate(); } catch (e) { setErr({ text: e instanceof Error ? e.message : "Something went wrong.", limit: e instanceof ApiError && e.code === "limit" }); }
  }
  async function invite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget); setBusy(true); setErr(null);
    try { await send("POST", "/api/team/invites", { email: f.get("email"), role: f.get("role"), site_ids: access === "some" ? picked : null }); await mutate(); setOpen(false); setPicked([]); setAccess("all"); }
    catch (x) { setErr({ text: x instanceof Error ? x.message : "Could not send the invitation.", limit: x instanceof ApiError && x.code === "limit" }); }
    setBusy(false);
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[15px] text-muted">People who can sign in to this workspace.</p>
        {isAdmin && <button onClick={() => { setOpen(!open); setErr(null); }} disabled={full} className="inline-flex min-h-11 items-center rounded-lg bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-[#c9cfd8]">Invite member</button>}
      </div>

      <section aria-label="Seats" className="flex flex-wrap items-center justify-between gap-4 rounded-[14px] border border-line bg-surface px-[22px] py-5">
        <div className="flex min-w-[260px] flex-1 flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2.5"><span className="text-base font-semibold">{used} of {cap} team members used</span>
            <span className="rounded-full bg-brand-soft px-2.5 py-[3px] text-xs font-semibold text-brand-ink">{data.plan.name} plan</span></div>
          <div className="h-2 max-w-[420px] rounded bg-[#e8ebf0]"><div className={`h-2 rounded ${full ? "bg-bar-warn" : "bg-brand"}`} style={{ width: `${Math.min(100, (used / Math.max(cap, 1)) * 100)}%` }} /></div>
          <span className="text-[13px] text-muted">{full ? "No seats left on this plan." : `${cap - used} seat${cap - used === 1 ? "" : "s"} left. Pending invitations count as a seat.`}</span>
        </div>
        {isAdmin && <Link href="/settings?tab=billing" className={`inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-semibold ${full && next ? "bg-brand text-white" : "border border-[#c9cfd8] bg-surface hover:bg-soft"}`}>{full && next ? `Upgrade to ${next}` : "See plans"}</Link>}
      </section>

      {full && isAdmin && next && <p role="status" className="rounded-xl bg-warn-soft px-5 py-3.5 text-[15px] leading-relaxed text-warn">Your team is full. Upgrade to <b>{next}</b> to add more members, or remove someone first.</p>}
      {err && <p role="alert" className="rounded-lg bg-bad-soft px-4 py-3 text-sm text-bad">{err.text} {err.limit && <Link href="/settings?tab=billing" className="font-semibold underline">See plans</Link>}</p>}

      {open && (
        <form onSubmit={invite} className="flex flex-col gap-[18px] rounded-[14px] border border-line bg-surface p-[22px]">
          <h2 className="text-lg font-semibold">Invite a team member</h2>
          <div className="flex flex-wrap gap-[18px]">
            <div className="flex flex-[2_1_260px] flex-col gap-2"><label htmlFor="em" className="text-sm font-medium">Email address</label><input id="em" name="email" type="email" required placeholder="colleague@company.com" className={field} /></div>
            <div className="flex flex-[1_1_180px] flex-col gap-2"><label htmlFor="role" className="text-sm font-medium">Role</label>
              <Select id="role" name="role" defaultValue="member" options={[{ value: "member", label: "Member" }, ...(role === "owner" ? [{ value: "admin", label: "Admin" }] : []), { value: "viewer", label: "Viewer (read only)" }]} /></div>
            <div className="flex flex-[1_1_200px] flex-col gap-2"><label htmlFor="acc" className="text-sm font-medium">Website access</label>
              <Select id="acc" value={access} onChange={(v) => setAccess(v as "all" | "some")} options={[{ value: "all", label: "All websites" }, { value: "some", label: "Only selected websites" }]} /></div>
          </div>
          {access === "some" && <SiteChooser sites={sites} value={picked} onChange={setPicked} />}
          <div className="flex flex-wrap items-center justify-end gap-3">
            <span className="mr-auto text-[13px] text-muted">They get an email with a link to set a password. The link works for 7 days.</span>
            <button type="button" onClick={() => setOpen(false)} className="inline-flex min-h-11 items-center rounded-lg border border-[#c9cfd8] bg-surface px-[18px] text-sm font-semibold hover:bg-soft">Cancel</button>
            <button disabled={busy || (access === "some" && picked.length === 0)} className="inline-flex min-h-11 items-center rounded-lg bg-brand px-[18px] text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60">{busy ? "Sending…" : "Send invitation"}</button>
          </div>
        </form>
      )}

      <section aria-label="Members" className="overflow-hidden rounded-xl border border-line bg-surface">
        <div className="overflow-x-auto"><div className="min-w-[720px]">
          <div style={{ display: "grid", gridTemplateColumns: GRID }} className="items-center gap-4 border-b border-line bg-soft px-5 py-3 text-xs font-semibold uppercase tracking-[0.04em] text-muted"><span>Member</span><span>Role</span><span>Status</span><span>Last active</span><span /></div>
          {data.members.map((m) => {
            const name = `${m.first_name} ${m.last_name}`.trim();
            return (
              <div key={m.id}>
                <div style={{ display: "grid", gridTemplateColumns: GRID }} className="min-h-[60px] items-center gap-4 border-b border-line-soft px-5 py-2.5">
                  <span className="flex min-w-0 items-center gap-3"><span style={{ background: color(m.email) }} className="flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white">{initials(name || m.email)}</span>
                    <span className="min-w-0"><span className="block truncate text-sm font-semibold">{name || m.email}{m.id === user?.id && " (you)"}</span><span className="block truncate text-[13px] text-muted">{m.email}</span>
                      {m.site_access && <span className="block text-xs text-muted">{m.site_access.length} website{m.site_access.length === 1 ? "" : "s"} only</span>}</span></span>
                  <span className="text-sm font-medium">{roleName[m.role]}</span>
                  <span><span className="rounded-full bg-ok-soft px-2.5 py-[3px] text-xs font-semibold text-ok">Active</span></span>
                  <span className="text-[13px] text-muted">{m.last_login ? fmtAgo(m.last_login) : "Not yet"}</span>
                  <span>{canManage(m) ? (
                    <RowMenu>{(close) => (<>
                      {(["admin", "member", "viewer"] as Role[]).filter((r) => r !== m.role && (r !== "admin" || role === "owner")).map((r) => <button key={r} role="menuitem" className={mi} onClick={() => { close(); act(() => send("PATCH", `/api/team/members/${m.id}`, { role: r })); }}>Make {roleName[r]}</button>)}
                      {m.role !== "admin" && <button role="menuitem" className={mi} onClick={() => { close(); setEditing({ id: m.id, ids: m.site_access ?? [] }); }}>Website access</button>}
                      <button role="menuitem" className={`${mi} text-bad`} onClick={() => { close(); if (confirm(`Remove ${m.email} from the team?`)) act(() => send("DELETE", `/api/team/members/${m.id}`)); }}>Remove from team</button></>)}</RowMenu>
                  ) : m.id === user?.id && m.role !== "owner" ? (
                    <RowMenu>{(close) => <button role="menuitem" className={`${mi} text-bad`} onClick={() => { close(); if (confirm("Leave this workspace?")) act(() => send("DELETE", `/api/team/members/${m.id}`).then(() => { window.location.href = "/overview"; })); }}>Leave workspace</button>}</RowMenu>
                  ) : null}</span>
                </div>
                {editing?.id === m.id && (
                  <div className="flex flex-col gap-3 border-b border-line-soft bg-soft px-5 py-4">
                    <SiteChooser sites={sites} value={editing.ids} onChange={(ids) => setEditing({ id: m.id, ids })} />
                    <div className="flex gap-2.5">
                      <button onClick={() => act(async () => { await send("PATCH", `/api/team/members/${m.id}`, { role: m.role, site_ids: editing.ids }); setEditing(null); })} className="inline-flex min-h-11 items-center rounded-lg bg-brand px-[18px] text-sm font-semibold text-white">Save access</button>
                      <button onClick={() => act(async () => { await send("PATCH", `/api/team/members/${m.id}`, { role: m.role, site_ids: [] }); setEditing(null); })} className="inline-flex min-h-11 items-center rounded-lg border border-[#c9cfd8] bg-surface px-[18px] text-sm font-semibold">Give access to all websites</button>
                      <button onClick={() => setEditing(null)} className="inline-flex min-h-11 items-center px-3 text-sm font-semibold text-muted">Cancel</button></div>
                  </div>)}
              </div>
            );
          })}
          {data.invites.map((i) => (
            <div key={i.id} style={{ display: "grid", gridTemplateColumns: GRID }} className="min-h-[60px] items-center gap-4 border-b border-line-soft px-5 py-2.5 last:border-0">
              <span className="flex min-w-0 items-center gap-3"><span style={{ background: color(i.email) }} className="flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white">{initials(i.email)}</span>
                <span className="min-w-0"><span className="block truncate text-sm font-semibold">{i.email}</span>{i.site_access && <span className="block text-xs text-muted">{i.site_access.length} website{i.site_access.length === 1 ? "" : "s"} only</span>}</span></span>
              <span className="text-sm font-medium">{roleName[i.role]}</span>
              <span><span className="rounded-full bg-warn-soft px-2.5 py-[3px] text-xs font-semibold text-warn">Invite pending</span></span>
              <span className="text-[13px] text-muted">Not yet</span>
              <span>{isAdmin && <RowMenu>{(close) => (<>
                <button role="menuitem" className={mi} onClick={() => { close(); act(() => send("POST", `/api/team/invites/${i.id}/resend`)); }}>Resend invitation</button>
                <button role="menuitem" className={`${mi} text-bad`} onClick={() => { close(); act(() => send("DELETE", `/api/team/invites/${i.id}`)); }}>Cancel invitation</button></>)}</RowMenu>}</span>
            </div>
          ))}
        </div></div>
      </section>

      <section aria-label="Roles" className="rounded-[14px] border border-line bg-surface p-[22px]">
        <h2 className="mb-3.5 text-lg font-semibold">What each role can do</h2>
        <div className="grid gap-x-8 gap-y-3.5 sm:grid-cols-2">{roles.map(([k, v]) => <div key={k} className="flex flex-col gap-0.5"><span className="text-sm font-semibold">{k}</span><span className="text-sm leading-snug text-muted">{v}</span></div>)}</div>
      </section>
    </>
  );
}
