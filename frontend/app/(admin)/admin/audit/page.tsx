"use client";

import { useState } from "react";
import useSWR from "swr";
import { History, Mail } from "lucide-react";
import { AdminCard, AdminHeader, EmptyState } from "@/components/admin/ui";
import { ErrorState, Skeleton } from "@/components/ui";
import { fetcher } from "@/lib/api";
import { fmtAgo } from "@/lib/format";

export default function AdminAudit() {
  const [tab, setTab] = useState<"audit" | "messages">("audit");
  const audit = useSWR<{ events: { ts: number; action: string; detail: string; workspace_id: number | null; admin: string | null }[] }>("/api/admin/audit", fetcher);
  const msgs = useSWR<{ messages: { ts: number; detail: string }[] }>("/api/admin/messages", fetcher);
  const cur = tab === "audit" ? audit : msgs;
  return (
    <>
      <AdminHeader title="Audit and messages" subtitle="What admins did, and what came in through the Contact form." />
      <div role="tablist" className="flex gap-1 border-b border-line">{([["audit", "Audit trail"], ["messages", "Contact messages"]] as const).map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`min-h-11 border-b-2 px-4 text-sm font-semibold ${tab === k ? "border-[#6B4FE0] text-[#4A33B0]" : "border-transparent text-ink-2"}`}>{l}</button>)}</div>
      {cur.error ? <ErrorState message={cur.error.message} retry={() => cur.mutate()} /> : !cur.data ? <Skeleton className="h-64" /> : (
        <AdminCard className="!p-0">
          {tab === "audit" ? ((audit.data?.events.length ?? 0) === 0 ? <EmptyState Icon={History} title="Nothing recorded yet" text="Support sessions, plan changes and other admin actions are logged here." /> : <ul>{audit.data!.events.map((e, i) => (
            <li key={i} className="border-b border-line-soft px-5 py-3.5 text-sm last:border-0"><span className="font-semibold">{e.action}</span> <span className="text-muted">· {e.admin ?? "system"} · {fmtAgo(e.ts)}{e.workspace_id ? ` · workspace ${e.workspace_id}` : ""}</span><span className="block text-muted">{e.detail}</span></li>))}</ul>)
          : ((msgs.data?.messages.length ?? 0) === 0 ? <EmptyState Icon={Mail} title="No messages yet" text="Messages sent through the Contact form on the website appear here." /> : <ul>{msgs.data!.messages.map((m, i) => <li key={i} className="whitespace-pre-wrap border-b border-line-soft px-5 py-4 text-sm last:border-0"><span className="mb-1 block text-xs text-muted">{fmtAgo(m.ts)}</span>{m.detail}</li>)}</ul>)}
        </AdminCard>)}
    </>
  );
}
