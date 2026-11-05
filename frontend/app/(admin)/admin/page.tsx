"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { CreditCard, TrendingUp, TriangleAlert, Users, X } from "lucide-react";
import { Avatar, AdminCard, AdminHeader, Pill, money, whenAgo, tones, type Tone } from "@/components/admin/ui";
import { ErrorState, Skeleton } from "@/components/ui";
import { fetcher } from "@/lib/api";

interface Overview {
  period: string; label: string; customers: number; new: number; paying: number; paying_pct: number; mrr: number; cancellations: number; failed: number; failed_amount: number;
  signups: { d: string; n: number }[]; by_plan: { id: string; name: string; count: number; mrr: number; pct: number; color: string }[];
  recent: { id: number; name: string; owner: string; plan: string; created: number }[];
  attention: { tag: string; tone: Tone; title: string; sub: string; href: string }[];
}

const fmtDay = (iso?: string) => (iso ? new Date(iso + "T00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "");

export default function AdminOverview() {
  const [period, setPeriod] = useState("30d");
  const { data, error, mutate } = useSWR<Overview>(`/api/admin/overview?period=${period}`, fetcher, { refreshInterval: 60000, keepPreviousData: true });
  if (error) return <ErrorState message={error.message} retry={() => mutate()} />;
  if (!data) return <div className="flex flex-col gap-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-40" /><Skeleton className="h-64" /></div>;

  const kpis = [
    { label: "Customers", value: String(data.customers), note: `+${data.new} ${data.label}`, noteTone: "#0B7A4B", Icon: Users, bg: "#EFEAFF", fg: "#4A33B0" },
    { label: "Paying customers", value: String(data.paying), note: `${data.paying_pct}% of customers`, noteTone: "#5B6472", Icon: CreditCard, bg: "#E3F4EC", fg: "#0B7A4B" },
    { label: "Monthly recurring revenue", value: money(Math.round(data.mrr)), note: "Yearly plans counted per month", noteTone: "#5B6472", Icon: TrendingUp, bg: "#E5ECFF", fg: "#1F4FD8" },
    { label: "Cancellations", value: String(data.cancellations), note: { "30d": "Last 30 days", month: "This month", "90d": "Last 90 days", year: "This year" }[data.period] ?? "", noteTone: "#5B6472", Icon: X, bg: "#FFF1D6", fg: "#8A5A00" },
    { label: "Failed payments", value: String(data.failed), note: data.failed ? "Need follow-up" : "None", noteTone: data.failed ? "#B3261E" : "#5B6472", Icon: TriangleAlert, bg: "#FBE7E5", fg: "#B3261E" },
  ];
  const max = Math.max(1, ...data.signups.map((s) => s.n));
  const total = data.by_plan.reduce((a, p) => a + p.count, 0);

  return (
    <>
      <AdminHeader title="Platform overview" subtitle="How the business is doing."
        actions={<div className="flex items-center gap-2"><label htmlFor="range" className="text-sm text-[#5B6472]">Period</label>
          <select id="range" value={period} onChange={(e) => setPeriod(e.target.value)} className="min-h-11 rounded-lg border border-[#C9CFD8] bg-white px-3 text-sm">
            <option value="30d">Last 30 days</option><option value="month">This month</option><option value="90d">Last 90 days</option><option value="year">This year</option></select></div>} />

      <section aria-label="Key numbers" className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}>
        {kpis.map(({ label, value, note, noteTone, Icon, bg, fg }) => (
          <div key={label} className="flex flex-col gap-2 rounded-xl border border-[#E2E5EA] bg-white p-5">
            <span style={{ background: bg, color: fg }} className="flex size-9 items-center justify-center rounded-lg"><Icon size={18} aria-hidden="true" /></span>
            <span className="text-[13px] text-[#5B6472]">{label}</span>
            <span className="text-[30px] font-semibold leading-none">{value}</span>
            <span style={{ color: noteTone }} className="text-[13px] font-medium">{note}</span>
          </div>
        ))}
      </section>

      <div className="flex flex-wrap items-stretch gap-5">
        <AdminCard label="Signups" className="flex min-w-0 flex-[1.6_1_460px] flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-lg font-semibold">New customers per day</h2><span className="text-sm text-[#5B6472]">{data.new} {data.label}</span></div>
          <div role="img" aria-label="Bar chart of new customers per day" className="flex h-[170px] items-end gap-1 border-b border-[#E2E5EA]">
            {data.signups.map((s) => <span key={s.d} title={`${fmtDay(s.d)}: ${s.n}`} className="flex-1 rounded-t-[3px] bg-[#6B4FE0]" style={{ height: `${6 + (s.n / max) * 164}px` }} />)}
          </div>
          <div className="flex justify-between text-xs text-[#5B6472]"><span>{fmtDay(data.signups[0]?.d)}</span><span>{fmtDay(data.signups[data.signups.length - 1]?.d)}</span></div>
        </AdminCard>

        <AdminCard label="Plans" className="flex min-w-0 flex-[1_1_320px] flex-col gap-4">
          <h2 className="text-lg font-semibold">Customers by plan</h2>
          <div role="img" aria-label="Share of customers on each plan" className="flex h-3.5 overflow-hidden rounded-[7px] bg-[#E8EBF0]">
            {data.by_plan.map((p) => <span key={p.id} style={{ background: p.color, width: `${total ? (p.count / total) * 100 : 0}%` }} />)}
          </div>
          <div className="flex flex-col gap-2.5">
            {data.by_plan.map((p) => (
              <div key={p.id} className="flex items-center gap-2.5 text-sm"><span style={{ background: p.color }} className="size-3 rounded-[3px]" /><span className="flex-1">{p.name}</span>
                <span className="font-mono">{p.count}</span><span className="w-[120px] text-right text-[#5B6472]">{money(Math.round(p.mrr))}</span></div>
            ))}
          </div>
        </AdminCard>
      </div>

      <div className="flex flex-wrap items-stretch gap-5">
        <AdminCard label="Recent signups" className="min-w-0 flex-[1.4_1_460px] !pb-2">
          <div className="mb-2 flex items-center justify-between"><h2 className="text-lg font-semibold">Recent signups</h2><Link href="/admin/customers" className="flex min-h-11 items-center text-sm font-semibold text-[#4A33B0]">All customers</Link></div>
          {data.recent.length === 0 && <p className="border-t border-[#EDEFF3] py-8 text-center text-sm text-[#5B6472]">No customers yet.</p>}
          {data.recent.map((r) => (
            <Link key={r.id} href={`/admin/customers/${r.id}`} className="flex min-h-14 items-center gap-3 border-t border-[#EDEFF3]">
              <Avatar name={r.name} />
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{r.name}</span><span className="block truncate text-[13px] text-[#5B6472]">{r.owner}</span></span>
              <Pill>{r.plan}</Pill><span className="w-[84px] text-right text-[13px] text-[#5B6472]">{whenAgo(r.created)}</span>
            </Link>
          ))}
        </AdminCard>

        <AdminCard label="Needs attention" className="min-w-0 flex-[1_1_340px] !pb-2">
          <h2 className="mb-2 text-lg font-semibold">Needs attention</h2>
          {data.attention.length === 0 && <p className="border-t border-[#EDEFF3] py-8 text-center text-sm text-[#5B6472]">Nothing needs attention.</p>}
          {data.attention.map((a, i) => (
            <Link key={i} href={a.href} className="flex items-start gap-3 border-t border-[#EDEFF3] py-3.5">
              <span className={`min-w-[68px] rounded-full px-2 py-[3px] text-center text-xs font-semibold ${tones[a.tone]}`}>{a.tag}</span>
              <span className="flex-1"><span className="block text-sm font-semibold">{a.title}</span><span className="mt-0.5 block text-[13px] leading-snug text-[#5B6472]">{a.sub}</span></span>
            </Link>
          ))}
        </AdminCard>
      </div>
    </>
  );
}
