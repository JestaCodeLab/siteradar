"use client";

import { opts, Select } from "@/components/select";
import { useNoteToast } from "@/components/toast";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import { Globe, History, StickyNote, Trash2 } from "lucide-react";
import { EraseCustomerDialog } from "@/components/admin/erase-customer";
import { Avatar, AdminCard, EmptyState, Pill, aBtn, aInput, money, shortDate, statusTone, whenAgo } from "@/components/admin/ui";
import { ErrorState, Skeleton } from "@/components/ui";
import { fetcher, send } from "@/lib/api";
import { fmtDateTime } from "@/lib/format";
import { useMe } from "@/lib/me";
import type { CustomerRow } from "../page";

interface Detail {
  customer: CustomerRow & { cycle: string; comped: boolean; plan_status: string };
  limits_override: Record<string, number>; base_limits: Record<string, number>;
  billing: { k: string; v: string }[]; usage: { label: string; text: string; pct: number }[];
  sites: { id: string; name: string; url: string; paused: boolean; status: string; last_check: number | null }[];
  team: { members: { id: number; email: string; first_name: string; last_name: string; role: string }[]; invites: { id: number; email: string }[] };
  payments: { reference: string; plan_id: string; cycle: string; amount: number; status: string; method: string | null; created: number; paid: number | null; refunded: number | null }[];
  failed: { ts: number; amount: number; plan_id: string } | null;
  notes: { ts: number; admin: string; text: string }[]; audit: { ts: number; text: string; tone: string }[];
  grace_days: number; plans: { id: string; name: string }[];
}
type Panel = null | "support" | "plan" | "free" | "limits" | "refund";
const dot: Record<string, string> = { purple: "#6B4FE0", bad: "#B3261E", ok: "#0B7A4B", muted: "#5B6472" };
const LIMIT_FIELDS: [string, string][] = [["sites", "Websites"], ["members", "Team members"], ["sms", "SMS per month"], ["interval_minutes", "Check every (min)"], ["history_months", "History (months)"], ["audit_pages", "Audit pages"], ["storage_mb", "Invoice storage (MB)"]];
const reasons = ["Support request from the customer", "Billing or payment question", "Investigating a bug", "Other"];

