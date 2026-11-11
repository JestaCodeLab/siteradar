"use client";

import { Locked } from "./locked";
import { useNoteToast } from "@/components/toast";
import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { CalendarCheck, CreditCard, Sparkles, Tag, XCircle } from "lucide-react";
import { FileText, MessageSquare } from "lucide-react";
import { Empty, ErrorState, Skeleton } from "@/components/ui";
import { fetcher, send, type BillingData, type PlanInfo } from "@/lib/api";
import { fmtDateTs } from "@/lib/format";
import { ghs, money, useMe } from "@/lib/me";
import { DiscountBox } from "./discount-field";
import { checkout, payFor } from "@/lib/paystack";
import { priceLine } from "@/lib/plans";

const box = "rounded-[14px] border border-line bg-surface p-[22px]";
const h2 = "text-lg font-semibold";
const actBtn = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold disabled:opacity-60";

function Bar({ label, value, pct, warn }: { label: string; value: string; pct: number; warn?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5"><div className="flex justify-between text-sm"><span>{label}</span><span className="font-semibold">{value}</span></div>
      <div className="h-2 rounded bg-[#e8ebf0]"><div className={`h-2 rounded ${warn ? "bg-bar-warn" : "bg-brand"}`} style={{ width: `${Math.min(100, Math.max(pct > 0 ? 2 : 0, pct))}%` }} /></div></div>
  );
}

const planLine = (p: PlanInfo) => {
  const parts = [`${p.sites} website${p.sites === 1 ? "" : "s"}`, `${p.members} team member${p.members === 1 ? "" : "s"}`];
  if (p.sms) parts.push(`${p.sms} SMS a month`);
  parts.push(p.interval_minutes === 1 ? "checks every minute" : `checks every ${p.interval_minutes} minutes`);
  return parts.join(", ") + ".";
};

