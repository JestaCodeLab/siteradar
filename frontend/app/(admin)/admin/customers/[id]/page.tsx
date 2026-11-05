"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import { btn, Card, CardTitle, ErrorState, Field, input, PageHeader, Skeleton } from "@/components/ui";
import { fetcher, send, type Payment, type TeamData, type Workspace } from "@/lib/api";
import { fmtAgo } from "@/lib/format";
import { ghs, useMe } from "@/lib/me";
import { StatusPill, type CustomerRow } from "../page";

interface Detail { customer: CustomerRow; workspace: Workspace; notes: string | null; sms_bonus: number; card: string | null; team: Pick<TeamData, "members" | "invites">;
  payments: Payment[]; sites: { id: string; name: string; url: string; paused: boolean }[]; sms_30d: number; audit: { ts: number; action: string; detail: string }[] }

const reasons = ["Support request from the customer", "Billing or payment question", "Investigating a bug", "Other"];

export default function CustomerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { mutate: refreshMe } = useMe();
  const { data, error, mutate } = useSWR<Detail>(`/api/admin/customers/${id}`, fetcher);
  const [dialog, setDialog] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (error) return <ErrorState message={error.message} retry={() => mutate()} />;
  if (!data) return <Skeleton className="h-96" />;
  const c = data.customer, ws = data.workspace;

  async function patch(body: object) { setErr(null); try { await send("PATCH", `/api/admin/customers/${id}`, body); await mutate(); } catch (e) { setErr(e instanceof Error ? e.message : "Could not save."); } }

  async function startSupport(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget); setBusy(true); setErr(null);
    try {
      await send("POST", `/api/admin/customers/${id}/support`, { reason: `${f.get("reason")}: ${f.get("detail")}`, mode: f.get("mode") });
      await refreshMe(); router.push("/overview");
    } catch (x) { setErr(x instanceof Error ? x.message : "Could not start the session."); setBusy(false); }
  }

  return (
    <>
      <div className="text-sm text-muted"><Link href="/admin/customers" className="font-semibold text-brand">Customers</Link> / {c.name}</div>
      <PageHeader title={c.name} subtitle={<span className="flex flex-wrap items-center gap-2"><span className="capitalize">{c.plan_id} plan</span><StatusPill c={c} />
        {c.owner && <span>· Owner {c.owner.name} · {c.owner.email}</span>}<span>· joined {fmtAgo(c.created)}</span></span>}
        actions={<button onClick={() => { setDialog(true); setErr(null); }} className={btn.primary}>Log in as owner</button>} />
      {err && <p role="alert" className="rounded-lg bg-bad-soft px-4 py-3 text-sm text-bad">{err}</p>}

      {dialog && (
        <Card className="max-w-2xl p-5">
          <form onSubmit={startSupport} className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">Support session for {c.name}</h2>
            <p className="text-sm text-ink-2">You will see exactly what the customer sees, with a purple banner on every page. The session ends after 30 minutes. It is written to the audit trail with your name and reason. The customer is not notified.</p>
            <Field label="Reason" htmlFor="reason"><select id="reason" name="reason" className={input}>{reasons.map((r) => <option key={r}>{r}</option>)}</select></Field>
            <Field label="What are you helping with?" hint="required, at least a few words" htmlFor="detail"><input id="detail" name="detail" required minLength={5} className={input} /></Field>
            <fieldset className="flex flex-col gap-2"><legend className="mb-1 text-sm font-medium">Access</legend>
              <label className="flex gap-3 rounded-lg border border-[#c9cfd8] p-3 text-sm"><input type="radio" name="mode" value="view" defaultChecked className="mt-1" /><span><b>View only (recommended)</b><br /><span className="text-muted">Look around. Nothing can be changed.</span></span></label>
              <label className="flex gap-3 rounded-lg border border-[#c9cfd8] p-3 text-sm"><input type="radio" name="mode" value="edit" className="mt-1" /><span><b>Full access</b><br /><span className="text-muted">Can edit websites and settings, as an admin would. Not passwords or payment details.</span></span></label></fieldset>
            <div className="flex justify-end gap-3"><button type="button" onClick={() => setDialog(false)} className={btn.secondary}>Cancel</button><button disabled={busy} className={btn.primary}>{busy ? "Starting…" : "Start session"}</button></div>
          </form>
        </Card>)}

      {c.plan_status === "past_due" && <p className="rounded-xl bg-warn-soft px-5 py-3.5 text-sm text-warn">Payment is overdue. The workspace keeps working for 7 days after the plan period ends, then drops to Free limits.</p>}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="flex flex-col gap-4 p-5"><CardTitle>Plan and billing</CardTitle>
          <dl className="grid grid-cols-2 gap-y-2 text-sm"><dt className="text-muted">Plan</dt><dd className="capitalize">{ws.plan_id} ({ws.cycle})</dd><dt className="text-muted">Status</dt><dd>{ws.plan_status}</dd>
            <dt className="text-muted">Renews</dt><dd>{ws.plan_renews ? new Date(ws.plan_renews * 1000).toLocaleDateString("en-GB") : "—"}</dd><dt className="text-muted">Card on file</dt><dd>{data.card ?? "None"}</dd></dl>
          <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); patch({ plan_id: f.get("plan_id"), cycle: f.get("cycle"), extend_days: Number(f.get("days")) || undefined }); }} className="flex flex-wrap items-end gap-3 border-t border-line pt-4">
            <Field label="Set plan" htmlFor="plan_id"><select id="plan_id" name="plan_id" defaultValue={ws.plan_id} className={input}>{["free", "starter", "growth", "scale"].map((p) => <option key={p}>{p}</option>)}</select></Field>
            <Field label="Cycle" htmlFor="cycle"><select id="cycle" name="cycle" defaultValue={ws.cycle} className={input}><option>monthly</option><option>yearly</option></select></Field>
            <Field label="Free days" hint="optional" htmlFor="days"><input id="days" name="days" type="number" min={1} className={`${input} !w-28`} /></Field>
            <button className={btn.secondary}>Apply</button></form>
          <div className="flex flex-wrap gap-2 border-t border-line pt-4">
            <button onClick={() => patch({ comped: !c.comped })} className={btn.secondary}>{c.comped ? "Remove complimentary" : "Mark complimentary"}</button>
            <button onClick={() => confirm(c.suspended ? "Reactivate this account?" : "Suspend this account? Monitoring stops and customers cannot sign in to its data.") && patch({ suspended: !c.suspended })} className={c.suspended ? btn.secondary : btn.danger}>{c.suspended ? "Reactivate" : "Suspend"}</button>
            <form onSubmit={(e) => { e.preventDefault(); patch({ sms_bonus: Number(new FormData(e.currentTarget).get("sms")) }); }} className="flex items-center gap-2"><label htmlFor="sms" className="text-sm">Extra SMS/month</label><input id="sms" name="sms" type="number" min={0} defaultValue={data.sms_bonus} className={`${input} !w-24`} /><button className={btn.secondary}>Set</button></form></div>
        </Card>

        <Card className="flex flex-col gap-3 p-5"><CardTitle>Usage</CardTitle>
          {[["Websites", `${ws.usage.sites} of ${ws.plan.sites}`], ["Team seats", `${ws.usage.seats} of ${ws.plan.members}`], ["SMS this month", `${ws.usage.sms} of ${ws.plan.sms}`], ["SMS, last 30 days", String(data.sms_30d)]].map(([k, v]) => (
            <div key={k} className="flex justify-between border-t border-line-soft pt-3 text-sm first:border-0 first:pt-0"><span className="text-muted">{k}</span><span className="font-mono">{v}</span></div>))}
        </Card>

        <Card className="p-5"><CardTitle>Websites</CardTitle>
          {data.sites.length === 0 ? <p className="text-sm text-muted">None yet.</p> : <ul className="flex flex-col">{data.sites.map((s) => <li key={s.id} className="flex justify-between gap-3 border-t border-line-soft py-2.5 text-sm first:border-0"><span className="font-semibold">{s.name}</span><span className="truncate font-mono text-muted">{s.url}{s.paused ? " · paused" : ""}</span></li>)}</ul>}</Card>
        <Card className="p-5"><CardTitle>Team</CardTitle>
          <ul className="flex flex-col">{data.team.members.map((m) => <li key={m.id} className="flex justify-between gap-3 border-t border-line-soft py-2.5 text-sm first:border-0"><span>{m.first_name} {m.last_name} <span className="text-muted">{m.email}</span></span><span className="capitalize">{m.role}</span></li>)}
            {data.team.invites.map((i) => <li key={i.id} className="flex justify-between gap-3 border-t border-line-soft py-2.5 text-sm"><span className="text-muted">{i.email}</span><span>invite pending</span></li>)}</ul></Card>

        <Card className="p-5"><CardTitle>Internal notes</CardTitle>
          <form onSubmit={(e) => { e.preventDefault(); patch({ notes: new FormData(e.currentTarget).get("notes") }); }} className="flex flex-col gap-3"><textarea name="notes" rows={4} defaultValue={data.notes ?? ""} aria-label="Internal notes" className={`${input} py-2.5`} /><button className={`${btn.secondary} w-fit`}>Save note</button></form></Card>
        <Card className="p-5"><CardTitle>Audit trail</CardTitle>
          {data.audit.length === 0 ? <p className="text-sm text-muted">Nothing recorded yet.</p> : <ul className="flex flex-col">{data.audit.map((a, i) => <li key={i} className="border-t border-line-soft py-2.5 text-sm first:border-0"><span className="font-semibold">{a.action}</span> <span className="text-muted">· {fmtAgo(a.ts)}</span><span className="block text-muted">{a.detail}</span></li>)}</ul>}</Card>
        <Card className="overflow-x-auto p-5 lg:col-span-2"><CardTitle>Payments</CardTitle>
          {data.payments.length === 0 ? <p className="text-sm text-muted">No payments.</p> : <table className="w-full min-w-[480px] text-left text-sm"><tbody>{data.payments.map((p) => <tr key={p.reference} className="border-t border-line-soft first:border-0"><td className="py-2.5">{fmtAgo(p.paid ?? p.created)}</td><td className="capitalize">{p.plan_id} · {p.cycle}</td><td className="font-mono">{ghs(p.amount)}</td><td>{p.status}</td><td className="font-mono text-xs text-muted">{p.reference}</td></tr>)}</tbody></table>}</Card>
      </div>
    </>
  );
}
