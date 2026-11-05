"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useRef, useState } from "react";
import useSWR from "swr";
import { BillingPanel } from "@/components/billing-panel";
import { TeamPanel } from "@/components/team-panel";
import { btn, Card, CardTitle, ErrorState, Field, input, PageHeader, Skeleton } from "@/components/ui";
import { ApiError, fetcher, send, type SettingsData } from "@/lib/api";
import { splitEmails } from "@/lib/format";
import { useMe } from "@/lib/me";

type Tab = "company" | "profile" | "team" | "billing" | "alerts" | "monitoring";
type Note = { ok: boolean; text: string } | null;
const countries = ["Ghana", "Nigeria", "Kenya", "South Africa", "United Kingdom", "Other"];

function Notice({ note }: { note: Note }) {
  return note ? <p role="status" className={`text-sm ${note.ok ? "text-ok" : "text-bad"}`}>{note.text}</p> : null;
}
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-t border-line-soft py-3.5 first:border-t-0">
      <dt className="text-sm text-muted">{label}</dt><dd className="text-sm font-medium">{children}</dd>
    </div>
  );
}

function Company() {
  const { ws, isAdmin, mutate } = useMe();
  const fileRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState<Note>(null);
  const [busy, setBusy] = useState(false);
  if (!ws) return null;

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget)); setBusy(true); setNote(null);
    try { await send("PATCH", "/api/account/workspace", f); await mutate(); setNote({ ok: true, text: "Saved." }); }
    catch (err) { setNote({ ok: false, text: err instanceof Error ? err.message : "Could not save." }); }
    setBusy(false);
  }
  async function upload(file?: File) {
    if (!file) return; const fd = new FormData(); fd.append("logo", file); setNote(null);
    try { await send("POST", "/api/account/logo", fd); await mutate(); setNote({ ok: true, text: "Logo updated." }); }
    catch (err) { setNote({ ok: false, text: err instanceof Error ? err.message : "Could not upload the logo." }); }
  }
  async function removeLogo() { await send("DELETE", "/api/onboarding/logo"); await mutate(); }

  return (
    <Card className="max-w-3xl p-5">
      <CardTitle>Company</CardTitle>
      <div className="mb-5 flex flex-wrap items-center gap-4">
        {ws.logo_url ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={ws.logo_url} alt="Company logo" className="size-16 rounded-lg border border-line bg-white object-contain" />
          : <span className="flex size-16 items-center justify-center rounded-lg bg-brand-soft text-lg font-semibold text-brand">{ws.name.slice(0, 2).toUpperCase()}</span>}
        <div className="flex-1"><p className="text-sm font-medium">Logo <span className="font-normal text-muted">(shown at the top of your reports)</span></p>
          <p className="text-[13px] text-muted">PNG, JPG or WebP up to 1.5 MB.</p></div>
        {isAdmin && <div className="flex gap-2">
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label="Choose logo" onChange={(e) => upload(e.target.files?.[0])} />
          <button onClick={() => fileRef.current?.click()} className={btn.secondary}>{ws.logo_url ? "Replace" : "Upload"}</button>
          {ws.logo_url && <button onClick={removeLogo} className={btn.secondary}>Remove</button>}</div>}
      </div>
      <form onSubmit={save} className="flex flex-col gap-5">
        <fieldset disabled={!isAdmin} className="grid gap-5 sm:grid-cols-2">
          <Field label="Company name" htmlFor="name"><input id="name" name="name" required defaultValue={ws.name} className={input} /></Field>
          <Field label="Company website" htmlFor="website"><input id="website" name="website" defaultValue={ws.website ?? ""} className={input} /></Field>
          <Field label="Country" htmlFor="country"><select id="country" name="country" defaultValue={ws.country ?? "Ghana"} className={input}>{countries.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Phone" htmlFor="phone"><input id="phone" name="phone" defaultValue={ws.phone ?? ""} className={input} /></Field>
        </fieldset>
        <div className="flex items-center gap-4">{isAdmin && <button disabled={busy} className={btn.primary}>{busy ? "Saving…" : "Save changes"}</button>}<Notice note={note} /></div>
        {!isAdmin && <p className="text-sm text-muted">Only owners and admins can change company details.</p>}
      </form>
    </Card>
  );
}

