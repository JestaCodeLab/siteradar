"use client";

import Link from "next/link";
import { Hash, Lock, Mail, MessageSquare, Smartphone, Users, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { btn, input } from "./ui";
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
  const { ws, isAdmin, mutate } = useMe();
  const toast = useToast();
  const dialog = useRef<HTMLDialogElement>(null);
  const { data } = useSWR<SettingsData>(ws && isAdmin && ws.onboarded && !ws.alerts_prompted ? "/api/settings" : null, fetcher);
  const [busy, setBusy] = useState(false);
  const [closed, setClosed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const show = !!data && !closed && !!ws && isAdmin && ws.onboarded && !ws.alerts_prompted;

  useEffect(() => {
    const d = dialog.current;
    if (show && d && !d.open) d.showModal();
  }, [show]);

  if (!show || !ws || !data) return null;
  const sms = ws.plan.channels.includes("sms"), chat = ws.plan.channels.includes("chat");

  async function finish(save: FormData | null) {
    setBusy(true); setError(null);
    try {
      if (save) {
        const payload: Record<string, string[]> = {};
        const emails = String(save.get("emails") ?? "").split(/[,\s]+/).filter(Boolean);
        if (emails.length) payload.alert_emails = emails;
        if (sms) {
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
        toast.success("Alerts saved.", "You can change them any time in Settings.");
      }
      await send("POST", "/api/account/alerts-prompted");
      setClosed(true); dialog.current?.close(); await mutate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save. Please try again.");
    }
    setBusy(false);
  }

  return (
    <dialog
      ref={dialog} aria-labelledby="wa-title" onCancel={(e) => { e.preventDefault(); if (!busy) void finish(null); }}
      className="m-auto w-[min(560px,calc(100vw-32px))] rounded-2xl border border-line bg-surface p-0 text-ink shadow-[0_24px_80px_rgba(15,23,42,0.28)] backdrop:bg-[#0F172A]/60"
    >
      <form onSubmit={(e) => { e.preventDefault(); void finish(new FormData(e.currentTarget)); }} className="flex max-h-[calc(100vh-32px)] flex-col">
        <div className="flex items-start justify-between gap-4 p-6 pb-4">
          <div>
            <h2 id="wa-title" className="text-xl font-bold">Where should we send alerts?</h2>
            <p className="mt-1 text-[15px] text-muted">Tell us how to reach you when a website goes down. You can change this later in Settings.</p>
          </div>
          <button type="button" onClick={() => void finish(null)} aria-label="Skip for now" className="-m-1 flex size-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-soft hover:text-ink"><X aria-hidden="true" size={18} /></button>
        </div>

        <div className="flex flex-col gap-3 overflow-y-auto px-6 pb-2">
          <Row icon={Mail} title="Email" sub="Always on. Separate several addresses with commas.">
            <input name="emails" aria-label="Alert emails" defaultValue={data.alerts.emails.join(", ")} placeholder="you@company.com" className={input} />
          </Row>
          <Row icon={Smartphone} title="SMS" sub="Ghana numbers only." locked={sms ? undefined : "Growth plan"}>
            {sms
              ? <input name="phone" inputMode="tel" aria-label="Ghana phone number" placeholder="024 123 4567" className={input} />
              : <p className="text-[13px] text-muted">SMS alerts come with the Growth plan. <Link href="/settings?tab=billing" className="font-semibold text-brand underline">See plans</Link></p>}
          </Row>
          <Row icon={Hash} title="Slack" sub="Paste an incoming webhook URL." locked={chat ? undefined : "Starter plan"}>
            {chat ? <input name="slack" type="url" aria-label="Slack webhook URL" placeholder="https://hooks.slack.com/services/…" className={input} />
              : <p className="text-[13px] text-muted">Chat alerts come with the Starter plan. <Link href="/settings?tab=billing" className="font-semibold text-brand underline">See plans</Link></p>}
          </Row>
          <Row icon={Users} title="Microsoft Teams" sub="Paste a Teams workflow or webhook URL." locked={chat ? undefined : "Starter plan"}>
            {chat ? <input name="teams" type="url" aria-label="Microsoft Teams webhook URL" placeholder="https://…webhook.office.com/…" className={input} />
              : <p className="text-[13px] text-muted">Chat alerts come with the Starter plan.</p>}
          </Row>
          {error && <p role="alert" className="rounded-lg bg-bad-soft px-3.5 py-2.5 text-sm text-bad">{error}</p>}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 p-6 pt-4">
          <span className="inline-flex items-center gap-1.5 text-[13px] text-muted"><MessageSquare aria-hidden="true" size={14} />Change these any time in Settings, Alerts.</span>
          <div className="flex gap-2.5">
            <button type="button" disabled={busy} onClick={() => void finish(null)} className={btn.secondary}>Skip for now</button>
            <button disabled={busy} className={btn.primary}>{busy ? "Saving…" : "Save alerts"}</button>
          </div>
        </div>
      </form>
    </dialog>
  );
}
