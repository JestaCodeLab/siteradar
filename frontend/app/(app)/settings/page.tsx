"use client";

import { opts, Select } from "@/components/select";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useRef, useState } from "react";
import useSWR from "swr";
import { BillingPanel } from "@/components/billing-panel";
import { TeamPanel } from "@/components/team-panel";
import { ErrorState, PageHeader, Skeleton } from "@/components/ui";
import { ApiError, fetcher, send, type SettingsData } from "@/lib/api";
import { fmtSize, splitEmails } from "@/lib/format";
import { useMe } from "@/lib/me";
import { useNoteToast } from "@/components/toast";

type Tab = "company" | "profile" | "team" | "billing" | "alerts";
const countries = ["Ghana", "Nigeria", "Kenya", "South Africa", "United Kingdom", "Other"];
const zones = [["Africa/Accra", "Africa/Accra (GMT)"], ["Africa/Lagos", "Africa/Lagos (WAT)"], ["Africa/Nairobi", "Africa/Nairobi (EAT)"], ["Europe/London", "Europe/London"]];

const box = "rounded-[14px] border border-line bg-surface p-[22px]";
const inputCls = "min-h-[46px] w-full rounded-lg border border-[#c9cfd8] bg-surface px-3.5 text-[15px] disabled:bg-soft";
const primary = "inline-flex min-h-11 items-center justify-center rounded-lg bg-brand px-[18px] text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60";
const secondary = "inline-flex min-h-11 items-center justify-center rounded-lg border border-[#c9cfd8] bg-surface px-[18px] text-sm font-semibold hover:bg-soft disabled:opacity-60";

function Lbl({ id, children, hint }: { id: string; children: React.ReactNode; hint?: React.ReactNode }) {
  return <label htmlFor={id} className="flex flex-wrap items-center gap-2 text-sm font-medium">{children}{hint}</label>;
}
const Verified = () => <span className="rounded-full bg-ok-soft px-2 py-0.5 text-xs font-semibold text-ok">Verified</span>;

