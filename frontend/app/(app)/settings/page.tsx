"use client";

import { useState } from "react";
import useSWR from "swr";
import { btn, Card, CardTitle, ErrorState, PageHeader, Skeleton } from "@/components/ui";
import { ApiError, fetcher, send, type SettingsData } from "@/lib/api";

function Status({ on, yes, no }: { on: boolean; yes: string; no: string }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[13px] font-semibold ${on ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn"}`}>{on ? yes : no}</span>;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-t border-line-soft py-3.5 first:border-t-0">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-sm font-medium">{children}</dd>
    </div>
  );
}

export default function SettingsPage() {
  const { data, error, mutate } = useSWR<SettingsData>("/api/settings", fetcher);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  if (error) return <ErrorState message={error.message} retry={() => mutate()} />;
  if (!data) return <div className="flex flex-col gap-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-40" /><Skeleton className="h-56" /></div>;
  const m = data.monitoring;

  async function testAlert() {
    setBusy(true);
    setNote(null);
    try {
      const r = await send<{ sent: boolean; to: string[] }>("POST", "/api/settings/test-alert");
      setNote({ ok: true, text: `Test alert sent to ${r.to.join(", ")}.` });
    } catch (e) {
      setNote({ ok: false, text: e instanceof ApiError && e.status === 502 ? "No alert could be delivered. Check the email settings on the server (SMTP_PASSWORD)." : "Could not send the test alert." });
    }
    setBusy(false);
  }

  return (
    <>
      <PageHeader title="Settings" subtitle="Your account and how SiteWatch watches and alerts. Changes to these values are made on the server." />

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="p-5">
          <CardTitle>Account</CardTitle>
          <dl>
            <Row label="Signed in as">{data.username}</Row>
            <Row label="Login type">Shared team login</Row>
            <Row label="Password">Set by the account owner</Row>
          </dl>
          <p className="mt-3 text-sm leading-relaxed text-muted">Everyone uses the same password. To change it, update the <code className="font-mono">SITEWATCH_PASSWORD</code> variable on the server. Everyone is signed out and signs in again with the new one.</p>
        </Card>

        <Card className="p-5">
          <CardTitle aside={<Status on={data.alerts.email_configured} yes="Email connected" no="Email not connected" />}>Alerts and reports</CardTitle>
          <p className="mb-3 text-sm text-muted">Down, recovery, slow and SSL alerts, and the monthly subscription report, go to:</p>
          <ul className="mb-4 flex flex-wrap gap-2">
            {data.alerts.email_to.map((e) => <li key={e} className="rounded-full bg-soft px-3 py-1.5 text-sm">{e}</li>)}
            {data.alerts.email_to.length === 0 && <li className="text-sm text-muted">No recipients set.</li>}
          </ul>
          <dl>
            <Row label="Sent from">{data.alerts.from ?? "—"}</Row>
            <Row label="Chat webhooks (Slack, Teams, Discord)">{data.alerts.webhooks}</Row>
          </dl>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button onClick={testAlert} disabled={busy} className={btn.secondary}>{busy ? "Sending…" : "Send test alert"}</button>
            {note && <p role="status" className={`text-sm ${note.ok ? "text-ok" : "text-bad"}`}>{note.text}</p>}
          </div>
        </Card>

        <Card className="p-5">
          <CardTitle>Monitoring</CardTitle>
          <dl>
            <Row label="Uptime check every">{m.check_interval_minutes} minutes</Row>
            <Row label="Alert after">{m.failures_before_alert} failed checks in a row</Row>
            <Row label="Check timeout">{m.timeout_seconds} seconds</Row>
            <Row label="Slow response threshold">{m.slow_threshold_ms / 1000} seconds</Row>
            <Row label="SSL warning">{m.ssl_warning_days} days before expiry</Row>
            <Row label="Nightly audit">{m.audit_daily_at}, up to {m.audit_max_pages} pages</Row>
            <Row label="Monthly reports">Day {m.report_day_of_month} at {m.report_at}</Row>
            <Row label="Server timezone">{m.timezone}</Row>
          </dl>
        </Card>

        <Card className="p-5">
          <CardTitle>Connections</CardTitle>
          <dl>
            <Row label="Google PageSpeed (Core Web Vitals)"><Status on={data.integrations.pagespeed} yes="Connected" no="No API key" /></Row>
            <Row label="Email (SMTP)"><Status on={data.integrations.email} yes="Connected" no="Not connected" /></Row>
            <Row label="Tracking script address"><span className="break-all font-mono text-[13px]">{data.public_url}</span></Row>
          </dl>
        </Card>
      </div>
    </>
  );
}