export function BillingPanel() {
  const { isOwner, isGhana, mutate: refreshMe } = useMe();
  const { data, error, mutate } = useSWR<BillingData>("/api/billing", fetcher);
  const [yearly, setYearly] = useState<boolean | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const setNote = useNoteToast();

  if (error) return <ErrorState message={error.message} retry={() => mutate()} />;
  if (!data) return <div className="flex flex-col gap-4"><Skeleton className="h-40" /><Skeleton className="h-64" /></div>;
  const ws = data.workspace, cur = ws.plan_id, ccy = data.catalogue.currency, isYearly = yearly ?? ws.cycle === "yearly";
  const plans = data.catalogue.plans, locked = !!ws.locked;
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
  const choose = (plan: string, cycle = isYearly ? "yearly" : "monthly") => run(plan + cycle, () => checkout("/api/billing/checkout", { plan, cycle, ...(code.trim() ? { code: code.trim() } : {}) }));
  const payNow = () => {
    if (locked) { document.getElementById("plans")?.scrollIntoView({ behavior: "smooth" }); return; }
    if (!confirm("This pays for your next period now and keeps the card for automatic renewals. Continue?")) return;
    run("pmcard", () => payFor("/api/billing/checkout", { plan: cur, cycle: ws.cycle }), "Payment received. Your plan is extended.");
  };
  async function cancel() {
    const ends = ws.plan_renews ? fmtDateTs(ws.plan_renews) : "now";
    if (!confirm(`Cancel your plan? It stays active until ${ends}, then the workspace becomes read-only. Nothing is deleted, and choosing a plan again restores everything. The paid period is not refunded.`)) return;
    try { await send("POST", "/api/billing/cancel"); await Promise.all([mutate(), refreshMe()]); setNote({ ok: true, text: `Your plan is cancelled and ends on ${ends}. Your data is kept.` }); }
    catch (e) { setNote({ ok: false, text: e instanceof Error ? e.message : "Could not cancel." }); }
  }
  const tab = (on: boolean) => `flex min-h-11 items-center gap-2 rounded-lg px-5 text-sm font-semibold ${on ? "bg-brand text-white" : "text-ink-2 hover:bg-soft"}`;
  const statusChip = ws.plan_status === "active" ? ["Active", "bg-ok-soft text-ok"] : ws.plan_status === "past_due" ? ["Payment due", "bg-warn-soft text-warn"] : ws.plan_status === "none" ? ["Not started", "bg-warn-soft text-warn"] : ["Plan ended", "bg-bad-soft text-bad"];
  if (ws.cancels && !locked) { statusChip[0] = "Ending"; statusChip[1] = "bg-warn-soft text-warn"; }
  const yearlyTotal = currentPlan ? currentPlan.price_year : 0, monthlyYear = currentPlan ? currentPlan.price_month * 12 : 0;

  return (
    <>
      {!isOwner && <p className="rounded-xl bg-line-soft px-5 py-3 text-sm">Only the workspace owner can change the plan.</p>}
      {data.test_mode && <p className="rounded-xl bg-warn-soft px-5 py-3 text-sm text-warn">Test mode: plan changes apply without taking payment.</p>}
      {locked && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-brand-soft px-5 py-4">
          <span className="max-w-[760px] text-[15px] leading-relaxed text-brand-ink"><b>{ws.plan_status === "none" ? "Choose a plan to start monitoring." : "Your plan has ended, so this workspace is read-only."}</b> Your websites, reports and history are safe. Pick a plan below and everything switches back on straight away.</span>
          <a href="#plans" className="inline-flex min-h-11 items-center rounded-lg border border-brand-ink/30 bg-surface px-4 text-sm font-semibold text-brand-ink">See plans</a>
        </div>
      )}

      <div className="flex flex-wrap items-stretch gap-5">
        <section aria-label="Current plan" className={`${box} flex min-w-0 flex-[1_1_420px] flex-col gap-5`}>
          <div className="flex items-center justify-between gap-3"><h2 className={h2}>Current plan</h2><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusChip[1]}`}>{statusChip[0]}</span></div>

          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1"><span className="text-[32px] font-bold leading-tight tracking-[-0.02em]">{locked ? "No active plan" : ws.plan.name}</span>
              <span className="text-base text-muted">{locked ? "" : currentPlan ? <><b className="font-semibold text-ink">{money(ws.cycle === "yearly" ? currentPlan.price_year : currentPlan.price_month, ccy)}</b> / {ws.cycle === "yearly" ? "year" : "month"}</> : ""}</span></div>
            {(locked || data.comped) && <p className="text-sm leading-relaxed text-muted">{locked ? "Monitoring and alerts are off until you choose a plan. Your data is kept." : "Complimentary plan from SiteRadar."}</p>}
          </div>

          {!locked && !data.comped && (
            <dl className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3">
              {[["Billing", ws.cycle === "yearly" ? "Yearly" : "Monthly"], [ws.cancels ? "Plan ends" : "Next renewal", fmtDateTs(ws.plan_renews)], ["Payment", data.card ?? "No card saved"]].map(([k, v]) => (
                <div key={k} className="flex flex-col gap-0.5 bg-surface px-4 py-3"><dt className="text-xs text-muted">{k}</dt><dd className="truncate text-[15px] font-semibold">{v}</dd></div>))}
            </dl>
          )}

          {ws.cancels && !locked && <p className="rounded-xl bg-warn-soft px-4 py-3 text-sm leading-relaxed text-warn">Your plan is cancelled and will not renew. Choose a plan any time before it ends to keep everything running.</p>}

          {ws.coupon && (
            <div className="flex items-center gap-3 rounded-xl border border-ok/30 bg-ok-soft p-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-ok text-white"><Tag aria-hidden="true" size={17} /></span>
              <span className="flex min-w-0 flex-col"><span className="font-mono text-[15px] font-bold tracking-wide">{ws.coupon.code}</span>
                <span className="text-[13px] text-ok">Discount on {ws.coupon.left == null ? "every payment" : `${ws.coupon.left} more ${ws.coupon.left === 1 ? "payment" : "payments"}`}</span></span>
            </div>
          )}

          {!locked && !data.comped && ws.cycle === "monthly" && currentPlan && monthlyYear > yearlyTotal && (
            <p className="rounded-xl bg-brand-soft px-4 py-3 text-sm leading-relaxed text-brand-ink">Pay yearly and <b>save {money(monthlyYear - yearlyTotal, ccy)} a year</b>: {money(yearlyTotal, ccy)} instead of {money(monthlyYear, ccy)}.</p>
          )}

          {isOwner && (locked || !data.comped) && (
            <div className="mt-auto flex flex-wrap gap-2.5 border-t border-line-soft pt-4">
              {locked ? (
                <a href="#plans" className={`${actBtn} bg-brand !text-white hover:bg-brand-hover`}><Sparkles aria-hidden="true" size={16} />Choose a plan</a>
              ) : <>
                {ws.cycle === "monthly" && <button disabled={busy !== null} onClick={() => choose(cur, "yearly")} className={`${actBtn} bg-brand !text-white hover:bg-brand-hover`}><CalendarCheck aria-hidden="true" size={16} />Switch to yearly and save {disc}%</button>}
                <button disabled={busy !== null} onClick={payNow} className={`${actBtn} border border-[#c9cfd8] bg-surface text-ink hover:bg-soft`}><CreditCard aria-hidden="true" size={16} />Update payment method</button>
                {!ws.cancels && <button disabled={busy !== null} onClick={cancel} className={`${actBtn} border border-bad/40 bg-surface text-bad hover:bg-bad-soft`}><XCircle aria-hidden="true" size={16} />Cancel plan</button>}
              </>}
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
        {isOwner && <DiscountBox value={code} onChange={setCode} />}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {plans.map((p, idx) => {
            const isCur = p.id === cur && !locked;
            const here = isCur && ws.cycle === (isYearly ? "yearly" : "monthly");
            return (
              <div key={p.id} className={`flex flex-col gap-2.5 rounded-xl p-[18px] ${isCur ? "border-2 border-brand bg-brand-soft/40" : "border border-line bg-surface"}`}>
                <div className="flex items-center justify-between"><span className="text-base font-semibold">{p.name}</span>{isCur && <span className="rounded-full bg-brand-soft px-2.5 py-[3px] text-xs font-semibold text-brand-ink">Current</span>}</div>
                <div className="flex items-baseline gap-1.5"><span className="text-[26px] font-semibold leading-none">{isYearly ? money(p.price_year, p.currency) : priceLine(p, false)}</span><span className="text-sm text-muted">{isYearly ? "/ year" : "/ month"}</span></div>
                {isYearly && <span className="-mt-1.5 text-[13px] text-muted">{priceLine(p, true)} a month, billed yearly</span>}
                <span className="flex-1 text-[13px] leading-snug text-muted">{planLine(p)}</span>
                {here ? <span className="flex min-h-11 items-center justify-center text-sm font-semibold text-muted">Your plan</span>
                  : <button disabled={!isOwner || busy !== null} onClick={() => choose(p.id)} className={`inline-flex min-h-11 items-center justify-center rounded-lg px-3 text-sm font-semibold disabled:opacity-60 ${locked || idx > curIdx ? "bg-brand text-white hover:bg-brand-hover" : "border border-[#c9cfd8] bg-surface hover:bg-soft"}`}>
                    {busy === p.id + (isYearly ? "yearly" : "monthly") ? "Please wait…" : locked ? `Choose ${p.name}` : idx > curIdx ? `Upgrade to ${p.name}` : `Switch to ${p.name}`}</button>}
              </div>
            );
          })}
        </div>
        <span className="text-[13px] leading-relaxed text-muted">Upgrades apply straight away. Payment is handled securely by Paystack, by card, and your card renews automatically. Moving to a smaller plan applies straight away; websites above its limit are paused, not deleted.</span>
      </section>

      <div className="flex flex-wrap items-stretch gap-5">
        <section aria-label="Payment method" className={`${box} flex min-w-0 flex-[1_1_420px] flex-col gap-3`}>
          <h2 className={h2}>Payment method</h2>
          {!locked && data.card ? (
            <div className="flex items-center gap-3 rounded-xl border border-line p-3.5">
              <span className="flex h-8 min-w-12 items-center justify-center rounded-md bg-[#fff1d6] px-2 text-xs font-bold text-warn">Card</span>
              <span className="flex flex-col"><span className="text-sm font-semibold">{data.card}</span>
                <span className="text-[13px] text-muted">Renews automatically each period</span></span>
            </div>
          ) : <p className="text-sm leading-relaxed text-muted">{!locked && data.last_method && data.last_method !== "Card"
            ? `Your last payment was by ${data.last_method}. We now accept cards only, so add a card to keep your plan renewing automatically.`
            : "No card saved yet. You add one when you choose a plan."}</p>}
          {isOwner && (
            <>
              <button disabled={busy !== null} onClick={payNow} className="flex min-h-14 items-center gap-3 rounded-xl border border-[#c9cfd8] px-3.5 text-left hover:bg-soft disabled:opacity-60">
                <span className="flex size-9 items-center justify-center rounded-lg bg-brand-soft text-brand"><CreditCard size={18} aria-hidden="true" /></span>
                <span className="flex flex-col"><span className="text-sm font-semibold">Add a card</span><span className="text-[13px] text-muted">Renews automatically each period</span></span></button>
            </>
          )}
        </section>

        {isGhana && (
          <section aria-label="SMS alerts" className={`${box} flex min-w-0 flex-[1_1_340px] flex-col gap-3`}>
            <Locked bare feature="sms" icon={MessageSquare} title="SMS alerts" text="Get a text message the moment a website goes down, and top up bundles when you need more." chips={["Instant", "Ghana numbers"]}>
              <div className="flex flex-col gap-3">
                <h2 className={h2}>SMS alerts</h2>
                <p className="text-sm leading-relaxed text-muted">{ws.plan.sms > 0 ? `Your plan includes ${ws.plan.sms} SMS a month. ${ws.usage.sms} used so far.${ws.sms_credits ? ` You also have ${ws.sms_credits} bought credits.` : ""}` : "Text alerts to Ghana numbers when a site goes down."} Need more? Top up a bundle and it is added straight away.</p>
                <div className="flex flex-wrap gap-2.5">
                  {data.bundles.map((b) => (
                    <button key={b.qty} disabled={!isOwner || busy !== null} onClick={() => run("sms" + b.qty, () => payFor("/api/billing/sms-topup", { qty: b.qty }), `${b.qty} SMS added.`)}
                      className="flex min-h-14 flex-col items-center justify-center rounded-xl border border-[#c9cfd8] px-[18px] hover:bg-soft disabled:opacity-60"><span className="text-sm font-semibold">{b.qty.toLocaleString()} SMS</span><span className="text-[13px] text-muted">{ghs(b.price)}</span></button>
                  ))}
                </div>
              </div>
            </Locked>
          </section>
        )}
      </div>

      <section aria-label="Invoices" className="overflow-hidden rounded-[14px] border border-line bg-surface">
        <div className="px-[22px] pb-2 pt-[22px]"><h2 className={h2}>Invoices</h2></div>
        {data.invoices.length === 0 ? (
          <Empty icon={FileText} title="No invoices yet">Invoices appear here as PDFs once you are on a paid plan.</Empty>
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
