"use client";

import useSWR from "swr";
import { Card, CardTitle, ErrorState, PageHeader, Skeleton, Tile } from "@/components/ui";
import { fetcher } from "@/lib/api";
import { fmtAgo } from "@/lib/format";

interface Health { database: boolean; worker: { last_beat: number | null; ok: boolean; sites: number | null }; checks_last_hour: number; failed_checks_last_hour: number; open_incidents: number;
  sms_sent_24h: number; sms_wallet: number | null; sms_failed_24h: number; integrations: Record<string, boolean> }
const names: Record<string, string> = { email: "Email (Resend)", storage: "File storage (Cloudinary)", payments: "Payments (Paystack)", sms: "SMS (FlockText)", pagespeed: "Google PageSpeed" };

export default function AdminHealth() {
  const { data, error, mutate } = useSWR<Health>("/api/admin/health", fetcher, { refreshInterval: 30000 });
  if (error) return <ErrorState message={error.message} retry={() => mutate()} />;
  if (!data) return <Skeleton className="h-64" />;
  const dot = (ok: boolean) => <span className={`inline-block size-2.5 rounded-full ${ok ? "bg-ok" : "bg-bad"}`} />;
  return (
    <>
      <PageHeader title="Platform health" subtitle="Is the machinery that monitors your customers' websites working?" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="flex items-center gap-4 p-5">{dot(data.database)}<div><p className="font-semibold">Database</p><p className="text-sm text-muted">{data.database ? "Reachable" : "Not reachable"}</p></div></Card>
        <Card className="flex items-center gap-4 p-5">{dot(data.worker.ok)}<div><p className="font-semibold">Monitoring worker</p>
          <p className="text-sm text-muted">{data.worker.last_beat ? `Last heartbeat ${fmtAgo(data.worker.last_beat)} · ${data.worker.sites ?? 0} sites` : "No heartbeat yet. Is the worker service running?"}</p></div></Card>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile label="Checks, last hour" value={data.checks_last_hour} /><Tile label="Failed checks, last hour" value={data.failed_checks_last_hour} />
        <Tile label="Open incidents" value={data.open_incidents} /><Tile label="FlockText credits left" value={data.sms_wallet ?? "—"} note={data.sms_wallet === null ? "Not connected" : data.sms_wallet < 200 ? "Top up soon" : undefined} tone={data.sms_wallet !== null && data.sms_wallet < 200 ? "warn" : "muted"} /><Tile label="SMS sent / failed (24h)" value={`${data.sms_sent_24h} / ${data.sms_failed_24h}`} tone={data.sms_failed_24h ? "warn" : "muted"} /></div>
      <Card className="p-5"><CardTitle>Integrations</CardTitle>
        <ul className="flex flex-col">{Object.entries(data.integrations).map(([k, on]) => <li key={k} className="flex items-center justify-between border-t border-line-soft py-3 text-sm first:border-0"><span>{names[k] ?? k}</span><span className="flex items-center gap-2">{dot(on)}{on ? "Connected" : "Not configured"}</span></li>)}</ul></Card>
    </>
  );
}
