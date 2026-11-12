"use client";

import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { AdminCard, AdminHeader, TableHead, aBtn } from "@/components/admin/ui";
import { useToast } from "@/components/toast";
import { ErrorState, Skeleton } from "@/components/ui";
import { fetcher, send, type AiAdmin } from "@/lib/api";

const TYPICAL = 0.0009, WORST = 0.0019;        // dollars per draft: realistic (reasoning tokens counted) and pessimistic. Replaced by the measured average once there is data.
const usd = (n: number, d = 2) => `$${n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d })}`;
const tok = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : String(n));
const field = "min-h-11 w-full rounded-lg border border-[#C9CFD8] bg-white px-3 text-sm";

type Bundle = AiAdmin["bundles"][number];

export default function AdminAi() {
  const { data, error, mutate } = useSWR<AiAdmin>("/api/admin/ai", fetcher, { refreshInterval: 60000 });
  const toast = useToast();
  const [budget, setBudget] = useState<string | null>(null);
  const [bundles, setBundles] = useState<Bundle[] | null>(null);
  const [busy, setBusy] = useState(false);
  if (error) return <ErrorState message={error.message} retry={() => mutate()} />;
  if (!data) return <Skeleton className="h-96" />;

  const cur = bundles ?? data.bundles;
  const budgetVal = budget ?? String(data.budget_usd);
  const dirty = budget !== null || bundles !== null;
  const pct = data.budget_usd ? Math.min(100, (data.spent_usd / data.budget_usd) * 100) : 0;
  const unit = data.avg_cost_per_draft ?? null;
  const edit = (i: number, patch: Partial<Bundle>) => setBundles(cur.map((b, j) => (j === i ? { ...b, ...patch } : b)));

  async function save() {
    setBusy(true);
    try {
      await send("PUT", "/api/admin/ai", { ...(budget !== null ? { budget_usd: Number(budget) || 0 } : {}), ...(bundles ? { bundles } : {}) });
      await mutate(); setBudget(null); setBundles(null); toast.success("Saved.");
    } catch (e) { toast.error("Could not save.", e instanceof Error ? e.message : undefined); }
    setBusy(false);
  }

  return (
    <>
      <AdminHeader title="AI credits" subtitle={`Drafts are written by ${data.model} at ${usd(data.price_in)} per million input tokens and ${usd(data.price_out)} per million output tokens.`}
        actions={dirty ? <button type="button" onClick={save} disabled={busy} className={aBtn.primary}>{busy ? "Saving…" : "Save changes"}</button> : undefined} />

      {!data.configured && <p className="rounded-xl bg-[#FFF1D6] px-5 py-3 text-sm text-[#8A5A00]">ANTHROPIC_API_KEY is not set on the API service, so no drafts can be written yet.</p>}

      <section aria-label="Token budget" className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}>
        <AdminCard className="flex flex-col gap-1.5"><span className="text-[13px] text-[#5B6472]">Spent this month</span><span className="text-[28px] font-semibold leading-none">{usd(data.spent_usd, 2)}</span>
          <div className="h-1.5 rounded bg-[#E8EBF0]"><div className={`h-1.5 rounded ${pct >= 90 ? "bg-[#B3261E]" : pct >= 70 ? "bg-[#C58A00]" : "bg-[#6B4FE0]"}`} style={{ width: `${pct}%` }} /></div>
          <span className="text-[13px] text-[#5B6472]">of a {usd(data.budget_usd, 0)} budget · {usd(data.left_usd, 2)} left</span></AdminCard>
        <AdminCard className="flex flex-col gap-1.5"><span className="text-[13px] text-[#5B6472]">Tokens left this month</span><span className="text-[28px] font-semibold leading-none">{tok(data.tokens_left)}</span>
          <span className="text-[13px] text-[#5B6472]">estimated from the budget left; {tok(data.tokens_used)} used so far</span></AdminCard>
        <AdminCard className="flex flex-col gap-1.5"><span className="text-[13px] text-[#5B6472]">Drafts this month</span><span className="text-[28px] font-semibold leading-none">{data.month.drafts.toLocaleString()}</span>
          <span className="text-[13px] text-[#5B6472]">{data.all_time.drafts.toLocaleString()} all time · {usd(data.all_time.usd)} spent</span></AdminCard>
        <AdminCard className="flex flex-col gap-1.5"><span className="text-[13px] text-[#5B6472]">Average cost per draft</span><span className="text-[28px] font-semibold leading-none">{unit ? `$${unit.toFixed(5)}` : "No data yet"}</span>
          <span className="text-[13px] text-[#5B6472]">{unit ? "measured from this month" : `planning with $${TYPICAL} typical, $${WORST} worst`}</span></AdminCard>
      </section>

      <AdminCard className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Monthly budget</h2>
        <p className="text-sm text-[#5B6472]">What the platform is willing to spend on AI each month. This page shows how much of it is left; it does not stop drafts by itself, so also set the same limit in the Anthropic console.</p>
        <label className="flex max-w-[260px] flex-col gap-1.5 text-sm font-medium">Budget (US dollars a month)
          <input className={field} inputMode="decimal" value={budgetVal} onChange={(e) => setBudget(e.target.value)} /></label>
        <p className="text-sm text-[#5B6472]">Credits owed to customers: {data.credits_bought_outstanding.toLocaleString()} bought and not yet used, plus {data.credits_included_unused.toLocaleString()} included this month and not yet used.
          {Object.keys(data.bundle_revenue).length > 0 && <> Package sales this month: {Object.entries(data.bundle_revenue).map(([c, n]) => `${c} ${n.toLocaleString()}`).join(", ")}.</>}</p>
      </AdminCard>

      <AdminCard className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Included with each plan</h2>
        <p className="text-sm text-[#5B6472]">What it costs us if a customer uses every credit. Real use is usually well below this. Change the amounts on <Link href="/admin/plans" className="font-semibold text-[#4A33B0]">Plans and pricing</Link>.</p>
        <div className="overflow-x-auto"><div className="min-w-[620px]">
          <TableHead template="1.2fr 1fr 1fr 1fr 1fr" cols={["Plan", "Credits a month", "Typical cost", "Worst case", "Share of price"]} />
          {data.plans.filter((p) => p.ai_credits > 0).map((p) => {
            const t = p.ai_credits * (unit ?? TYPICAL), w = p.ai_credits * (unit ? unit * 2 : WORST);
            return (
              <div key={p.id} className="grid items-center gap-3 border-t border-[#EEF0F3] py-3 text-sm" style={{ gridTemplateColumns: "1.2fr 1fr 1fr 1fr 1fr" }}>
                <span className="font-semibold">{p.name}</span><span>{p.ai_credits.toLocaleString()}</span><span>{usd(t)}</span><span>{usd(w)}</span>
                <span>{p.price_month_usd ? `${((t / p.price_month_usd) * 100).toFixed(1)}% to ${((w / p.price_month_usd) * 100).toFixed(1)}%` : "—"}</span>
              </div>);
          })}
        </div></div>
      </AdminCard>

      <AdminCard className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Credit packages</h2>
          <button type="button" onClick={() => setBundles([...cur, { credits: 500, price_ghs: 60, price_usd: 5 }])} className={aBtn.secondary}><Plus size={16} aria-hidden="true" className="mr-1.5" />Add a package</button></div>
        <p className="text-sm text-[#5B6472]">Shown in the top-up window when a customer runs out. Customers in Ghana pay in cedis and everyone else in dollars. “Margin” is the dollar price against the worst-case cost of the same credits.</p>
        <div className="overflow-x-auto"><div className="min-w-[620px]">
          <TableHead template="1fr 1fr 1fr 1fr 48px" cols={["Credits", "Price (GHS)", "Price (USD)", "Margin", " "]} />
          {cur.map((b, i) => (
            <div key={i} className="grid items-center gap-3 border-t border-[#EEF0F3] py-2.5 text-sm" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 48px" }}>
              <input className={field} inputMode="numeric" aria-label="Credits" value={b.credits} onChange={(e) => edit(i, { credits: Number(e.target.value.replace(/\D/g, "")) || 0 })} />
              <input className={field} inputMode="decimal" aria-label="Price in cedis" value={b.price_ghs} onChange={(e) => edit(i, { price_ghs: Number(e.target.value) || 0 })} />
              <input className={field} inputMode="decimal" aria-label="Price in dollars" value={b.price_usd} onChange={(e) => edit(i, { price_usd: Number(e.target.value) || 0 })} />
              <span className="font-medium">{b.credits ? `${(b.price_usd / (b.credits * (unit ? unit * 2 : WORST))).toFixed(1)}×` : "—"}</span>
              <button type="button" onClick={() => setBundles(cur.filter((_, j) => j !== i))} disabled={cur.length < 2} aria-label="Remove this package" className="inline-flex size-10 items-center justify-center rounded-lg border border-[#C9CFD8] text-[#B3261E] hover:bg-[#FBE7E5] disabled:opacity-40"><Trash2 size={16} aria-hidden="true" /></button>
            </div>))}
        </div></div>
      </AdminCard>

      <section className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        <AdminCard className="flex flex-col gap-2"><h2 className="text-lg font-semibold">By kind this month</h2>
          {data.by_kind.length === 0 && <p className="text-sm text-[#5B6472]">No drafts yet.</p>}
          {data.by_kind.map((k) => <p key={k.kind} className="flex justify-between text-sm"><span>{({ desc: "Meta descriptions", title: "Page titles", alt: "Image alt text" } as Record<string, string>)[k.kind] ?? k.kind}</span><span>{k.drafts.toLocaleString()} drafts · {usd(k.usd, 3)}</span></p>)}</AdminCard>
        <AdminCard className="flex flex-col gap-2"><h2 className="text-lg font-semibold">Biggest users this month</h2>
          {data.top.length === 0 && <p className="text-sm text-[#5B6472]">No drafts yet.</p>}
          {data.top.map((t) => <p key={t.id} className="flex justify-between text-sm"><Link href={`/admin/customers/${t.id}`} className="font-medium text-[#4A33B0]">{t.workspace}</Link><span>{t.drafts.toLocaleString()} drafts · {usd(t.usd, 3)}</span></p>)}</AdminCard>
      </section>
    </>
  );
}
