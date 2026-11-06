"use client";

import { opts, Select } from "@/components/select";
import { useNoteToast } from "@/components/toast";
import { useState } from "react";
import useSWR from "swr";
import { Check } from "lucide-react";
import { AdminCard, AdminHeader, aBtn, aInput } from "@/components/admin/ui";
import { ErrorState, Skeleton } from "@/components/ui";
import { fetcher, send, type PlanInfo } from "@/lib/api";

type Plan = PlanInfo & { customers: number; audit_pages: number; storage_mb: number; priority_support: boolean };
interface Resp { plans: Plan[]; yearly_discount: number; watermark_text: string; watermark_strength: number; methods: string[]; currency: string; sms_bundles: { qty: number; price: number }[] }

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
];
const USD_COL: (typeof COLS)[number] = { key: "price_month_usd", label: "USD / month", show: (p) => String(p.price_month_usd ?? 0), read: num };
const GRID = "minmax(90px,0.9fr) 96px 96px 175px repeat(7, minmax(76px,1fr)) 56px";
const FEATURES: { label: string; get: (p: Plan) => boolean; set: (p: Plan, v: boolean) => Partial<Plan>; fixed?: boolean }[] = [
  { label: "Email alerts", get: () => true, set: () => ({}), fixed: true },
  { label: "Slack and Teams alerts", get: (p) => p.channels.includes("chat"), set: (p, v) => ({ channels: toggle(p.channels, "chat", v) }) },
  { label: "SMS alerts", get: (p) => p.channels.includes("sms"), set: (p, v) => ({ channels: toggle(p.channels, "sms", v) }) },
  { label: "Report without watermark", get: (p) => p.clean_reports, set: (_p, v) => ({ clean_reports: v }) },
  { label: "Company logo on reports", get: () => true, set: () => ({}), fixed: true },
  { label: "Client viewer access", get: (p) => p.client_access, set: (_p, v) => ({ client_access: v }) },
  { label: "Priority support", get: (p) => p.priority_support, set: (_p, v) => ({ priority_support: v }) },
];
function toggle(list: Plan["channels"], ch: "chat" | "sms", on: boolean): Plan["channels"] {
  const set = new Set(list); on ? set.add(ch) : set.delete(ch); if (ch === "sms" && on) set.add("chat"); if (ch === "chat" && !on) set.delete("sms"); set.add("email");
  return (["email", "chat", "sms"] as const).filter((c) => set.has(c));
}
const STRENGTH = [[8, "Light (8%)"], [15, "Medium (15%)"], [25, "Strong (25%)"]] as const;