// ---- company -------------------------------------------------------------------------
function Company() {
  const { ws, isAdmin, isOwner, me, mutate } = useMe();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const setNote = useNoteToast();
  const [busy, setBusy] = useState(false);
  const [danger, setDanger] = useState(false);
  const [confirmName, setConfirmName] = useState("");
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
  async function deleteWorkspace() {
    try { await send("POST", "/api/account/workspace/delete", { confirm: confirmName }); await mutate(); router.replace(me?.user?.is_super ? "/admin" : "/onboarding/company"); }
    catch (err) { setNote({ ok: false, text: err instanceof Error ? err.message : "Could not delete the workspace." }); }
  }
  const initials = ws.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="flex max-w-[860px] flex-col gap-5">
      <section aria-label="Company" className={`${box} flex flex-col gap-5`}>
        <h2 className="text-lg font-semibold">Company</h2>
        <div className="flex flex-col gap-2">
          <span id="logo" className="text-sm font-medium">Logo <span className="font-normal text-muted">(shown at the top of your reports)</span></span>
          <div aria-labelledby="logo" className="flex flex-wrap items-center gap-4 rounded-xl border border-line p-3.5">
            {ws.logo_url ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={ws.logo_url} alt="" className="size-12 shrink-0 rounded-lg border border-line bg-white object-contain" />
              : <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-[#0f1420] text-sm font-semibold text-white">{initials}</span>}
            <span className="flex min-w-0 flex-1 flex-col"><span className="truncate text-sm font-semibold">{ws.logo_url ? ws.logo_name || "Company logo" : "No logo yet"}</span>
              <span className="text-[13px] text-muted">{ws.logo_size ? `${fmtSize(ws.logo_size)} · ` : ""}PNG, JPG or WebP up to 1.5 MB</span></span>
            {isAdmin && (
              <span className="flex gap-2"><input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label="Choose logo" onChange={(e) => upload(e.target.files?.[0])} />
                <button onClick={() => fileRef.current?.click()} className={`${secondary} !min-h-10`}>{ws.logo_url ? "Replace" : "Upload"}</button>
                {ws.logo_url && <button onClick={removeLogo} className={`${secondary} !min-h-10`}>Remove</button>}</span>)}
          </div>
        </div>
        <form onSubmit={save} className="flex flex-col gap-5">
          <fieldset disabled={!isAdmin} className="flex flex-col gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2"><Lbl id="co">Company name</Lbl><input id="co" name="name" required defaultValue={ws.name} className={inputCls} /></div>
              <div className="flex flex-col gap-2"><Lbl id="web">Company website</Lbl><input id="web" name="website" type="url" defaultValue={ws.website ?? ""} className={inputCls} /></div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2"><Lbl id="ct">Country</Lbl><Select id="ct" name="country" defaultValue={ws.country ?? "Ghana"} options={opts(countries)} /></div>
              <div className="flex flex-col gap-2"><Lbl id="tz">Time zone</Lbl><Select id="tz" name="timezone" defaultValue={ws.timezone ?? "Africa/Accra"} options={zones.map(([value, label]) => ({ value, label }))} /></div>
            </div>
          </fieldset>
          <div className="flex items-center gap-4">{isAdmin && <button disabled={busy} className={primary}>{busy ? "Saving…" : "Save changes"}</button>}</div>
          {!isAdmin && <p className="text-sm text-muted">Only owners and admins can change company details.</p>}
        </form>
      </section>

      {isOwner && (
        <section aria-label="Danger zone" className="flex flex-col gap-3.5 rounded-[14px] border border-[#f1c9c4] bg-surface p-[22px]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="flex max-w-[560px] flex-col gap-0.5"><span className="text-base font-semibold">Delete this workspace</span><span className="text-sm text-muted">Only the owner can do this. All websites, reports and invoices are removed after 30 days.</span></span>
            <button onClick={() => setDanger((d) => !d)} className="inline-flex min-h-11 items-center rounded-lg border border-bad bg-surface px-[18px] text-sm font-semibold text-bad hover:bg-bad-soft">Delete workspace</button>
          </div>
          {danger && (
            <div className="flex flex-col gap-3 rounded-xl bg-bad-soft p-4">
              <label htmlFor="confirm" className="text-sm font-medium text-bad">Type <b>{ws.name}</b> to confirm. Monitoring stops straight away and your team loses access.</label>
              <div className="flex flex-wrap gap-3"><input id="confirm" value={confirmName} onChange={(e) => setConfirmName(e.target.value)} className={`${inputCls} max-w-sm`} />
                <button onClick={deleteWorkspace} disabled={confirmName.trim() !== ws.name} className="inline-flex min-h-11 items-center rounded-lg bg-bad px-[18px] text-sm font-semibold text-white disabled:opacity-50">Delete for good</button></div>
            </div>)}
        </section>
      )}
    </div>
  );
}

// ---- profile and security ----------------------------------------------------------------
function Profile() {
  const { user, mutate } = useMe();
  const setPn = useNoteToast();
  const setPw = useNoteToast();
  const [mail, setMail] = useState<{ step: "idle" | "password" | "code" }>({ step: "idle" });
  const [newEmail, setNewEmail] = useState("");
  if (!user) return null;

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget)); setPn(null);
    try { await send("PATCH", "/api/account/profile", { first_name: f.first_name, last_name: f.last_name, phone: f.phone }); await mutate(); setPn({ ok: true, text: "Saved." }); }
    catch (err) { setPn({ ok: false, text: err instanceof Error ? err.message : "Could not save." }); }
  }
  async function askEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    try { await send("POST", "/api/account/email", { email: newEmail, password: f.get("password") }); { setMail({ step: "code" }); setPn({ ok: true, text: `We sent a 6-digit code to ${newEmail}.` }); }; await mutate(); }
    catch (err) { { setMail({ step: "password" }); setPn({ ok: false, text: err instanceof Error ? err.message : "Could not start the change." }); }; }
  }
  async function confirmEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    try { await send("POST", "/api/account/email/confirm", { code: f.get("code") }); await mutate(); { setMail({ step: "idle" }); setPn({ ok: true, text: "Your email address was changed." }); }; setNewEmail(""); }
    catch (err) { { setMail({ step: "code" }); setPn({ ok: false, text: err instanceof Error ? err.message : "That code did not work." }); }; }
  }
  async function password(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = e.currentTarget; const f = Object.fromEntries(new FormData(form)); setPw(null);
    try { await send("POST", "/api/account/password", f); form.reset(); setPw({ ok: true, text: "Password changed." }); } catch (err) { setPw({ ok: false, text: err instanceof Error ? err.message : "Could not change the password." }); }
  }
  async function others() {
    try { await send("POST", "/api/account/sessions/logout-others"); setPw({ ok: true, text: "Signed out of all other devices." }); } catch (err) { setPw({ ok: false, text: err instanceof Error ? err.message : "Could not sign out other devices." }); }
  }

  return (
    <div className="flex max-w-[860px] flex-col gap-5">
      <section aria-label="Profile" className={`${box} flex flex-col gap-5`}>
        <h2 className="text-lg font-semibold">Your details</h2>
        <form onSubmit={save} className="flex flex-col gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2"><Lbl id="fn">First name</Lbl><input id="fn" name="first_name" required defaultValue={user.first_name} className={inputCls} /></div>
            <div className="flex flex-col gap-2"><Lbl id="ln">Last name</Lbl><input id="ln" name="last_name" required defaultValue={user.last_name} className={inputCls} /></div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2"><Lbl id="em" hint={user.email_verified ? <Verified /> : undefined}>Email</Lbl>
              <input id="em" type="email" value={newEmail || user.email} onChange={(e) => { setNewEmail(e.target.value); setMail({ step: e.target.value && e.target.value !== user.email ? "password" : "idle" }); }} className={inputCls} />
              <span className="text-[13px] text-muted">Changing it sends a 6-digit code to the new address.</span></div>
            <div className="flex flex-col gap-2"><Lbl id="ph">Phone</Lbl><input id="ph" name="phone" type="tel" defaultValue={user.phone} className={inputCls} /><span className="text-[13px] text-muted">Used for SMS alerts.</span></div>
          </div>
          <div className="flex items-center gap-4"><button className={primary}>Save changes</button></div>
        </form>

        {mail.step === "password" && newEmail && (
          <form onSubmit={askEmail} className="flex flex-wrap items-end gap-3 rounded-xl bg-soft p-4">
            <div className="flex min-w-[220px] flex-1 flex-col gap-2"><Lbl id="mp">Confirm with your password to change your email to {newEmail}</Lbl><input id="mp" name="password" type="password" required autoComplete="current-password" className={inputCls} /></div>
            <button className={primary}>Send code</button></form>)}
        {mail.step === "code" && (
          <form onSubmit={confirmEmail} className="flex flex-wrap items-end gap-3 rounded-xl bg-soft p-4">
            <div className="flex min-w-[220px] flex-1 flex-col gap-2"><Lbl id="mc">6-digit code sent to {user.pending_email ?? newEmail}</Lbl><input id="mc" name="code" inputMode="numeric" maxLength={6} required className={`${inputCls} font-mono tracking-widest`} /></div>
            <button className={primary}>Confirm new email</button></form>)}
      </section>

      <section aria-label="Password" className={`${box} flex flex-col gap-5`}>
        <h2 className="text-lg font-semibold">Password and sessions</h2>
        <form onSubmit={password} className="flex flex-col gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2"><Lbl id="cp">Current password</Lbl><input id="cp" name="current" type="password" required autoComplete="current-password" className={inputCls} /></div>
            <div className="flex flex-col gap-2"><Lbl id="np">New password</Lbl><input id="np" name="password" type="password" required minLength={8} autoComplete="new-password" className={inputCls} /></div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3"><button type="button" onClick={others} className={secondary}>Log out of all other devices</button><button className={primary}>Change password</button></div>
        </form>
      </section>
    </div>
  );
}

