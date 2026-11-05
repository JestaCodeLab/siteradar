"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { btn, Card, CardTitle, ErrorState, Icon, PageHeader, Skeleton } from "@/components/ui";
import { fetcher, send, type BillingData } from "@/lib/api";
import { ghs, useMe } from "@/lib/me";
import { planFeatures, priceLine } from "@/lib/plans";

const date = (ts: number | null) => ts ? new Date(ts * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

function Meter({ label, used, of }: { label: string; used: number; of: number }) {
  const pct = of ? Math.min(100, (used / of) * 100) : 0;
  return (
    <div className="flex flex-col gap-1.5"><div className="flex justify-between text-sm"><span>{label}</span><span className="font-mono">{used} of {of}</span></div>
      <div className="h-2 rounded-full bg-line"><div className={`h-2 rounded-full ${pct >= 100 ? "bg-bar-warn" : "bg-brand"}`} style={{ width: `${pct}%` }} /></div></div>
  );
}

export default function BillingPage() {
  const { isOwner, mutate: refreshMe } = useMe();
  const { data, error, mutate } = useSWR<BillingData>("/api/billing", fetcher);
  const [yearly, setYearly] = useState<boolean | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  if (error) return <ErrorState message={error.message} retry={() => mutate()} />;
  if (!data) return <div className="flex flex-col gap-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-48" /><Skeleton className="h-64" /></div>;
  const ws = data.workspace, cur = ws.plan_id, isYearly = yearly ?? ws.cycle === "yearly";
  const plans = data.catalogue.plans;
  const currentPlan = plans.find((p) => p.id === cur);

  async function choose(plan: string) {
    setBusy(plan); setNote(null);
    try {
      const r = await send<{ url?: string; done?: boolean }>("POST", "/api/billing/checkout", { plan, cycle: isYearly ? "yearly" : "monthly" });
      if (r.url) { window.location.assign(r.url); return; }
      await Promise.all([mutate(), refreshMe()]);
      setNote({ ok: true, text: "Your plan has been updated." });
    } catch (e) { setNote({ ok: false, text: e instanceof Error ? e.message : "Could not change plan." }); }
    setBusy(null);
  }

  async function cancel() {
    if (!confirm("Move to the Free plan now? Websites above the Free limit will be paused (not deleted). The paid period is not refunded.")) return;
    try { await send("POST", "/api/billing/cancel"); await Promise.all([mutate(), refreshMe()]); setNote({ ok: true, text: "You are now on the Free plan." }); }
    catch (e) { setNote({ ok: false, text: e instanceof Error ? e.message : "Could not cancel." }); }
  }

  const tab = (on: boolean) => `flex min-h-11 items-center gap-2 rounded-lg px-5 text-sm font-semibold ${on ? "bg-brand text-white" : "text-ink-2 hover:bg-soft"}`;
  const statusChip = ws.plan_status === "active" ? ["Active", "bg-ok-soft text-ok"] : ws.plan_status === "past_due" ? ["Payment due", "bg-warn-soft text-warn"] : ["Lapsed", "bg-bad-soft text-bad"];

  return (
    <>
      <PageHeader title="Billing and plan" subtitle="Your plan, usage and payment history." />
      {!isOwner && <p className="rounded-xl bg-line-soft px-5 py-3 text-sm">Only the workspace owner can change the plan.</p>}
      {data.test_mode && <p className="rounded-xl bg-warn-soft px-5 py-3 text-sm text-warn">Test mode: plan changes apply without taking payment.</p>}
      {note && <p role="status" className={`rounded-xl px-5 py-3 text-sm ${note.ok ? "bg-ok-soft text-ok" : "bg-bad-soft text-bad"}`}>{note.text}</p>}
      {!ws.plan.clean_reports && <p className="rounded-xl bg-brand-soft px-5 py-3.5 text-[15px] text-brand-ink">Reports on the Free plan carry a light SiteWatch watermark. Upgrade to remove it and to add more websites, team members and alert channels.</p>}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="flex flex-col gap-4 p-5">
          <CardTitle aside={<span className={`rounded-full px-2.5 py-1 text-[13px] font-semibold ${statusChip[1]}`}>{statusChip[0]}</span>}>Current plan</CardTitle>
          <p className="text-[28px] font-semibold">{ws.plan.name}{currentPlan && currentPlan.price_month > 0 && <span className="text-base font-normal text-muted"> · {ghs(ws.cycle === "yearly" ? currentPlan.price_year : currentPlan.price_month)} / {ws.cycle === "yearly" ? "year" : "month"}</span>}</p>
          <p className="text-sm text-muted">{data.comped ? "Complimentary plan from SiteWatch." : ws.plan_renews ? `${ws.plan_status === "active" ? "Renews" : "Was due"} on ${date(ws.plan_renews)}.` : "No renewal date: the Free plan never expires."}</p>
          {data.card && <p className="text-sm">Card on file: <b>{data.card}</b>, renews automatically.</p>}
          {!data.card && ws.plan_id !== "free" && <p className="text-sm text-muted">Paid by mobile money or one-off card payment. We email you a payment link before each renewal.</p>}
          {isOwner && ws.plan_id !== "free" && !data.comped && <button onClick={cancel} className={`${btn.danger} w-fit`}>Cancel and move to Free</button>}
        </Card>
        <Card className="flex flex-col gap-4 p-5">
          <CardTitle>Usage</CardTitle>
          <Meter label="Websites" used={ws.usage.sites} of={ws.plan.sites} />
          <Meter label="Team seats (including pending invitations)" used={ws.usage.seats} of={ws.plan.members} />
          {ws.plan.sms > 0 ? <Meter label="SMS alerts this month" used={ws.usage.sms} of={ws.plan.sms} /> : <p className="text-sm text-muted">SMS alerts are included from the Growth plan. <Link href="#plans" className="font-semibold text-brand">See plans</Link></p>}
        </Card>
      </div>

      <section id="plans" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Change plan</h2>
          <div role="group" aria-label="Billing period" className="inline-flex gap-1 rounded-xl border border-line bg-surface p-1">
            <button aria-pressed={!isYearly} onClick={() => setYearly(false)} className={tab(!isYearly)}>Monthly</button>
            <button aria-pressed={isYearly} onClick={() => setYearly(true)} className={tab(isYearly)}>Yearly <span className={`rounded-full px-2 py-0.5 text-xs ${isYearly ? "bg-white/20" : "bg-ok-soft text-ok"}`}>Save {data.catalogue.yearly_discount}%</span></button></div></div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {plans.map((p) => {
            const here = p.id === cur && (p.price_month === 0 || ws.cycle === (isYearly ? "yearly" : "monthly"));
            const idx = plans.findIndex((x) => x.id === p.id), curIdx = plans.findIndex((x) => x.id === cur);
            return (
              <Card key={p.id} className={`flex flex-col gap-3 p-5 ${p.id === cur ? "!border-2 !border-brand" : ""}`}>
                <div className="flex items-center justify-between"><h3 className="text-lg font-semibold">{p.name}</h3>{p.id === cur && <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand-ink">Your plan</span>}</div>
                <p className="text-[26px] font-semibold leading-none">{priceLine(p, isYearly)}<span className="text-sm font-normal text-muted"> / month</span></p>
                <ul className="flex flex-1 flex-col gap-1.5 text-[13px] text-ink-2">{planFeatures(p).slice(0, 6).map((f) => <li key={f} className="flex gap-2"><Icon.check className="mt-0.5 shrink-0 text-ok" />{f}</li>)}</ul>
                <button disabled={!isOwner || here || busy !== null} onClick={() => choose(p.id)} className={here ? btn.secondary : btn.primary}>
                  {busy === p.id ? "Please wait…" : here ? "Current" : idx > curIdx ? `Upgrade to ${p.name}` : `Switch to ${p.name}`}</button>
              </Card>
            );
          })}
        </div>
        <p className="text-sm text-muted">Upgrades apply straight away. Payment is handled by Paystack, by card or mobile money. Moving to Free applies straight away; sites above the Free limit are paused, not deleted.</p>
      </section>

      <Card className="overflow-x-auto">
        <div className="p-5 pb-0"><CardTitle>Payments</CardTitle></div>
        {data.payments.length === 0 ? <p className="px-5 pb-6 text-sm text-muted">No payments yet. They appear here once you are on a paid plan.</p> : (
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead><tr className="border-y border-line bg-soft text-xs uppercase tracking-wide text-muted"><th className="px-5 py-3">Date</th><th className="px-5 py-3">Description</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Status</th></tr></thead>
            <tbody>{data.payments.map((p) => (
              <tr key={p.reference} className="border-b border-line-soft last:border-0"><td className="px-5 py-3">{date(p.paid ?? p.created)}</td>
                <td className="px-5 py-3 capitalize">{p.plan_id} plan · {p.cycle}</td><td className="px-5 py-3 font-mono">{ghs(p.amount)}</td>
                <td className="px-5 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${p.status === "success" ? "bg-ok-soft text-ok" : p.status === "pending" ? "bg-line-soft text-ink-2" : "bg-bad-soft text-bad"}`}>{p.status === "success" ? "Paid" : p.status}</span></td></tr>))}</tbody>
          </table>)}
      </Card>
    </>
  );
}
