"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import useSWR from "swr";
import { Clock } from "lucide-react";
import { AdminCard, AdminHeader, EmptyState, Tabs } from "@/components/admin/ui";
import { ErrorState, Skeleton } from "@/components/ui";
import { fetcher } from "@/lib/api";

interface Ev { ts: number; type: string; tone: string; title: string; detail: string; workspace_id: number | null; workspace: string | null }
interface Resp { events: Ev[]; more: boolean; next: number | null }
type Tab = "all" | "accounts" | "billing" | "team" | "websites" | "admin" | "messages";
const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All activity" }, { id: "accounts", label: "Accounts" }, { id: "billing", label: "Billing" }, { id: "team", label: "Team" },
  { id: "websites", label: "Websites" }, { id: "admin", label: "Admin actions" }, { id: "messages", label: "Messages" },
];
const dot: Record<string, string> = { ok: "#0B7A4B", bad: "#B3261E", warn: "#E5A526", purple: "#6B4FE0", muted: "#8A93A3" };
const chip: Record<string, string> = { accounts: "bg-[#E3F4EC] text-[#0B7A4B]", billing: "bg-[#E5ECFF] text-[#1F4FD8]", team: "bg-[#EFEAFF] text-[#4A33B0]", websites: "bg-[#FFF1D6] text-[#8A5A00]", admin: "bg-[#EFEAFF] text-[#4A33B0]", messages: "bg-[#E8EBF0] text-[#3F4857]" };

const day = (ts: number) => {
  const d = new Date(ts * 1000), t = new Date();
  const y = new Date(t.getTime() - 86400000);
  return d.toDateString() === t.toDateString() ? "Today" : d.toDateString() === y.toDateString() ? "Yesterday" : d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
};
const time = (ts: number) => new Date(ts * 1000).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

function Feed() {
  const router = useRouter();
  const params = useSearchParams();
  const asked = params.get("tab") as Tab | null;
  const tab: Tab = TABS.some((t) => t.id === asked) ? (asked as Tab) : "all";
  const { data, error, mutate } = useSWR<Resp>(`/api/admin/activity?type=${tab}`, fetcher, { refreshInterval: 60000, keepPreviousData: true });
  const [older, setOlder] = useState<{ tab: Tab; events: Ev[]; more: boolean; next: number | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const extra = older?.tab === tab ? older : null;

  async function loadMore() {
    const cursor = extra?.next ?? data?.next; if (!cursor) return;
    setLoading(true);
    const r = await fetcher<Resp>(`/api/admin/activity?type=${tab}&before=${cursor}`);
    setOlder({ tab, events: [...(extra?.events ?? []), ...r.events], more: r.more, next: r.next }); setLoading(false);
  }

  const events = [...(data?.events ?? []), ...(extra?.events ?? [])];
  const more = extra ? extra.more : data?.more;
  const groups: { label: string; items: Ev[] }[] = [];
  for (const e of events) { const l = day(e.ts); const g = groups[groups.length - 1]; if (g && g.label === l) g.items.push(e); else groups.push({ label: l, items: [e] }); }

  return (
    <>
      <AdminHeader title="Activity logs" subtitle="What people did on the platform: sign-ups, payments, team changes, websites and admin actions." />
      <Tabs items={TABS} value={tab} onChange={(t) => { setOlder(null); router.replace(`/admin/activity?tab=${t}`, { scroll: false }); }} />
      {error ? <ErrorState message={error.message} retry={() => mutate()} /> : !data ? <Skeleton className="h-96" /> : (
        <AdminCard className="!p-0">
          {events.length === 0 ? <EmptyState Icon={Clock} title="No activity yet" text="Sign-ups, payments, invitations and admin actions are listed here as they happen." /> : (
            <div>
              {groups.map((g) => (
                <div key={g.label}>
                  <p className="border-b border-[#EDEFF3] bg-[#F8F9FB] px-5 py-2 text-xs font-semibold uppercase tracking-wide text-[#5B6472]">{g.label}</p>
                  <ul>
                    {g.items.map((e, i) => (
                      <li key={`${e.ts}-${i}`} className="flex gap-3 border-b border-[#EDEFF3] px-5 py-3.5 last:border-0">
                        <span style={{ background: dot[e.tone] ?? dot.muted }} className="mt-2 size-2 shrink-0 rounded-full" />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1"><span className="text-sm font-medium">{e.title}</span>
                            <span className={`rounded-full px-2 py-[2px] text-[11px] font-semibold capitalize ${chip[e.type] ?? chip.messages}`}>{e.type === "admin" ? "Admin" : e.type}</span></span>
                          {e.detail && <span className="mt-0.5 block whitespace-pre-line text-[13px] leading-snug text-[#5B6472]">{e.detail}</span>}
                          {e.workspace && e.workspace_id && <Link href={`/admin/customers/${e.workspace_id}`} className="mt-0.5 inline-block text-[13px] font-medium text-[#4A33B0]">{e.workspace}</Link>}
                        </span>
                        <span className="whitespace-nowrap text-xs text-[#5B6472]">{time(e.ts)}</span>
                      </li>))}
                  </ul>
                </div>))}
              {more && <div className="p-4 text-center"><button onClick={loadMore} disabled={loading} className="inline-flex min-h-11 items-center rounded-lg border border-[#C9CFD8] bg-white px-5 text-sm font-semibold hover:bg-[#F8F9FB]">{loading ? "Loading…" : "Load older activity"}</button></div>}
            </div>)}
        </AdminCard>)}
    </>
  );
}

export default function AdminActivity() { return <Suspense><Feed /></Suspense>; }