function Profile() {
  const { user, mutate } = useMe();
  const [pn, setPn] = useState<Note>(null);
  const [pw, setPw] = useState<Note>(null);
  if (!user) return null;
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget)); setPn(null);
    try { await send("PATCH", "/api/account/profile", f); await mutate(); setPn({ ok: true, text: "Saved." }); } catch (err) { setPn({ ok: false, text: err instanceof Error ? err.message : "Could not save." }); }
  }
  async function password(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = e.currentTarget; const f = Object.fromEntries(new FormData(form)); setPw(null);
    try { await send("POST", "/api/account/password", f); form.reset(); setPw({ ok: true, text: "Password changed." }); } catch (err) { setPw({ ok: false, text: err instanceof Error ? err.message : "Could not change the password." }); }
  }
  return (
    <div className="grid max-w-5xl gap-5 lg:grid-cols-2">
      <Card className="p-5"><CardTitle>Your details</CardTitle>
        <form onSubmit={save} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2"><Field label="First name" htmlFor="fn"><input id="fn" name="first_name" defaultValue={user.first_name} required className={input} /></Field>
            <Field label="Last name" htmlFor="ln"><input id="ln" name="last_name" defaultValue={user.last_name} required className={input} /></Field></div>
          <Field label="Email" htmlFor="em"><input id="em" value={user.email} readOnly className={`${input} bg-soft`} /></Field>
          <Field label="Phone" hint="used for SMS alerts" htmlFor="ph"><input id="ph" name="phone" defaultValue={user.phone} className={input} /></Field>
          <div className="flex items-center gap-4"><button className={btn.primary}>Save changes</button><Notice note={pn} /></div>
        </form></Card>
      <Card className="p-5"><CardTitle>Password</CardTitle>
        <form onSubmit={password} className="flex flex-col gap-4">
          <Field label="Current password" htmlFor="cp"><input id="cp" name="current" type="password" required autoComplete="current-password" className={input} /></Field>
          <Field label="New password" hint="at least 8 characters" htmlFor="np"><input id="np" name="password" type="password" required minLength={8} autoComplete="new-password" className={input} /></Field>
          <div className="flex items-center gap-4"><button className={btn.primary}>Change password</button><Notice note={pw} /></div>
        </form></Card>
    </div>
  );
}

function Alerts({ data, refresh }: { data: SettingsData; refresh: () => void }) {
  const { isAdmin } = useMe();
  const [note, setNote] = useState<Note>(null);
  const [busy, setBusy] = useState(false);
  const a = data.alerts, sms = a.channels.includes("sms"), chat = a.channels.includes("chat");

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget); setBusy(true); setNote(null);
    try {
      await send("PATCH", "/api/settings/alerts", {
        alert_emails: splitEmails(f.get("emails")),
        ...(sms ? { alert_phones: String(f.get("phones") ?? "").split(/[,\n]/).map((x) => x.trim()).filter(Boolean) } : {}),
        ...(chat ? { alert_webhooks: String(f.get("hooks") ?? "").split(/[\s,]+/).filter(Boolean) } : {}),
      });
      refresh(); setNote({ ok: true, text: "Saved." });
    } catch (err) { setNote({ ok: false, text: err instanceof Error ? err.message : "Could not save." }); }
    setBusy(false);
  }
  async function test() {
    setBusy(true); setNote(null);
    try { const r = await send<{ sent: boolean; to: string[] }>("POST", "/api/settings/test-alert"); setNote({ ok: true, text: `Test alert sent to ${r.to.join(", ")}.` }); }
    catch (e) { setNote({ ok: false, text: e instanceof ApiError && e.status === 502 ? "No alert could be delivered right now." : "Could not send the test alert." }); }
    setBusy(false);
  }

  return (
    <Card className="max-w-3xl p-5">
      <CardTitle>Where alerts go</CardTitle>
      <form onSubmit={save} className="flex flex-col gap-5">
        <fieldset disabled={!isAdmin} className="flex flex-col gap-5">
          <Field label="Email recipients" hint="down, recovery, SSL, domain and report emails; separate with commas" htmlFor="emails">
            <input id="emails" name="emails" defaultValue={a.emails.join(", ")} className={input} /></Field>
          {sms ? (
            <Field label="SMS numbers" hint={`${a.sms_used} of ${a.sms_quota} messages used this month; texts are sent for outages and recoveries`} htmlFor="phones">
              <input id="phones" name="phones" defaultValue={a.phones.join(", ")} placeholder="0241234567" className={input} /></Field>
          ) : <p className="rounded-lg bg-soft p-3.5 text-sm text-ink-2"><b>SMS alerts</b> are available on the Growth plan and above. <Link href="/settings?tab=billing" className="font-semibold text-brand">See plans</Link></p>}
          {chat ? (
            <Field label="Slack, Teams or Discord webhook addresses" hint="one per line" htmlFor="hooks">
              <textarea id="hooks" name="hooks" rows={2} defaultValue={a.webhooks.join("\n")} placeholder="https://hooks.slack.com/services/…" className={`${input} py-2.5`} /></Field>
          ) : <p className="rounded-lg bg-soft p-3.5 text-sm text-ink-2"><b>Slack, Teams and Discord</b> alerts are available on the Starter plan and above. <Link href="/settings?tab=billing" className="font-semibold text-brand">See plans</Link></p>}
        </fieldset>
        {isAdmin && <div className="flex flex-wrap items-center gap-3"><button disabled={busy} className={btn.primary}>Save changes</button>
          <button type="button" onClick={test} disabled={busy} className={btn.secondary}>Send test alert</button><Notice note={note} /></div>}
        {!isAdmin && <p className="text-sm text-muted">Only owners and admins can change alert settings.</p>}
      </form>
    </Card>
  );
}