export default function CustomerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { mutate: refreshMe } = useMe();
  const { data, error, mutate } = useSWR<Detail>(`/api/admin/customers/${id}`, fetcher);
  const [panel, setPanel] = useState<Panel>(null);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const setNote = useNoteToast();
  const [busy, setBusy] = useState(false);
  const [erasing, setErasing] = useState(false);

  if (error) return <ErrorState message={error.message} retry={() => mutate()} />;
  if (!data) return <Skeleton className="h-96" />;
  const c = data.customer;
  const owner = c.owner;

  async function run(fn: () => Promise<unknown>, ok?: string) {
    setBusy(true); setNote(null);
    try { await fn(); await mutate(); if (ok) setNote({ ok: true, text: ok }); setPanel(null); }
    catch (e) { setNote({ ok: false, text: e instanceof Error ? e.message : "Something went wrong." }); }
    setBusy(false);
  }
  const patch = (body: object, ok?: string) => run(() => send("PATCH", `/api/admin/customers/${id}`, body), ok);

  async function startSupport(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    await run(async () => {
      await send("POST", `/api/admin/customers/${id}/support`, { reason: `${f.get("reason")}: ${f.get("detail")}`, mode });
      await refreshMe(); router.push("/overview");
    });
  }

  const radio = (on: boolean) => `min-h-[72px] rounded-xl p-3 px-4 text-left ${on ? "border-2 border-[#6B4FE0] bg-[#F5F1FF]" : "border border-[#C9CFD8] bg-white"}`;
  const refundable = data.payments.filter((p) => p.status === "success" && (p.refunded ?? 0) < p.amount);

  return (
    <>
      <nav aria-label="Breadcrumb" className="flex gap-2 text-sm text-[#5B6472]"><Link href="/admin/customers" className="font-medium text-[#4A33B0]">Customers</Link><span aria-hidden="true">/</span><span>{c.name}</span></nav>

      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar name={c.name} size={56} />
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2.5"><h1 className="text-[28px] font-semibold">{c.name}</h1><Pill className="!text-[13px]">{c.plan_name}</Pill><Pill tone={statusTone(c.status)} className="!text-[13px]">{c.status}</Pill></div>
            <span className="text-sm text-[#5B6472]">{owner ? `Owner ${owner.name} · ${owner.email}${owner.phone ? ` · ${owner.phone}` : ""} · ` : ""}joined {shortDate(c.created)}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button onClick={() => setPanel(panel === "support" ? null : "support")} className={aBtn.primary}>Log in as owner</button>
          <button onClick={() => setPanel(panel === "plan" ? null : "plan")} className={aBtn.secondary}>Change plan</button>
          <button onClick={() => confirm(c.suspended ? "Reactivate this account?" : "Suspend this account? Monitoring stops and the customer cannot open their data.") && patch({ suspended: !c.suspended })} className={c.suspended ? aBtn.secondary : aBtn.danger}>{c.suspended ? "Reactivate" : "Suspend"}</button>
        </div>
      </header>


      {panel === "support" && (
        <form role="dialog" aria-label="Log in as owner" onSubmit={startSupport} className="flex flex-col gap-[18px] rounded-[14px] border-2 border-[#6B4FE0] bg-white p-[22px]">
          <div className="flex max-w-[720px] flex-col gap-1"><span className="text-[17px] font-semibold">Log in as {owner?.name ?? "the owner"}</span>
            <span className="text-sm leading-relaxed text-[#5B6472]">You will see exactly what {owner?.name.split(" ")[0] ?? "they"} see{owner ? "s" : ""}, with a purple banner on every page. The session ends after 30 minutes. It is written to the audit trail with your name and reason. The customer is not notified.</span></div>
          <div className="flex flex-wrap gap-[18px]">
            <div className="flex flex-[1_1_220px] flex-col gap-2"><label htmlFor="why" className="text-sm font-medium">Reason</label><Select id="why" name="reason" defaultValue={reasons[0]} options={opts(reasons)} /></div>
            <div className="flex flex-[2_1_320px] flex-col gap-2"><label htmlFor="what" className="text-sm font-medium">What are you helping with? <span className="text-[#B3261E]">Required</span></label>
              <input id="what" name="detail" required minLength={5} placeholder="For example: report shows the wrong month" className={aInput} /></div>
          </div>
          <div className="flex flex-col gap-2.5"><span id="acc" className="text-sm font-medium">Access</span>
            <div role="radiogroup" aria-labelledby="acc" className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
              <button type="button" role="radio" aria-checked={mode === "view"} onClick={() => setMode("view")} className={radio(mode === "view")}><span className="block text-[15px] font-semibold">View only (recommended)</span><span className="mt-0.5 block text-[13px] leading-snug text-[#5B6472]">Look around. Nothing can be changed.</span></button>
              <button type="button" role="radio" aria-checked={mode === "edit"} onClick={() => setMode("edit")} className={radio(mode === "edit")}><span className="block text-[15px] font-semibold">Full access</span><span className="mt-0.5 block text-[13px] leading-snug text-[#5B6472]">Can edit websites and settings. Not passwords, payment details or deleting the workspace.</span></button>
            </div></div>
          <div className="flex flex-wrap justify-end gap-2.5"><button type="button" onClick={() => setPanel(null)} className={`${aBtn.secondary} !min-h-[46px] !px-5`}>Cancel</button><button disabled={busy} className={`${aBtn.primary} !min-h-[46px] !px-[22px]`}>{busy ? "Starting…" : "Start session"}</button></div>
        </form>
      )}

      {panel === "plan" && (
        <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); patch({ plan_id: f.get("plan_id"), cycle: f.get("cycle"), extend_days: Number(f.get("days")) || undefined }, "Plan updated."); }}
          className="flex flex-wrap items-end gap-4 rounded-[14px] border-2 border-[#6B4FE0] bg-white p-[22px]">
          <label className="flex flex-col gap-1.5 text-sm font-medium">Plan<Select ariaLabel="Plan" name="plan_id" defaultValue={c.plan_id} className="w-44" options={data.plans.map((p) => ({ value: p.id, label: p.name }))} /></label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">Billing<Select ariaLabel="Billing" name="cycle" defaultValue={c.cycle} className="w-36" options={[{ value: "monthly", label: "Monthly" }, { value: "yearly", label: "Yearly" }]} /></label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">Active for (days, optional)<input name="days" type="number" min={1} className={`${aInput} !w-40`} /></label>
          <button disabled={busy} className={aBtn.primary}>Apply plan</button><button type="button" onClick={() => setPanel(null)} className={aBtn.secondary}>Cancel</button>
          <p className="w-full text-[13px] text-[#5B6472]">This sets the plan without taking payment. Sites above a lower plan&apos;s limit are paused, not deleted.</p>
        </form>
      )}

      {data.failed && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#FBE7E5] px-5 py-4">
          <span className="max-w-[680px] text-sm leading-relaxed text-[#B3261E]"><b>Payment failed on {shortDate(data.failed.ts)}.</b> The workspace keeps working for {data.grace_days} days after the plan period ends, then becomes read-only.</span>
          <span className="flex gap-2">
            <button disabled={busy} onClick={() => run(() => send("POST", `/api/admin/customers/${id}/payment-link`), "Payment link sent to the owner.")} className="inline-flex min-h-11 items-center rounded-lg border border-[#B3261E] bg-white px-4 text-sm font-semibold text-[#B3261E]">Send payment link</button>
            <button disabled={busy} onClick={() => run(async () => { const r = await send<{ result: string }>("POST", `/api/admin/customers/${id}/retry-payment`); setNote({ ok: r.result !== "failed", text: r.result === "charged" ? "Payment collected." : r.result === "link" ? "No saved card, so a payment link was emailed instead." : "The charge failed again." }); })} className="inline-flex min-h-11 items-center rounded-lg bg-[#B3261E] px-4 text-sm font-semibold text-white">Retry payment</button></span>
        </div>
      )}

      <div className="flex flex-wrap items-stretch gap-5">
        <AdminCard label="Plan and billing" className="flex min-w-0 flex-[1_1_400px] flex-col gap-3.5">
          <h2 className="text-lg font-semibold">Plan and billing</h2>
          <dl className="flex flex-col">{data.billing.map((b) => <div key={b.k} className="flex justify-between gap-4 border-t border-[#EDEFF3] py-2.5 text-sm"><dt className="text-[#5B6472]">{b.k}</dt><dd className="text-right font-medium">{b.v}</dd></div>)}</dl>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setPanel(panel === "free" ? null : "free")} className={aBtn.small}>Give a free period</button>
            <button onClick={() => setPanel(panel === "limits" ? null : "limits")} className={aBtn.small}>Set custom limits</button>
            <button onClick={() => setPanel(panel === "refund" ? null : "refund")} className={aBtn.small} disabled={refundable.length === 0}>Issue refund</button>
            <button onClick={() => patch({ comped: !c.comped }, c.comped ? "Complimentary status removed." : "Marked complimentary.")} className={aBtn.small}>{c.comped ? "Remove complimentary" : "Mark complimentary"}</button>
          </div>
          {panel === "free" && (
            <form onSubmit={(e) => { e.preventDefault(); patch({ free_days: Number(new FormData(e.currentTarget).get("days")) }, "Free period added."); }} className="flex flex-wrap items-end gap-3 rounded-xl bg-[#F5F1FF] p-4">
              <label className="flex flex-col gap-1.5 text-sm font-medium">Extra days on the current plan<input name="days" type="number" min={1} defaultValue={30} required className={`${aInput} !w-36`} /></label>
              <button disabled={busy} className={aBtn.primary}>Add days</button></form>)}
          {panel === "limits" && (
            <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); const o: Record<string, number> = {}; LIMIT_FIELDS.forEach(([k]) => { const v = String(f.get(k) ?? ""); if (v !== "") o[k] = Number(v); }); patch({ limits_override: o }, "Custom limits saved."); }} className="flex flex-col gap-3 rounded-xl bg-[#F5F1FF] p-4">
              <p className="text-[13px] text-[#5B6472]">Leave a field empty to use the plan&apos;s value (shown as the placeholder).</p>
              <div className="grid grid-cols-2 gap-3">{LIMIT_FIELDS.map(([k, l]) => <label key={k} className="flex flex-col gap-1 text-[13px] font-medium">{l}<input name={k} type="number" min={0} defaultValue={data.limits_override[k] ?? ""} placeholder={String(data.base_limits[k] ?? "")} className={aInput} /></label>)}</div>
              <div className="flex gap-2"><button disabled={busy} className={aBtn.primary}>Save limits</button><button type="button" onClick={() => patch({ limits_override: {} }, "Custom limits removed.")} className={aBtn.secondary}>Remove custom limits</button></div></form>)}
          {panel === "refund" && (
            <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); run(() => send("POST", `/api/admin/customers/${id}/refund`, { reference: f.get("reference"), amount: Number(f.get("amount")) || undefined }), "Refund recorded."); }} className="flex flex-col gap-3 rounded-xl bg-[#F5F1FF] p-4">
              <label className="flex flex-col gap-1.5 text-sm font-medium">Payment<Select ariaLabel="Payment" name="reference" defaultValue={refundable[0]?.reference} options={refundable.map((p) => ({ value: p.reference, label: `${shortDate(p.paid ?? p.created)} · ${p.plan_id} · ${money(p.amount)}${p.refunded ? ` (${money(p.refunded)} refunded)` : ""}` }))} /></label>
              <label className="flex flex-col gap-1.5 text-sm font-medium">Amount in GHS (empty refunds what is left)<input name="amount" type="number" step="0.01" min={0} className={`${aInput} !w-48`} /></label>
              <div><button disabled={busy} className={aBtn.danger}>Refund through Paystack</button></div></form>)}
        </AdminCard>

        <AdminCard label="Usage" className="flex min-w-0 flex-[1_1_340px] flex-col gap-4">
          <h2 className="text-lg font-semibold">Usage</h2>
          {data.usage.map((u) => (
            <div key={u.label} className="flex flex-col gap-1.5"><div className="flex justify-between text-sm"><span>{u.label}</span><span className="font-semibold">{u.text}</span></div>
              <div className="h-2 rounded bg-[#E8EBF0]"><div className="h-2 rounded bg-[#6B4FE0]" style={{ width: `${Math.min(100, Math.max(u.pct > 0 ? 3 : 0, u.pct * 100))}%` }} /></div></div>
          ))}
        </AdminCard>
      </div>

      <div className="flex flex-wrap items-stretch gap-5">
        <AdminCard label="Websites" className="min-w-0 flex-[1_1_400px] !pb-2">
          <h2 className="mb-2 text-lg font-semibold">Websites</h2>
          {data.sites.length === 0 && <div className="border-t border-[#EDEFF3]"><EmptyState compact Icon={Globe} title="No websites yet" text="Websites show here once the customer adds one." /></div>}
          {data.sites.map((s) => (
            <div key={s.id} className="flex items-center gap-3 border-t border-[#EDEFF3] py-3.5">
              <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{s.name}</span><span className="block truncate font-mono text-[13px] text-[#5B6472]">{s.url.split("//")[1]}</span></span>
              <Pill tone={s.status === "up" ? "ok" : s.status === "down" ? "bad" : "muted"}>{s.status === "up" ? "Up" : s.status === "down" ? "Down" : s.status === "paused" ? "Paused" : "Waiting"}</Pill>
              <span className="w-[90px] text-right text-[13px] text-[#5B6472]">{s.last_check ? whenAgo(s.last_check) : "—"}</span>
            </div>
          ))}
        </AdminCard>
        <AdminCard label="Team" className="min-w-0 flex-[1_1_340px] !pb-2">
          <h2 className="mb-2 text-lg font-semibold">Team</h2>
          {data.team.members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 border-t border-[#EDEFF3] py-3.5"><Avatar name={`${m.first_name} ${m.last_name}`} round />
              <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{m.first_name} {m.last_name}</span><span className="block truncate text-[13px] text-[#5B6472]">{m.email}</span></span>
              <span className="text-[13px] font-medium capitalize">{m.role}</span></div>))}
          {data.team.invites.map((i) => <div key={i.id} className="flex justify-between border-t border-[#EDEFF3] py-3.5 text-[13px] text-[#5B6472]"><span>{i.email}</span><span>Invite pending</span></div>)}
          <div className="border-t border-[#EDEFF3] py-3 text-[13px] text-[#5B6472]">{data.team.members.length + data.team.invites.length} of {c.members_limit} seats used on the {c.plan_name} plan.</div>
        </AdminCard>
      </div>

      <div className="flex flex-wrap items-stretch gap-5">
        <AdminCard label="Internal notes" className="flex min-w-0 flex-[1_1_400px] flex-col gap-3">
          <h2 className="text-lg font-semibold">Internal notes</h2>
          <form key={data.notes.length} onSubmit={(e) => { e.preventDefault(); const t = String(new FormData(e.currentTarget).get("text") ?? ""); run(() => send("POST", `/api/admin/customers/${id}/notes`, { text: t })); }} className="flex flex-col gap-3">
            <label htmlFor="note" className="sr-only">Add a note</label>
            <textarea id="note" name="text" rows={3} placeholder="Only admins see notes" className="w-full rounded-lg border border-[#C9CFD8] px-3.5 py-3 text-sm" />
            <div><button disabled={busy} className={`${aBtn.primary}`}>Save note</button></div></form>
          {data.notes.length === 0 && <div className="border-t border-[#EDEFF3]"><EmptyState compact Icon={StickyNote} title="No notes yet" text="Notes you save are only visible to admins." /></div>}
          {data.notes.map((n, i) => <div key={i} className="border-t border-[#EDEFF3] pt-3 text-sm leading-relaxed"><b>{n.admin}</b> · {fmtDateTime(n.ts)}<br />{n.text}</div>)}
        </AdminCard>
        <AdminCard label="Audit trail" className="min-w-0 flex-[1_1_340px] !pb-2">
          <h2 className="mb-2 text-lg font-semibold">Audit trail</h2>
          {data.audit.map((a, i) => (
            <div key={i} className="flex gap-3 border-t border-[#EDEFF3] py-3"><span style={{ background: dot[a.tone] ?? dot.muted }} className="mt-1.5 size-2 shrink-0 rounded-full" />
              <span className="flex-1 text-sm leading-snug">{a.text}</span>
              <span className="max-w-[120px] text-right text-xs leading-snug text-[#5B6472]">{fmtDateTime(a.ts)}</span></div>))}
        </AdminCard>
      </div>

      <AdminCard label="Danger zone" className="flex flex-wrap items-center justify-between gap-4 !border-[#F3C5C0]">
        <div className="min-w-0 flex-[1_1_320px]">
          <h2 className="text-lg font-semibold text-[#B3261E]">Delete this customer</h2>
          <p className="mt-1 text-sm leading-relaxed text-[#5B6472]">Permanently removes the workspace and everything it owns: websites and their history, subscriptions, invoices, files and the team&apos;s accounts. Payment records are kept for accounting.</p>
        </div>
        <button onClick={() => setErasing(true)} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#B3261E] bg-white px-[18px] text-sm font-semibold text-[#B3261E] hover:bg-[#FBE7E5]"><Trash2 size={16} aria-hidden="true" />Delete customer</button>
      </AdminCard>
      {erasing && (
        <EraseCustomerDialog id={id} name={c.name} sites={data.sites.length} people={data.team.members.length} onClose={() => setErasing(false)}
          onDone={() => { setNote({ ok: true, text: `${c.name} was deleted.` }); router.push("/admin/customers"); }} />
      )}
    </>
  );
}
