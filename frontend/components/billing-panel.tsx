"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { CreditCard, Smartphone } from "lucide-react";
import { ErrorState, Skeleton } from "@/components/ui";
import { fetcher, send, type BillingData, type PlanInfo } from "@/lib/api";
import { fmtDateTs } from "@/lib/format";
import { ghs, useMe } from "@/lib/me";
import { checkout, payFor } from "@/lib/paystack";
import { priceLine } from "@/lib/plans";

const box = "rounded-[14px] border border-line bg-surface p-[22px]";
const h2 = "text-lg font-semibold";

function Bar({ label, value, pct, warn }: { label: string; value: string; pct: number; warn?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5"><div className="flex justify-between text-sm"><span>{label}</span><span className="font-semibold">{value}</span></div>
      <div className="h-2 rounded bg-[#e8ebf0]"><div className={`h-2 rounded ${warn ? "bg-bar-warn" : "bg-brand"}`} style={{ width: `${Math.min(100, Math.max(pct > 0 ? 2 : 0, pct))}%` }} /></div></div>
  );
}

const planLine = (p: PlanInfo) => {
  const parts = [`${p.sites} website${p.sites === 1 ? "" : "s"}`, `${p.members} team member${p.members === 1 ? "" : "s"}`];
  if (!p.clean_reports) parts.push("email alerts", "watermarked reports");
  else if (p.sms) parts.push(`${p.sms} SMS a month`, ...(p.client_access ? ["client viewers"] : []));
  else parts.push(`checks every ${p.interval_minutes} minutes`);
  if (p.interval_minutes === 1) parts[parts.length - 1] = "checks every minute";
  return parts.join(", ") + ".";
};