function Monitoring({ data }: { data: SettingsData }) {
  const m = data.monitoring;
  return (
    <Card className="max-w-3xl p-5"><CardTitle>Monitoring on your plan</CardTitle>
      <dl>
        <Row label="Uptime check every">{m.check_interval_minutes} minute{m.check_interval_minutes === 1 ? "" : "s"}</Row>
        <Row label="Alert after">{m.failures_before_alert} failed checks in a row</Row>
        <Row label="Slow response threshold">{m.slow_threshold_ms / 1000} seconds</Row>
        <Row label="SSL warning">{m.ssl_warning_days} days before expiry</Row>
        <Row label="Nightly audit">{m.audit_daily_at}, up to {m.audit_max_pages} pages</Row>
        <Row label="Monthly reports">Day {m.report_day_of_month} at {m.report_at}</Row>
        <Row label="History kept">{m.history_months} month{m.history_months === 1 ? "" : "s"}</Row>
        <Row label="Timezone">{m.timezone}</Row>
      </dl></Card>
  );
}

function Settings() {
  const router = useRouter();
  const params = useSearchParams();
  const { isAdmin } = useMe();
  const tabs: [Tab, string][] = [["company", "Company"], ["profile", "Your account"], ["team", "Team"], ...(isAdmin ? [["billing", "Billing"] as [Tab, string]] : []), ["alerts", "Alerts"], ["monitoring", "Monitoring"]];
  const asked = params.get("tab") as Tab | null;
  const tab: Tab = tabs.some(([k]) => k === asked) ? (asked as Tab) : "company";
  const { data, error, mutate } = useSWR<SettingsData>(tab === "alerts" || tab === "monitoring" ? "/api/settings" : null, fetcher);
  return (
    <>
      <PageHeader title="Settings" subtitle="Your company, team, billing and how you are alerted." />
      <div role="tablist" aria-label="Settings" className="flex flex-wrap gap-1 overflow-x-auto border-b border-line">
        {tabs.map(([k, label]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => router.replace(`/settings?tab=${k}`, { scroll: false })}
          className={`min-h-11 whitespace-nowrap border-b-2 px-4 text-sm font-semibold ${tab === k ? "border-brand text-brand" : "border-transparent text-ink-2 hover:text-ink"}`}>{label}</button>)}
      </div>
      {tab === "company" && <Company />}
      {tab === "profile" && <Profile />}
      {tab === "team" && <TeamPanel />}
      {tab === "billing" && <BillingPanel />}
      {(tab === "alerts" || tab === "monitoring") && (error ? <ErrorState message={error.message} retry={() => mutate()} /> : !data ? <Skeleton className="h-64 max-w-3xl" />
        : tab === "alerts" ? <Alerts data={data} refresh={() => mutate()} /> : <Monitoring data={data} />)}
    </>
  );
}

export default function SettingsPage() {
  return <Suspense><Settings /></Suspense>;
}
