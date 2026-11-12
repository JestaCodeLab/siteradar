"use client";

import { useNoteToast } from "@/components/toast";
import { useState } from "react";
import useSWR from "swr";
import { Check } from "lucide-react";
import { AdminCard, AdminHeader, Checkbox, aBtn, aInput } from "@/components/admin/ui";
import { ErrorState, Skeleton } from "@/components/ui";
import { fetcher, send, type PlanInfo } from "@/lib/api";

type Plan = PlanInfo & { customers: number; audit_pages: number; storage_mb: number; priority_support: boolean; ai_credits: number };
interface Resp { plans: Plan[]; yearly_discount: number; methods: string[]; currency: string; sms_bundles: { qty: number; price: number }[] }

const fmtStorage = (mb: number) => (mb >= 1024 ? `${mb / 1024} GB` : `${mb} MB`);
const fmtMonths = (n: number) => `${n} month${n === 1 ? "" : "s"}`;
const num = (s: string) => Number.parseFloat(String(s).replace(/,/g, "")) || 0;
const parseStorage = (s: string) => Math.round(num(s) * (/gb/i.test(s) ? 1024 : 1));

/** What the box shows while it is not being edited, and how it is read back. */
const COLS: { key: keyof Plan; label: string; show: (p: Plan) => string; read: (s: string) => number }[] = [
  { key: "price_month", label: "GHS / month", show: (p) => String(p.price_month), read: num },
  { key: "sites", label: "Websites", show: (p) => String(p.sites), read: num },
  { key: "members", label: "Team", show: (p) => String(p.members), read: num },
  { key: "interval_minutes", label: "Check every", show: (p) => `${p.interval_minutes} min`, read: num },
  { key: "sms", label: "SMS", show: (p) => String(p.sms), read: num },
  { key: "history_months", label: "History", show: (p) => fmtMonths(p.history_months), read: num },
  { key: "audit_pages", label: "Audit pages", show: (p) => String(p.audit_pages), read: num },
  { key: "storage_mb", label: "Storage", show: (p) => fmtStorage(p.storage_mb), read: parseStorage },
  { key: "ai_credits", label: "AI drafts", show: (p) => String(p.ai_credits ?? 0), read: num },
];
const USD_COL: (typeof COLS)[number] = { key: "price_month_usd", label: "USD / month", show: (p) => String(p.price_month_usd ?? 0), read: num };
const GRID = "minmax(90px,0.9fr) 96px 96px 175px repeat(8, minmax(76px,1fr)) 56px";
const FEATURES: { label: string; get: (p: Plan) => boolean; set: (p: Plan, v: boolean) => Partial<Plan>; fixed?: boolean }[] = [
  { label: "Email alerts", get: () => true, set: () => ({}), fixed: true },
  { label: "Slack and Teams alerts", get: (p) => p.channels.includes("chat"), set: (p, v) => ({ channels: toggle(p.channels, "chat", v) }) },
  { label: "SMS alerts", get: (p) => p.channels.includes("sms"), set: (p, v) => ({ channels: toggle(p.channels, "sms", v) }) },
  { label: "Company logo on reports", get: () => true, set: () => ({}), fixed: true },
  { label: "Client viewer access", get: (p) => p.client_access, set: (_p, v) => ({ client_access: v }) },
  { label: "Priority support", get: (p) => p.priority_support, set: (_p, v) => ({ priority_support: v }) },
];
function toggle(list: Plan["channels"], ch: "chat" | "sms", on: boolean): Plan["channels"] {
  const set = new Set(list); on ? set.add(ch) : set.delete(ch); if (ch === "sms" && on) set.add("chat"); if (ch === "chat" && !on) set.delete("sms"); set.add("email");
  return (["email", "chat", "sms"] as const).filter((c) => set.has(c));
}
const fmtAmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });

