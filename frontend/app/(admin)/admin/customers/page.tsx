"use client";

import { opts, Select } from "@/components/select";
import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { Users } from "lucide-react";
import { Avatar, AdminCard, EmptyState, AdminHeader, Pill, TableHead, Tabs, aBtn, aSelect, downloadCsv, shortDate, statusTone } from "@/components/admin/ui";
import { ErrorState, Skeleton } from "@/components/ui";
import { fetcher } from "@/lib/api";

export interface CustomerRow {
  id: number; name: string; plan_id: string; plan_name: string; status: string; suspended: boolean; created: number; mrr: number; currency?: string;
  sites: number; sites_limit: number; members: number; members_limit: number;
  owner: { name: string; email: string; phone: string; last_login: number | null } | null;
}
interface Resp { total: number; page: number; per_page: number; counts: Record<string, number>; customers: CustomerRow[] }

const GRID = "minmax(220px,2fr) minmax(190px,1.6fr) 90px 110px 90px 120px 110px 100px";
type Tab = "all" | "paid" | "free" | "past_due" | "suspended";

export default function Customers() {
  const [tab, setTab] = useState<Tab>("all");
  const [plan, setPlan] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const qs = new URLSearchParams({ tab, plan, sort, page: String(page) }).toString();
  const { data, error, mutate } = useSWR<Resp>(`/api/admin/customers?${qs}`, fetcher, { keepPreviousData: true });
  const c = data?.counts;
  const tabs: { id: Tab; label: string }[] = [
    { id: "all", label: `All (${c?.all ?? 0})` }, { id: "paid", label: `Paying (${c?.paid ?? 0})` }, { id: "free", label: `Free (${c?.free ?? 0})` },
    { id: "past_due", label: `Past due (${c?.past_due ?? 0})` }, { id: "suspended", label: `Suspended (${c?.suspended ?? 0})` },
  ];

  return (
    <>
      <AdminHeader title="Customers" subtitle="Every workspace on the platform."
        actions={<button onClick={() => downloadCsv(`/api/admin/customers.csv?${qs}`, "customers")} className={aBtn.secondary}>Export CSV</button>} />
      <section aria-label="Customers" className="overflow-hidden rounded-xl border border-[#E2E5EA] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E5EA] px-5 py-3.5">
          <Tabs items={tabs} value={tab} onChange={(t) => { setTab(t); setPage(1); }} />
          <div className="flex flex-wrap gap-2.5">
            <Select compact ariaLabel="Plan" value={plan} onChange={(v) => { setPlan(v); setPage(1); }} className="w-40" options={[{ value: "", label: "All plans" }, { value: "free", label: "Free" }, { value: "starter", label: "Starter" }, { value: "growth", label: "Growth" }, { value: "scale", label: "Scale" }]} />
            <Select compact ariaLabel="Sort" value={sort} onChange={(v) => { setSort(v); setPage(1); }} className="w-48" options={[{ value: "newest", label: "Newest first" }, { value: "revenue", label: "Highest revenue" }, { value: "sites", label: "Most websites" }]} />
          </div>
        </div>
        {error ? <div className="p-5"><ErrorState message={error.message} retry={() => mutate()} /></div> : !data ? <div className="p-5"><Skeleton className="h-64" /></div> : (
          <>
            <div className="overflow-x-auto"><div className="min-w-[1040px]">
              <TableHead template={GRID} cols={["Workspace", "Owner", "Plan", "Websites", "Team", "Status", "MRR", "Joined"]} />
              {data.customers.length === 0 && <EmptyState Icon={Users} title="No customers found" text="Try another tab or plan filter. New workspaces appear here once someone signs up." />}
              {data.customers.map((r) => (
                <Link key={r.id} href={`/admin/customers/${r.id}`} style={{ display: "grid", gridTemplateColumns: GRID }} className="min-h-11 items-center gap-4 border-b border-[#EDEFF3] px-5 py-3.5 hover:bg-[#FBFAFF]">
                  <span className="flex min-w-0 items-center gap-3"><Avatar name={r.name} /><span className="truncate text-[15px] font-semibold">{r.name}</span></span>
                  <span className="min-w-0"><span className="block truncate text-sm">{r.owner?.name}</span><span className="block truncate text-xs text-[#5B6472]">{r.owner?.email}</span></span>
                  <span><Pill>{r.plan_name}</Pill></span>
                  <span className="font-mono text-[13px]">{r.sites} of {r.sites_limit}</span>
                  <span className="font-mono text-[13px]">{r.members} of {r.members_limit}</span>
                  <span><Pill tone={statusTone(r.status)}>{r.status}</Pill></span>
                  <span className="font-mono text-[13px]">{r.currency === "USD" ? "$" : "GHS "}{Math.round(r.mrr).toLocaleString()}</span>
                  <span className="text-[13px] text-[#5B6472]">{shortDate(r.created)}</span>
                </Link>
              ))}
            </div></div>
            <div className="flex flex-wrap items-center justify-between gap-2.5 px-5 py-3 text-sm text-[#5B6472]">
              <span>Showing {data.customers.length} of {data.total}</span>
              <span className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className={`${aBtn.secondary} !min-h-10 !px-3.5 !font-normal`}>Previous</button>
                <button disabled={page * data.per_page >= data.total} onClick={() => setPage((p) => p + 1)} className={`${aBtn.secondary} !min-h-10 !px-3.5 !font-normal`}>Next</button></span>
            </div>
          </>
        )}
      </section>
    </>
  );
}
void AdminCard;
