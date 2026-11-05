"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, Empty, ErrorState, PageHeader, Skeleton } from "@/components/ui";
import { fetcher } from "@/lib/api";
import { fmtAgo } from "@/lib/format";

export default function AdminAudit() {
  const [tab, setTab] = useState<"audit" | "messages">("audit");
  const audit = useSWR<{ events: { ts: number; action: string; detail: string; workspace_id: number | null; admin: string | null }[] }>("/api/admin/audit", fetcher);
  const msgs = useSWR<{ messages: { ts: number; detail: string }[] }>("/api/admin/messages", fetcher);
  const cur = tab === "audit" ? audit : msgs;
  return (
    <>
      <PageHeader title="Audit and messages" subtitle="What admins did, and what came in through the Contact form." />
      <div role="tablist" className="flex gap-1 border-b border-line">{([["audit", "Audit trail"], ["messages", "Contact messages"]] as const).map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`min-h-11 border-b-2 px-4 text-sm font-semibold ${tab === k ? "border-brand text-brand" : "border-transparent text-ink-2"}`}>{l}</button>)}</div>
      {cur.error ? <ErrorState message={cur.error.message} retry={() => cur.mutate()} /> : !cur.data ? <Skeleton className="h-64" /> : (
        <Card>
          {tab === "audit" ? ((audit.data?.events.length ?? 0) === 0 ? <Empty title="Nothing recorded yet" /> : <ul>{audit.data!.events.map((e, i) => (
            <li key={i} className="border-b border-line-soft px-5 py-3.5 text-sm last:border-0"><span className="font-semibold">{e.action}</span> <span className="text-muted">· {e.admin ?? "system"} · {fmtAgo(e.ts)}{e.workspace_id ? ` · workspace ${e.workspace_id}` : ""}</span><span className="block text-muted">{e.detail}</span></li>))}</ul>)
          : ((msgs.data?.messages.length ?? 0) === 0 ? <Empty title="No messages yet" /> : <ul>{msgs.data!.messages.map((m, i) => <li key={i} className="whitespace-pre-wrap border-b border-line-soft px-5 py-4 text-sm last:border-0"><span className="mb-1 block text-xs text-muted">{fmtAgo(m.ts)}</span>{m.detail}</li>)}</ul>)}
        </Card>)}
    </>
  );
}
