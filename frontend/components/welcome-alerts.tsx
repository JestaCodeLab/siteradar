"use client";

import Link from "next/link";
import { CalendarClock, Hash, Lock, Mail, MessageSquare, Smartphone, Users, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { btn, input } from "./ui";
import { ReportSchedule } from "./report-schedule";
import { useToast } from "./toast";
import { fetcher, send, type SettingsData } from "@/lib/api";
import { ghanaPhone } from "@/lib/format";
import { useMe } from "@/lib/me";

function Row({ icon: Glyph, title, sub, locked, children }: {
  icon: typeof Mail; title: string; sub: string; locked?: string; children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-2.5 rounded-xl border border-line p-4 ${locked ? "bg-soft" : "bg-surface"}`}>
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand"><Glyph aria-hidden="true" size={18} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold">{title}</p>
          <p className="text-[13px] text-muted">{sub}</p>
        </div>
        {locked && <span className="inline-flex items-center gap-1 rounded-full bg-line-soft px-2.5 py-1 text-xs font-semibold text-ink-2"><Lock aria-hidden="true" size={12} />{locked}</span>}
      </div>
      {children}
    </div>
  );
}

/** Shown once, the first time an owner or admin reaches the dashboard. Everything here can be changed later in Settings. */
export function WelcomeAlerts() {
  const { me, ws, isAdmin, isGhana, mutate } = useMe();
  const asOwner = !me?.support;        // a support agent never answers the customer's first-visit questions
  const toast = useToast();
  const dialog = useRef<HTMLDialogElement>(null);
  const { data } = useSWR<SettingsData>(asOwner && ws && isAdmin && ws.onboarded && !ws.alerts_prompted ? "/api/settings" : null, fetcher);
  const [busy, setBusy] = useState(false);
  const [closed, setClosed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [sched, setSched] = useState<{ day: string; at: string } | null>(null);
  const show = !!data && !closed && asOwner && !!ws && isAdmin && ws.onboarded && !ws.alerts_prompted;

  useEffect(() => {
    const d = dialog.current;
    if (show && d && !d.open) d.showModal();
  }, [show]);

  if (!show || !ws || !data) return null;
  const cur = sched ?? { day: String(ws.report_day ?? 1), at: ws.report_at ?? "08:00" };
  const sms = ws.plan.channels.includes("sms"), chat = ws.plan.channels.includes("chat");

  /** Step 1: save the channels, then move on to the report date. */
  async function saveAlerts(save: FormData) {
    setBusy(true); setError(null);
    try {
      const payload: Record<string, string[]> = {};
      const emails = String(save.get("emails") ?? "").split(/[,\s]+/).filter(Boolean);
      if (emails.length) payload.alert_emails = emails;
      if (sms && isGhana) {
        const raw = String(save.get("phone") ?? "").trim();
        const phone = raw ? ghanaPhone(raw) : null;
        if (raw && !phone) { setError("Enter a Ghana number, like 024 123 4567."); setBusy(false); return; }
        if (phone) payload.alert_phones = [phone];
      }
      if (chat) {
        const hooks = [save.get("slack"), save.get("teams")].map((x) => String(x ?? "").trim()).filter(Boolean);
        if (hooks.some((h) => !h.startsWith("https://"))) { setError("Webhook addresses start with https://"); setBusy(false); return; }
        if (hooks.length) payload.alert_webhooks = hooks;
      }
      if (Object.keys(payload).length) await send("PATCH", "/api/settings/alerts", payload);
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save. Please try again.");
    }
    setBusy(false);
  }

  /** Step 2 (or closing early): optionally save the report date, then never show this dialog again. */
  async function finish(saveReport: boolean) {
    setBusy(true); setError(null);
    try {
      if (saveReport && sched) await send("PATCH", "/api/settings/report", sched);
      await send("POST", "/api/account/alerts-prompted");
      if (saveReport) toast.success("All set.", "You can change alerts and the report date any time in Settings.");
      setClosed(true); dialog.current?.close(); await mutate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save. Please try again.");
    }
    setBusy(false);
  }

  return (
    <dialog
      ref={dialog} aria-labelledby="wa-title" onCancel={(e) => { e.preventDefault(); if (!busy) void finish(false); }}
      className="m-auto w-[min(560px,calc(100vw-32px))] rounded-2xl border border-line bg-surface p-0 text-ink shadow-[0_24px_80px_rgba(15,23,42,0.28)] backdrop:bg-[#0F172A]/60"
    >
      <form
        onSubmit={(e) => { e.preventDefault(); if (step === 1) void saveAlerts(new FormData(e.currentTarget)); else void finish(true); }}
        className="flex max-h-[calc(100vh-32px)] flex-col"
      >
        <div className="flex items-start justify-between gap-4 p-6 pb-4">
          <div>
            <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.06em] text-muted">Step {step} of 2</p>
            <h2 id="wa-title" className="text-xl font-bold">{step === 1 ? "Where should we send alerts?" : "When should your monthly report arrive?"}</h2>
            <p className="mt-1 text-[15px] text-muted">{step === 1
              ? "Tell us how to reach you when a website goes down. You can change this later in Settings."
              : "Every month we email a report on how your websites did. Pick the day it goes out."}</p>
          </div>
          <button type="button" onClick={() => void finish(false)} aria-label="Close and set up later" className="-m-1 flex size-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-soft hover:text-ink"><X aria-hidden="true" size={18} /></button>
        </div>
        <div className="mx-6 mb-3 flex gap-1.5" aria-hidden="true"><span className="h-1 flex-1 rounded bg-brand" /><span className={`h-1 flex-1 rounded ${step === 2 ? "bg-brand" : "bg-line"}`} /></div>

        <div className="flex flex-col gap-3 overflow-y-auto px-6 pb-2">
          <div hidden={step !== 1} className="flex flex-col gap-3">
          <Row icon={Mail} title="Email" sub="Always on. Separate several addresses with commas.">
            <input name="emails" aria-label="Alert emails" defaultValue={data.alerts.emails.join(", ")} placeholder="you@company.com" className={input} />
          </Row>
          {isGhana && <Row icon={Smartphone} title="SMS" sub="Ghana numbers only." locked={sms ? undefined : "Growth plan"}>
            {sms
              ? <input name="phone" inputMode="tel" aria-label="Ghana phone number" placeholder="024 123 4567" className={input} />
              : <p className="text-[13px] text-muted">SMS alerts come with the Growth plan. <Link href="/settings?tab=billing" className="font-semibold text-brand underline">See plans</Link></p>}
          </Row>}
          <Row icon={Hash} title="Slack" sub="Paste an incoming webhook URL." locked={chat ? undefined : "Starter plan"}>
            {chat ? <input name="slack" type="url" aria-label="Slack webhook URL" placeholder="https://hooks.slack.com/services/…" className={input} />
              : <p className="text-[13px] text-muted">Chat alerts come with the Starter plan. <Link href="/settings?tab=billing" className="font-semibold text-brand underline">See plans</Link></p>}
          </Row>
          <Row icon={Users} title="Microsoft Teams" sub="Paste a Teams workflow or webhook URL." locked={chat ? undefined : "Starter plan"}>
            {chat ? <input name="teams" type="url" aria-label="Microsoft Teams webhook URL" placeholder="https://…webhook.office.com/…" className={input} />
              : <p className="text-[13px] text-muted">Chat alerts come with the Starter plan.</p>}
          </Row>
          </div>
          {step === 2 && (
            <>
              <div className="flex flex-col gap-3 rounded-xl border border-line p-4">
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand"><CalendarClock aria-hidden="true" size={18} /></span>
                  <div><p className="text-[15px] font-semibold">Monthly report date</p><p className="text-[13px] text-muted">The report covers the month before and goes to your alert emails.</p></div>
                </div>
                <ReportSchedule idPrefix="wa" day={cur.day} at={cur.at} onChange={setSched} />
              </div>
            </>
          )}
          {error && <p role="alert" className="rounded-lg bg-bad-soft px-3.5 py-2.5 text-sm text-bad">{error}</p>}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 p-6 pt-4">
          <span className="inline-flex items-center gap-1.5 text-[13px] text-muted"><MessageSquare aria-hidden="true" size={14} />{step === 1 ? "Change these any time in Settings, Alerts." : "Change this any time in Settings, Alerts."}</span>
          <div className="flex gap-2.5">
            {step === 2 && <button type="button" disabled={busy} onClick={() => setStep(1)} className={btn.secondary}>Back</button>}
            <button type="button" disabled={busy} onClick={() => (step === 1 ? setStep(2) : void finish(false))} className={btn.secondary}>Skip for now</button>
            <button disabled={busy} className={btn.primary}>{busy ? "Saving…" : step === 1 ? "Save and continue" : "Finish"}</button>
          </div>
        </div>
      </form>
    </dialog>
  );
}