export default function AdminPlans() {
  const { data, error, mutate } = useSWR<Resp>("/api/admin/plans", fetcher);
  const [draft, setDraft] = useState<{ plans: Plan[]; discount: string; wmText: string; wmStrength: number; bundles: { qty: number; price: number }[] } | null>(null);
  const [typing, setTyping] = useState<Record<string, string>>({});
  const setMsg = useNoteToast();
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);

  if (error) return <ErrorState message={error.message} retry={() => mutate()} />;
  if (!data) return <Skeleton className="h-96" />;
  const base = { plans: data.plans, discount: String(data.yearly_discount), wmText: data.watermark_text, wmStrength: data.watermark_strength, bundles: data.sms_bundles };
  const cur = draft ?? base;
  const dirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(base);
  const edit = (patch: Partial<typeof cur>) => setDraft({ ...cur, ...patch });
  const editPlan = (id: string, patch: Partial<Plan>) => edit({ plans: cur.plans.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  const disc = Math.min(60, Math.max(0, num(cur.discount)));
  const yearlyPerMonth = (m: number) => Math.round(m * (1 - disc / 100));

  async function save() {
    setBusy(true); setMsg(null);
    try {
      await send("PUT", "/api/admin/plans", {
        settings: { yearly_discount: disc, watermark_text: cur.wmText, watermark_strength: cur.wmStrength, sms_bundles: cur.bundles },
        plans: cur.plans.map((p) => ({ id: p.id, price_month: p.price_month, price_month_usd: p.price_month_usd ?? 0, sites: p.sites, members: p.members, interval_minutes: p.interval_minutes, sms: p.sms,
          history_months: p.history_months, audit_pages: p.audit_pages, storage_mb: p.storage_mb, channels: p.channels, clean_reports: p.clean_reports,
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
        <AdminCard label="Billing rules" className="flex min-w-0 flex-[1.4_1_460px] flex-col gap-[18px]">
          <h2 className="text-lg font-semibold">Billing rules</h2>
          <div className="flex flex-wrap gap-[18px]">
            <div className="flex flex-[1_1_200px] flex-col gap-2"><label htmlFor="cur" className="text-sm font-medium">Currency</label><input id="cur" value="GHS for Ghana, USD elsewhere" disabled className={`${aInput} bg-[#F3F4F6] text-[#5B6472]`} /></div>
            <div className="flex flex-[1_1_200px] flex-col gap-2"><label htmlFor="disc" className="text-sm font-medium">Yearly discount (%)</label>
              <input id="disc" type="number" min={0} max={60} value={cur.discount} onChange={(e) => edit({ discount: e.target.value })} className={aInput} /></div>
          </div>
          <label className="flex items-start gap-3 text-sm"><input type="checkbox" disabled className="mt-1 size-4" /><span className="flex flex-col"><span className="font-medium">Free trials</span><span className="text-[13px] text-[#5B6472]">Off. Customers pay when they choose a paid plan, and can always stay on the Free plan.</span></span></label>
          <div className="flex flex-col gap-2"><span className="text-sm font-medium">SMS bundle prices (GHS) <span className="font-normal text-[#5B6472]">shown on the customer Billing page</span></span>
            <div className="flex flex-wrap gap-3">{cur.bundles.map((b, i) => (
              <label key={b.qty} className="flex items-center gap-2 text-sm"><span className="w-20">{b.qty.toLocaleString()} SMS</span>
                <input aria-label={`Price of ${b.qty} SMS`} type="number" min={0} step="any" value={b.price} onChange={(e) => edit({ bundles: cur.bundles.map((x, j) => (j === i ? { ...x, price: Number(e.target.value) } : x)) })} className={`${aInput} !w-28`} /></label>))}</div></div>
          <div className="flex flex-col gap-2"><span className="text-sm font-medium">Payment methods offered</span>
            <div className="flex flex-wrap gap-2">{data.methods.map((m) => <span key={m} className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-[#E3F4EC] px-3 text-[13px] font-semibold text-[#0B7A4B]"><Check size={14} strokeWidth={3} aria-hidden="true" />{m}</span>)}</div></div>
        </AdminCard>

        <AdminCard label="Free plan reports" className="flex min-w-0 flex-[1_1_320px] flex-col gap-4">
          <h2 className="text-lg font-semibold">Free plan report watermark</h2>
          <div className="flex flex-col gap-2"><label htmlFor="wm" className="text-sm font-medium">Watermark text</label><input id="wm" value={cur.wmText} onChange={(e) => edit({ wmText: e.target.value })} maxLength={60} className={aInput} /></div>
          <div className="flex flex-col gap-2"><label htmlFor="op" className="text-sm font-medium">Strength</label>
            <Select id="op" value={String(cur.wmStrength)} onChange={(v) => edit({ wmStrength: Number(v) })} options={STRENGTH.map(([v, l]) => ({ value: String(v), label: l }))} /></div>
          <button onClick={() => setPreview((p) => !p)} className="flex min-h-11 w-fit items-center text-sm font-semibold text-[#4A33B0]">{preview ? "Hide the preview" : "See how it looks on a report"}</button>
        </AdminCard>
      </div>

      {preview && (
        <div className="grid gap-5 md:grid-cols-2">
          {[{ tag: "Free plan", tone: "bg-[#FFF1D6] text-[#8A5A00]", title: "Logo, watermark and footer line", wm: true }, { tag: "Paid plans", tone: "bg-[#E3F4EC] text-[#0B7A4B]", title: "Logo only, clean page", wm: false }].map((p) => (
            <AdminCard key={p.tag} className="!p-5">
              <span className={`rounded-full px-2.5 py-[3px] text-xs font-semibold ${p.tone}`}>{p.tag}</span><p className="mb-3 mt-2 text-sm font-semibold">{p.title}</p>
              <div className="relative flex h-[220px] flex-col gap-2 overflow-hidden rounded-lg border border-[#E2E5EA] bg-white p-4">
                <div className="flex items-center gap-2"><span className="size-7 rounded bg-[#EFEAFF]" /><span className="text-xs font-semibold">Your company</span></div>
                <div className="flex h-24 items-end gap-1">{[60, 70, 64, 80, 76, 90, 84, 72, 78, 88, 82, 76].map((h, i) => <span key={i} style={{ height: h * 0.9 }} className="flex-1 rounded-t bg-[#6B4FE0]/70" />)}</div>
                {p.wm && <span aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center whitespace-nowrap text-3xl font-bold text-[#1F4FD8]" style={{ opacity: cur.wmStrength / 100, transform: "rotate(-28deg)" }}>{cur.wmText}</span>}
                <span className="mt-auto text-[11px] text-[#5B6472]">{p.wm ? `${cur.wmText}. Upgrade to remove this line.` : "Prepared by Your company"}</span>
              </div>
            </AdminCard>))}
        </div>
      )}

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
              <span className="text-[13px] text-[#5B6472]">{p.price_month === 0 ? "Not offered" : `GHS ${yearlyPerMonth(p.price_month)} (GHS ${Math.round(p.price_month * 12 * (1 - disc / 100)).toLocaleString("en-US")}/yr) · $${yearlyPerMonth(p.price_month_usd ?? 0)} ($${Math.round((p.price_month_usd ?? 0) * 12 * (1 - disc / 100)).toLocaleString("en-US")}/yr)`}</span>
              {COLS.slice(1).map((c) => <Cell key={c.key} plan={p} col={c} typing={typing} setTyping={setTyping} apply={editPlan} />)}
              <input aria-label={`${p.name} active`} type="checkbox" checked={p.active} onChange={(e) => editPlan(p.id, { active: e.target.checked })} className="size-[18px] accent-[#6B4FE0]" />
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
              {cur.plans.map((p) => <input key={p.id} type="checkbox" aria-label={`${f.label} on ${p.name}`} checked={f.get(p)} disabled={f.fixed} onChange={(e) => editPlan(p.id, f.set(p, e.target.checked))} className="size-[18px] accent-[#6B4FE0]" />)}
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