// ---- alerts -------------------------------------------------------------------------------------
interface Prefs { prefs: Record<string, { email: boolean; sms: boolean }>; events: { id: string; label: string; sub: string }[] }

function Alerts({ data, refresh }: { data: SettingsData; refresh: () => void }) {
  const { user, isAdmin, ws } = useMe();
  const { data: pref, mutate: refreshPrefs } = useSWR<Prefs>("/api/account/alert-prefs", fetcher);
  const setNote = useNoteToast();
  const [busy, setBusy] = useState(false);
  const [hooks, setHooks] = useState(false);
  const a = data.alerts, sms = a.channels.includes("sms"), chat = a.channels.includes("chat");

  async function saveRecipients(e: React.FormEvent<HTMLFormElement>) {
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
  async function toggle(id: string, ch: "email" | "sms", on: boolean) {
    if (!pref) return;
    const next = { ...pref.prefs, [id]: { ...pref.prefs[id], [ch]: on } };
    await refreshPrefs({ ...pref, prefs: next }, false);
    await send("PUT", "/api/account/alert-prefs", { prefs: next });
  }

  const row = "flex flex-wrap items-center gap-3 border-t border-line-soft py-3.5 first:border-0";
  const on = <span className="rounded-full bg-ok-soft px-2.5 py-1 text-xs font-semibold text-ok">On</span>;

  return (
    <div className="flex max-w-[860px] flex-col gap-5">
      <section aria-label="Channels" className={box}>
        <h2 className="mb-2 text-lg font-semibold">Where alerts go</h2>
        <div className={row}><span className="flex min-w-0 flex-1 flex-col"><span className="text-sm font-semibold">Email</span><span className="truncate text-[13px] text-muted">{a.emails.join(", ") || user?.email} · included on every plan</span></span>{on}</div>
        {sms ? (
          <div className={row}><span className="flex min-w-0 flex-1 flex-col"><span className="text-sm font-semibold">SMS</span>
            <span className="text-[13px] text-muted">{a.phones.join(", ") || "No number added yet"} · {a.sms_used} of {a.sms_quota} messages used this month{a.sms_credits ? ` (+${a.sms_credits} bought)` : ""}</span></span>
            {isAdmin && <Link href="/settings?tab=billing" className={`${secondary} !min-h-10`}>Buy more</Link>}{a.phones.length > 0 && on}</div>
        ) : (
          <div className={row}><span className="flex min-w-0 flex-1 flex-col"><span className="text-sm font-semibold">SMS alerts</span><span className="text-[13px] text-muted">Available on the Growth plan and above.</span></span>
            {isAdmin && <Link href="/settings?tab=billing" className="flex min-h-11 items-center text-sm font-semibold text-brand">Upgrade</Link>}</div>)}
        {chat ? (
          <div className={row}><span className="flex min-w-0 flex-1 flex-col"><span className="text-sm font-semibold">Slack, Teams or Discord</span>
            <span className="text-[13px] text-muted">{a.webhooks.length ? `${a.webhooks.length} channel${a.webhooks.length === 1 ? "" : "s"} connected` : "No channel connected yet"}</span></span>
            {isAdmin && <button onClick={() => setHooks((h) => !h)} className={`${secondary} !min-h-10`}>{a.webhooks.length ? "Edit channels" : "Add a channel"}</button>}{a.webhooks.length > 0 && on}</div>
        ) : (
          <div className={row}><span className="flex min-w-0 flex-1 flex-col"><span className="text-sm font-semibold">Slack, Teams or Discord</span><span className="text-[13px] text-muted">Available on the Starter plan and above.</span></span>
            {isAdmin && <Link href="/settings?tab=billing" className="flex min-h-11 items-center text-sm font-semibold text-brand">Upgrade</Link>}</div>)}
      </section>

      <section aria-label="What you are alerted about" className={box}>
        <h2 className="text-lg font-semibold">What you are alerted about</h2>
        <p className="mb-3 mt-1 text-sm text-muted">These choices are for you. Each team member sets their own.</p>
        <div className="overflow-x-auto"><div className="min-w-[460px]">
          <div className="grid grid-cols-[1fr_70px_70px] items-center gap-3 border-b border-line pb-2.5 text-xs font-semibold uppercase tracking-[0.04em] text-muted"><span /><span>Email</span><span>SMS</span></div>
          {!pref ? <Skeleton className="mt-3 h-40" /> : pref.events.map((ev) => (
            <div key={ev.id} className="grid grid-cols-[1fr_70px_70px] items-center gap-3 border-b border-line-soft py-3 text-sm last:border-0">
              <span>{ev.label}<span className="block text-[13px] text-muted">{ev.sub}</span></span>
              <input type="checkbox" aria-label={`${ev.label} by email`} checked={pref.prefs[ev.id].email} onChange={(e) => toggle(ev.id, "email", e.target.checked)} className="size-[18px] accent-[#f97316]" />
              <input type="checkbox" aria-label={`${ev.label} by SMS`} checked={sms && pref.prefs[ev.id].sms} disabled={!sms} onChange={(e) => toggle(ev.id, "sms", e.target.checked)} className="size-[18px] accent-[#f97316]" />
            </div>))}
        </div></div>
      </section>

      {isAdmin && (
        <section aria-label="Alert recipients" className={box}>
          <h2 className="text-lg font-semibold">Who gets the workspace alerts</h2>
          <p className="mb-3 mt-1 text-sm text-muted">Addresses and numbers for {ws?.name}. People listed here can still turn individual alerts off above.</p>
          <form onSubmit={saveRecipients} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2"><Lbl id="emails" hint={<span className="font-normal text-muted">(separate with commas)</span>}>Email recipients</Lbl><input id="emails" name="emails" defaultValue={a.emails.join(", ")} className={inputCls} /></div>
            {sms && <div className="flex flex-col gap-2"><Lbl id="phones" hint={<span className="font-normal text-muted">(texts are sent for outages and recoveries)</span>}>SMS numbers</Lbl><input id="phones" name="phones" defaultValue={a.phones.join(", ")} placeholder="0241234567" className={inputCls} /></div>}
            {chat && (hooks || a.webhooks.length > 0) && <div className="flex flex-col gap-2"><Lbl id="hooks" hint={<span className="font-normal text-muted">(one per line)</span>}>Slack, Teams or Discord webhook addresses</Lbl><textarea id="hooks" name="hooks" rows={2} defaultValue={a.webhooks.join("\n")} placeholder="https://hooks.slack.com/services/…" className={`${inputCls} py-2.5`} /></div>}
            <div className="flex flex-wrap items-center gap-3"><button disabled={busy} className={primary}>Save changes</button><button type="button" onClick={test} disabled={busy} className={secondary}>Send test alert</button></div>
          </form>
        </section>
      )}
    </div>
  );
}

function Settings() {
  const router = useRouter();
  const params = useSearchParams();
  const { isAdmin } = useMe();
  const tabs: [Tab, string][] = [["company", "Company"], ["profile", "Profile and security"], ["team", "Team"], ...(isAdmin ? [["billing", "Billing"] as [Tab, string]] : []), ["alerts", "Alerts"]];
  const asked = params.get("tab") as Tab | null;
  const tab: Tab = tabs.some(([k]) => k === asked) ? (asked as Tab) : "company";
  const { data, error, mutate } = useSWR<SettingsData>(tab === "alerts" ? "/api/settings" : null, fetcher);
  return (
    <>
      <PageHeader title="Settings" subtitle="Your company, your own account and how you are alerted." />
      <div role="tablist" aria-label="Settings sections" className="flex flex-wrap gap-1.5 overflow-x-auto">
        {tabs.map(([k, label]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => router.replace(`/settings?tab=${k}`, { scroll: false })}
          className={`min-h-11 whitespace-nowrap rounded-lg px-4 text-sm ${tab === k ? "bg-brand-soft font-semibold text-brand-ink" : "font-medium text-muted hover:bg-soft"}`}>{label}</button>)}
      </div>
      {tab === "company" && <Company />}
      {tab === "profile" && <Profile />}
      {tab === "team" && <TeamPanel />}
      {tab === "billing" && <BillingPanel />}
      {tab === "alerts" && (error ? <ErrorState message={error.message} retry={() => mutate()} /> : !data ? <Skeleton className="h-64 max-w-[860px]" /> : <Alerts data={data} refresh={() => mutate()} />)}
    </>
  );
}

export default function SettingsPage() {
  return <Suspense><Settings /></Suspense>;
}