export default function AdminPlans() {
  const { data, error, mutate } = useSWR<Resp>("/api/admin/plans", fetcher);
  const [draft, setDraft] = useState<{ plans: Plan[]; discount: string; bundles: { qty: number; price: number }[] } | null>(null);
  const [typing, setTyping] = useState<Record<string, string>>({});
  const setMsg = useNoteToast();
  const [busy, setBusy] = useState(false);

  if (error) return <ErrorState message={error.message} retry={() => mutate()} />;
  if (!data) return <Skeleton className="h-96" />;
  const base = { plans: data.plans, discount: String(data.yearly_discount), bundles: data.sms_bundles };
  const cur = draft ?? base;
  const dirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(base);
  const edit = (patch: Partial<typeof cur>) => setDraft({ ...cur, ...patch });
  const editPlan = (id: string, patch: Partial<Plan>) => edit({ plans: cur.plans.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  const disc = Math.min(60, Math.max(0, num(cur.discount)));
  const yearlyPerMonth = (m: number) => Math.round(m * (1 - disc / 100) * 100) / 100;

  async function save() {
    setBusy(true); setMsg(null);
    try {
      await send("PUT", "/api/admin/plans", {
        settings: { yearly_discount: disc, sms_bundles: cur.bundles },
        plans: cur.plans.map((p) => ({ id: p.id, price_month: p.price_month, price_month_usd: p.price_month_usd ?? 0, sites: p.sites, members: p.members, interval_minutes: p.interval_minutes, sms: p.sms,
          history_months: p.history_months, audit_pages: p.audit_pages, storage_mb: p.storage_mb, ai_credits: p.ai_credits, channels: p.channels,
          client_access: p.client_access, priority_support: p.priority_support, active: p.active })),
      });
      await mutate(); setDraft(null); setTyping({}); setMsg({ ok: true, text: "Saved. New prices apply to new subscriptions and renewals." });
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not save." }); }
    setBusy(false);
  }

  return (
    <>
      <AdminHeader title="Plans and pricing" subtitle="Change prices, limits and features here. Changes apply to new subscriptions. Existing customers keep their price until they renew or change plan."
        actions={<div className="flex gap-2.5"><button disabled={!dirty || busy} onClick={() => { setDraft(null); setTyping({}); setMsg(null); }} className={aBtn.secondary}>Discard</button>
          <button disabled={!dirty || busy} onClick={save} className={aBtn.primary}>{busy ? "Saving…" : "Save changes"}</button></div>} />

      <div className="flex flex-wrap items-stretch gap-5">
        <AdminCard label="Billing rules" className="flex min-w-0 flex-[1.4_1_460px] flex-col gap-6">
          <h2 className="text-lg font-semibold">Billing rules</h2>

          <div className="flex flex-col gap-2.5">
            <span className="text-sm font-medium">Currency <span className="font-normal text-[#5B6472]">chosen from the customer country. Prices for both are set in the table below.</span></span>
            <div className="grid gap-3 sm:grid-cols-2">
              {[["Ghana", "Ghana cedis", "GHS"], ["Everywhere else", "US dollars", "USD"]].map(([where, name, code]) => (
                <div key={code} className="flex items-center justify-between gap-3 rounded-xl border border-[#E2E5EA] px-4 py-3">
                  <span className="flex flex-col"><span className="text-sm font-semibold">{where}</span><span className="text-[13px] text-[#5B6472]">{name}</span></span>
                  <span className="rounded-md bg-[#EFEAFF] px-2.5 py-1 font-mono text-[13px] font-semibold text-[#4A33B0]">{code}</span>
                </div>))}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:max-w-[240px]"><label htmlFor="disc" className="text-sm font-medium">Yearly discount (%) <span className="block font-normal text-[#5B6472]">off the price of 12 months</span></label>
            <input id="disc" type="number" min={0} max={60} value={cur.discount} onChange={(e) => edit({ discount: e.target.value })} className={aInput} /></div>

          <div className="flex flex-col gap-2.5"><span className="text-sm font-medium">Payment methods offered <span className="font-normal text-[#5B6472]">every customer pays by card, and cards renew automatically</span></span>
            <div className="flex flex-wrap gap-2">{data.methods.map((m) => <span key={m} className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-[#E3F4EC] px-3 text-[13px] font-semibold text-[#0B7A4B]"><Check size={14} strokeWidth={3} aria-hidden="true" />{m}</span>)}</div></div>
        </AdminCard>

        <AdminCard label="SMS bundles" className="flex min-w-0 flex-[1_1_320px] flex-col gap-5">
          <div className="flex flex-col gap-1"><h2 className="text-lg font-semibold">SMS bundle prices</h2>
            <p className="text-sm leading-relaxed text-[#5B6472]">Customers in Ghana can top up text messages on their Billing page. Prices are in cedis (GHS).</p></div>
          <div className="flex flex-col gap-3">{cur.bundles.map((b, i) => (
            <label key={b.qty} className="flex items-center justify-between gap-4 rounded-xl border border-[#E2E5EA] px-4 py-3">
              <span className="flex flex-col"><span className="text-[15px] font-semibold">{b.qty.toLocaleString()} SMS</span><span className="text-[13px] text-[#5B6472]">{fmtAmt(Math.round((b.price / b.qty) * 1000) / 1000)} each</span></span>
              <span className="flex items-center gap-2"><span className="text-sm font-medium text-[#5B6472]">GHS</span>
                <input aria-label={`Price of ${b.qty} SMS`} type="number" min={0} step="any" value={b.price} onChange={(e) => edit({ bundles: cur.bundles.map((x, j) => (j === i ? { ...x, price: Number(e.target.value) } : x)) })} className={`${aInput} !w-28`} /></span>
            </label>))}</div>
        </AdminCard>
      </div>

      <section aria-label="Plans" className="overflow-hidden rounded-[14px] border border-[#E2E5EA] bg-white">
        <div className="px-[22px] pb-1 pt-[22px]"><h2 className="text-lg font-semibold">Plan limits and prices</h2></div>
        <div className="overflow-x-auto"><div className="min-w-[1220px] pb-2">
          <div style={{ display: "grid", gridTemplateColumns: GRID }} className="items-center gap-3 border-y border-[#E2E5EA] bg-[#F8F9FB] px-[22px] py-3 text-xs font-semibold uppercase tracking-[0.04em] text-[#5B6472]">
            <span>Plan</span><span>GHS / month</span><span>USD / month</span><span>Yearly, per month</span>{COLS.slice(1).map((c) => <span key={c.key}>{c.label}</span>)}<span>Active</span></div>
          {cur.plans.map((p) => (
            <div key={p.id} style={{ display: "grid", gridTemplateColumns: GRID }} className="items-center gap-3 border-b border-[#EDEFF3] px-[22px] py-3 last:border-0">
              <span className="text-[15px] font-semibold">{p.name}<span className="block text-xs font-normal text-[#5B6472]">{p.customers} customer{p.customers === 1 ? "" : "s"}</span></span>
              <Cell plan={p} col={COLS[0]} typing={typing} setTyping={setTyping} apply={editPlan} />
              <Cell plan={p} col={USD_COL} typing={typing} setTyping={setTyping} apply={editPlan} />
              <span className="text-[13px] text-[#5B6472]">{p.price_month === 0 ? "Not offered" : `GHS ${fmtAmt(yearlyPerMonth(p.price_month))} (GHS ${fmtAmt(Math.round(p.price_month * 12 * (1 - disc / 100) * 100) / 100)}/yr) · $${fmtAmt(yearlyPerMonth(p.price_month_usd ?? 0))} ($${fmtAmt(Math.round((p.price_month_usd ?? 0) * 12 * (1 - disc / 100) * 100) / 100)}/yr)`}</span>
              {COLS.slice(1).map((c) => <Cell key={c.key} plan={p} col={c} typing={typing} setTyping={setTyping} apply={editPlan} />)}
              <Checkbox label={`${p.name} active`} checked={p.active} onChange={(v) => editPlan(p.id, { active: v })} />
            </div>))}
        </div></div>
      </section>

      <section aria-label="Features" className="overflow-hidden rounded-[14px] border border-[#E2E5EA] bg-white">
        <div className="px-[22px] pb-1 pt-[22px]"><h2 className="text-lg font-semibold">Features by plan</h2></div>
        <div className="overflow-x-auto"><div className="min-w-[640px] pb-2">
          <div style={{ display: "grid", gridTemplateColumns: `minmax(220px,2fr) repeat(${cur.plans.length}, 1fr)` }} className="items-center gap-3 border-y border-[#E2E5EA] bg-[#F8F9FB] px-[22px] py-3 text-xs font-semibold uppercase tracking-[0.04em] text-[#5B6472]">
            <span />{cur.plans.map((p) => <span key={p.id}>{p.name}</span>)}</div>
          {FEATURES.map((f) => (
            <div key={f.label} style={{ display: "grid", gridTemplateColumns: `minmax(220px,2fr) repeat(${cur.plans.length}, 1fr)` }} className="items-center gap-3 border-b border-[#EDEFF3] px-[22px] py-3 text-sm last:border-0">
              <span>{f.label}</span>
              {cur.plans.map((p) => <Checkbox key={p.id} label={`${f.label} on ${p.name}`} checked={f.get(p)} disabled={f.fixed} onChange={(v) => editPlan(p.id, f.set(p, v))} />)}
            </div>))}
        </div></div>
      </section>
    </>
  );
}

function Cell({ plan, col, typing, setTyping, apply }: { plan: Plan; col: (typeof COLS)[number]; typing: Record<string, string>; setTyping: (t: Record<string, string>) => void; apply: (id: string, p: Partial<Plan>) => void }) {
  const k = `${plan.id}.${col.key}`;
  return (
    <input aria-label={`${plan.name} ${col.label}`} value={typing[k] ?? col.show(plan)} className="min-h-10 w-full rounded-lg border border-[#C9CFD8] px-2.5 font-mono text-[13px] focus-visible:!outline-[#6B4FE0]"
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => { setTyping({ ...typing, [k]: e.target.value }); apply(plan.id, { [col.key]: col.read(e.target.value) } as Partial<Plan>); }}
      onBlur={() => { const t = { ...typing }; delete t[k]; setTyping(t); }} />
  );
}