export function BillingPanel() {
  const { isOwner, mutate: refreshMe } = useMe();
  const { data, error, mutate } = useSWR<BillingData>("/api/billing", fetcher);
  const [yearly, setYearly] = useState<boolean | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  if (error) return <ErrorState message={error.message} retry={() => mutate()} />;
  if (!data) return <div className="flex flex-col gap-4"><Skeleton className="h-40" /><Skeleton className="h-64" /></div>;
  const ws = data.workspace, cur = ws.plan_id, isYearly = yearly ?? ws.cycle === "yearly";
  const plans = data.catalogue.plans, free = cur === "free";
  const currentPlan = plans.find((p) => p.id === cur);
  const curIdx = plans.findIndex((p) => p.id === cur);
  const disc = data.catalogue.yearly_discount;
  const pendingInv = ws.usage.pending_invites;

  async function run(key: string, fn: () => Promise<"done" | "paid" | "cancelled" | "pending">, okText = "Your plan has been updated.") {
    setBusy(key); setNote(null);
    try {
      const r = await fn();
      await Promise.all([mutate(), refreshMe()]);
      if (r === "cancelled") setNote({ ok: false, text: "The payment was cancelled. Nothing was charged." });
      else if (r === "pending") setNote({ ok: true, text: "We are waiting for your payment to be confirmed. It updates automatically once it is." });
      else setNote({ ok: true, text: okText });
    } catch (e) { setNote({ ok: false, text: e instanceof Error ? e.message : "Something went wrong." }); }
    setBusy(null);
  }
  const choose = (plan: string, cycle = isYearly ? "yearly" : "monthly") => run(plan + cycle, () => checkout("/api/billing/checkout", { plan, cycle }));
  const payBy = (channel: "card" | "mobile_money") => {
    if (free) { document.getElementById("plans")?.scrollIntoView({ behavior: "smooth" }); return; }
    if (!confirm("This pays for your next period now and keeps the method for automatic renewals. Continue?")) return;
    run("pm" + channel, () => payFor("/api/billing/checkout", { plan: cur, cycle: ws.cycle, channel }), "Payment received. Your plan is extended.");
  };
  async function cancel() {
    if (!confirm("Move to the Free plan now? Websites above the Free limit will be paused (not deleted). The paid period is not refunded.")) return;
    try { await send("POST", "/api/billing/cancel"); await Promise.all([mutate(), refreshMe()]); setNote({ ok: true, text: "You are now on the Free plan." }); }
    catch (e) { setNote({ ok: false, text: e instanceof Error ? e.message : "Could not cancel." }); }
  }
  const tab = (on: boolean) => `flex min-h-11 items-center gap-2 rounded-lg px-5 text-sm font-semibold ${on ? "bg-brand text-white" : "text-ink-2 hover:bg-soft"}`;
  const statusChip = ws.plan_status === "active" ? ["Active", "bg-ok-soft text-ok"] : ws.plan_status === "past_due" ? ["Payment due", "bg-warn-soft text-warn"] : ["Lapsed", "bg-bad-soft text-bad"];
  const yearlyTotal = currentPlan ? currentPlan.price_year : 0, monthlyYear = currentPlan ? currentPlan.price_month * 12 : 0;

  return (
    <>
      {!isOwner && <p className="rounded-xl bg-line-soft px-5 py-3 text-sm">Only the workspace owner can change the plan.</p>}
      {data.test_mode && <p className="rounded-xl bg-warn-soft px-5 py-3 text-sm text-warn">Test mode: plan changes apply without taking payment.</p>}
      {note && <p role="status" className={`rounded-xl px-5 py-3 text-sm ${note.ok ? "bg-ok-soft text-ok" : "bg-bad-soft text-bad"}`}>{note.text}</p>}
      {!ws.plan.clean_reports && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-brand-soft px-5 py-4">
          <span className="max-w-[760px] text-[15px] leading-relaxed text-brand-ink"><b>Reports on the Free plan carry a light SiteRadar watermark.</b> Upgrade to a paid plan to remove it and to add more websites, team members and alert channels.</span>
          <Link href="/pricing" className="inline-flex min-h-11 items-center rounded-lg border border-brand-ink/30 bg-surface px-4 text-sm font-semibold text-brand-ink">Compare plans</Link>
        </div>
      )}

      <div className="flex flex-wrap items-stretch gap-5">
        <section aria-label="Current plan" className={`${box} flex min-w-0 flex-[1_1_420px] flex-col gap-3.5`}>
          <div className="flex items-center justify-between"><h2 className={h2}>Current plan</h2><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusChip[1]}`}>{statusChip[0]}</span></div>
          <div className="flex flex-wrap items-baseline gap-2.5"><span className="text-[28px] font-semibold">{ws.plan.name}</span>
            <span className="text-base text-muted">{free ? "GHS 0, for ever" : currentPlan ? `${ghs(ws.cycle === "yearly" ? currentPlan.price_year : currentPlan.price_month)} / ${ws.cycle === "yearly" ? "year" : "month"}` : ""}</span></div>
          <p className="text-sm leading-relaxed text-muted">
            {free ? "One website with email alerts and a monthly report that carries a light SiteRadar watermark."
              : data.comped ? "Complimentary plan from SiteRadar."
              : `Billed ${ws.cycle}. Your plan renews on ${fmtDateTs(ws.plan_renews)}.${ws.cycle === "monthly" && currentPlan ? ` Switching to yearly billing would cost ${ghs(yearlyTotal)} a year instead of ${ghs(monthlyYear)}.` : ""}`}</p>
          {!free && !data.comped && isOwner && (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
              {ws.cycle === "monthly" && <button disabled={busy !== null} onClick={() => choose(cur, "yearly")} className="flex min-h-11 items-center text-sm font-semibold text-brand">Switch to yearly and save {disc}%</button>}
              <button disabled={busy !== null} onClick={() => payBy("card")} className="flex min-h-11 items-center text-sm font-semibold text-brand">Update payment method</button>
              <button onClick={cancel} className="flex min-h-11 items-center text-sm font-semibold text-bad">Cancel and move to Free</button>
            </div>
          )}
        </section>

        <section aria-label="Usage" className={`${box} flex min-w-0 flex-[1_1_340px] flex-col gap-4`}>
          <h2 className={h2}>Usage this period</h2>
          <Bar label="Websites" value={`${ws.usage.sites} of ${ws.plan.sites}`} pct={(ws.usage.sites / Math.max(ws.plan.sites, 1)) * 100} warn={ws.usage.sites >= ws.plan.sites} />
          <Bar label="Team members" value={`${ws.usage.seats} of ${ws.plan.members}${pendingInv ? ` (${pendingInv} invitation${pendingInv === 1 ? "" : "s"} pending)` : ""}`} pct={(ws.usage.seats / Math.max(ws.plan.members, 1)) * 100} warn={ws.usage.seats >= ws.plan.members} />
          {ws.plan.sms > 0 && <Bar label="SMS alerts this month" value={`${ws.usage.sms} of ${ws.plan.sms}${ws.sms_credits ? ` + ${ws.sms_credits} bought` : ""}`} pct={(ws.usage.sms / ws.plan.sms) * 100} />}
          <Bar label="Invoice storage" value={`${data.storage.used_mb} MB of ${data.storage.limit_mb >= 1024 ? `${data.storage.limit_mb / 1024} GB` : `${data.storage.limit_mb} MB`}`} pct={(data.storage.used_mb / Math.max(data.storage.limit_mb, 1)) * 100} />
        </section>
      </div>

      <section id="plans" aria-label="Change plan" className={`${box} flex flex-col gap-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className={h2}>Change plan</h2>
          <div role="group" aria-label="Billing period" className="inline-flex gap-1 rounded-xl border border-line bg-surface p-1">
            <button aria-pressed={!isYearly} onClick={() => setYearly(false)} className={tab(!isYearly)}>Monthly</button>
            <button aria-pressed={isYearly} onClick={() => setYearly(true)} className={tab(isYearly)}>Yearly <span className={`rounded-full px-2 py-0.5 text-xs ${isYearly ? "bg-white/20" : "bg-ok-soft text-ok"}`}>Save {disc}%</span></button></div></div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {plans.map((p, idx) => {
            const here = p.id === cur && (p.price_month === 0 || ws.cycle === (isYearly ? "yearly" : "monthly"));
            const isCur = p.id === cur;
            return (
              <div key={p.id} className={`flex flex-col gap-2.5 rounded-xl p-[18px] ${isCur ? "border-2 border-brand bg-brand-soft/40" : "border border-line bg-surface"}`}>
                <div className="flex items-center justify-between"><span className="text-base font-semibold">{p.name}</span>{isCur && <span className="rounded-full bg-brand-soft px-2.5 py-[3px] text-xs font-semibold text-brand-ink">Current</span>}</div>
                <div className="flex items-baseline gap-1.5"><span className="text-[26px] font-semibold leading-none">{priceLine(p, isYearly)}</span><span className="text-sm text-muted">{p.price_month === 0 ? "for ever" : "/ month"}</span></div>
                <span className="flex-1 text-[13px] leading-snug text-muted">{planLine(p)}</span>
                {here ? <span className="flex min-h-11 items-center justify-center text-sm font-semibold text-muted">Your plan</span>
                  : <button disabled={!isOwner || busy !== null} onClick={() => choose(p.id)} className={`inline-flex min-h-11 items-center justify-center rounded-lg px-3 text-sm font-semibold disabled:opacity-60 ${idx > curIdx ? "bg-brand text-white hover:bg-brand-hover" : "border border-[#c9cfd8] bg-surface hover:bg-soft"}`}>
                    {busy === p.id + (isYearly ? "yearly" : "monthly") ? "Please wait…" : idx > curIdx ? `Upgrade to ${p.name}` : `Switch to ${p.name}`}</button>}
              </div>
            );
          })}
        </div>
        <span className="text-[13px] leading-relaxed text-muted">Upgrades apply straight away. Payment is handled by Paystack, by card or mobile money. Moving to Free applies straight away; websites above the Free limit are paused, not deleted.</span>
      </section>

      <div className="flex flex-wrap items-stretch gap-5">
        <section aria-label="Payment method" className={`${box} flex min-w-0 flex-[1_1_420px] flex-col gap-3`}>
          <h2 className={h2}>Payment method</h2>
          {!free && (data.card || data.last_method) ? (
            <div className="flex items-center gap-3 rounded-xl border border-line p-3.5">
              <span className="flex h-8 min-w-12 items-center justify-center rounded-md bg-[#fff1d6] px-2 text-xs font-bold text-warn">{data.card ? "Card" : "MoMo"}</span>
              <span className="flex flex-col"><span className="text-sm font-semibold">{data.card ?? data.last_method}</span>
                <span className="text-[13px] text-muted">{data.card ? "Renews automatically each period" : "We email you a payment link 3 days before renewal"}</span></span>
            </div>
          ) : <p className="text-sm leading-relaxed text-muted">No payment method. You only need one when you choose a paid plan.</p>}
          {isOwner && (
            <>
              <button disabled={busy !== null} onClick={() => payBy("card")} className="flex min-h-14 items-center gap-3 rounded-xl border border-[#c9cfd8] px-3.5 text-left hover:bg-soft disabled:opacity-60">
                <span className="flex size-9 items-center justify-center rounded-lg bg-brand-soft text-brand"><CreditCard size={18} aria-hidden="true" /></span>
                <span className="flex flex-col"><span className="text-sm font-semibold">Add a card</span><span className="text-[13px] text-muted">Renews automatically each period</span></span></button>
              <button disabled={busy !== null} onClick={() => payBy("mobile_money")} className="flex min-h-14 items-center gap-3 rounded-xl border border-[#c9cfd8] px-3.5 text-left hover:bg-soft disabled:opacity-60">
                <span className="flex size-9 items-center justify-center rounded-lg bg-brand-soft text-brand"><Smartphone size={18} aria-hidden="true" /></span>
                <span className="flex flex-col"><span className="text-sm font-semibold">Use another mobile money number</span><span className="text-[13px] text-muted">MTN MoMo, Telecel Cash, AirtelTigo</span></span></button>
            </>
          )}
        </section>

        <section aria-label="SMS alerts" className={`${box} flex min-w-0 flex-[1_1_340px] flex-col gap-3`}>
          <h2 className={h2}>SMS alerts</h2>
          {ws.plan.channels.includes("sms") ? (
            <>
              <p className="text-sm leading-relaxed text-muted">Your plan includes {ws.plan.sms} SMS a month. {ws.usage.sms} used so far.{ws.sms_credits ? ` You also have ${ws.sms_credits} bought credits.` : ""} Need more? Top up a bundle and it is added straight away.</p>
              <div className="flex flex-wrap gap-2.5">
                {data.bundles.map((b) => (
                  <button key={b.qty} disabled={!isOwner || busy !== null} onClick={() => run("sms" + b.qty, () => payFor("/api/billing/sms-topup", { qty: b.qty }), `${b.qty} SMS added.`)}
                    className="flex min-h-14 flex-col items-center justify-center rounded-xl border border-[#c9cfd8] px-[18px] hover:bg-soft disabled:opacity-60"><span className="text-sm font-semibold">{b.qty.toLocaleString()} SMS</span><span className="text-[13px] text-muted">{ghs(b.price)}</span></button>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="text-sm leading-relaxed text-muted">SMS alerts are included from the Growth plan. The Free plan sends alerts by email only.</p>
              <Link href="/pricing" className="flex min-h-11 items-center text-sm font-semibold text-brand">See plans with SMS</Link>
            </>
          )}
        </section>
      </div>

      <section aria-label="Invoices" className="overflow-hidden rounded-[14px] border border-line bg-surface">
        <div className="px-[22px] pb-2 pt-[22px]"><h2 className={h2}>Invoices</h2></div>
        {data.invoices.length === 0 ? (
          <div className="flex flex-col items-center gap-1 px-6 pb-9 pt-5 text-center"><span className="text-base font-semibold">No invoices yet</span><span className="text-sm text-muted">Invoices appear here as PDFs once you are on a paid plan.</span></div>
        ) : (
          <div className="overflow-x-auto"><div className="min-w-[640px]">
            <div className="grid grid-cols-[130px_minmax(200px,2fr)_120px_90px_70px] items-center gap-4 border-y border-line bg-soft px-[22px] py-3 text-xs font-semibold uppercase tracking-[0.04em] text-muted"><span>Date</span><span>Description</span><span>Amount</span><span>Status</span><span /></div>
            {data.invoices.map((i) => (
              <div key={i.reference} className="grid grid-cols-[130px_minmax(200px,2fr)_120px_90px_70px] items-center gap-4 border-b border-line-soft px-[22px] py-3.5 text-sm last:border-0">
                <span className="text-[13px]">{fmtDateTs(i.date)}</span><span>{i.description} ({i.number})</span><span className="font-mono text-[13px]">GHS {i.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                <span><span className="rounded-full bg-ok-soft px-2.5 py-[3px] text-xs font-semibold text-ok">Paid</span></span>
                <a href={`/api/billing/invoices/${i.reference}.pdf`} className="flex min-h-11 items-center font-semibold text-brand">PDF</a>
              </div>))}
          </div></div>
        )}
      </section>
    </>
  );
}
