"use client";

import { Bell, Download, Share, X } from "lucide-react";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { btn } from "./ui";
import { useToast } from "./toast";
import { fetcher, send } from "@/lib/api";
import { disablePush, enablePush, installApp, startPwa, usePwa } from "@/lib/pwa";

const KEY = "siteradar-pwa-banner";
const SNOOZE_MS = 14 * 86400 * 1000;
const snoozed = () => { try { const t = Number(localStorage.getItem(KEY)); return !!t && Date.now() - t < SNOOZE_MS; } catch { return false; } };
const snooze = () => { try { localStorage.setItem(KEY, String(Date.now())); } catch { /* it simply shows again next visit */ } };

interface PushConfig { enabled: boolean; public_key: string | null }
export const usePushConfig = () => useSWR<PushConfig>("/api/push/config", fetcher, { revalidateOnFocus: false });

/** Registers the service worker and offers, one at a time, to install SiteRadar as an app and to turn on browser notifications. */
export function PwaBanner() {
  const pwa = usePwa();
  const { data: cfg } = usePushConfig();
  const toast = useToast();
  const [hidden, setHidden] = useState(() => (typeof window === "undefined" ? true : snoozed()));
  const [busy, setBusy] = useState(false);
  useEffect(() => { startPwa(); }, []);

  if (!pwa.ready || hidden) return null;
  const wantInstall = !pwa.installed && (pwa.canPrompt || pwa.ios);
  const wantPush = !!cfg?.enabled && pwa.pushSupported && pwa.permission === "default" && !pwa.subscribed && (pwa.installed || !pwa.ios);
  if (!wantInstall && !wantPush) return null;

  const later = () => { snooze(); setHidden(true); };
  async function install() { setBusy(true); await installApp(); setBusy(false); }
  async function turnOn() {
    setBusy(true);
    const problem = await enablePush(cfg!.public_key!);
    setBusy(false);
    if (problem) toast.error(problem); else { toast.success("Notifications are on.", "You will see alerts on this device."); setHidden(true); }
  }

  const Icon = wantInstall ? (pwa.canPrompt ? Download : Share) : Bell;
  return (
    <section aria-label={wantInstall ? "Install the app" : "Turn on notifications"} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-brand/30 bg-brand-soft px-4 py-3 text-brand-ink lg:px-6">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand text-white"><Icon aria-hidden="true" size={18} /></span>
      <div className="flex min-w-0 flex-1 basis-64 flex-col">
        {wantInstall ? (
          <>
            <b className="text-sm">Install SiteRadar as an app</b>
            <span className="text-[13px] leading-snug">{pwa.canPrompt ? "Open it from your desktop or home screen, and get alerts the moment a website goes down." : "On iPhone and iPad: tap the Share button in Safari, then Add to Home Screen. Alerts work once it is installed."}</span>
          </>
        ) : (
          <>
            <b className="text-sm">Get alerts on this device</b>
            <span className="text-[13px] leading-snug">Know straight away when a website goes down or an SSL certificate is about to expire. You can choose which alerts you get under Settings, Alerts.</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        {wantInstall && pwa.canPrompt && <button type="button" onClick={install} disabled={busy} className={btn.primary}>Install app</button>}
        {!wantInstall && <button type="button" onClick={turnOn} disabled={busy} className={btn.primary}>{busy ? "Turning on…" : "Turn on notifications"}</button>}
        <button type="button" onClick={later} aria-label="Not now" className="flex size-10 items-center justify-center rounded-lg text-brand-ink hover:bg-brand/10"><X aria-hidden="true" size={18} /></button>
      </div>
    </section>
  );
}

/** Settings, Alerts: this device's notification status with a switch and a test button. */
export function PushDevice({ box }: { box: string }) {
  const pwa = usePwa();
  const { data: cfg } = usePushConfig();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  useEffect(() => { startPwa(); }, []);

  async function on() {
    setBusy(true);
    const problem = await enablePush(cfg!.public_key!);
    if (problem) toast.error(problem); else toast.success("Notifications are on for this device.");
    setBusy(false);
  }
  async function off() { setBusy(true); await disablePush(); toast.success("Notifications are off for this device."); setBusy(false); }
  async function test() {
    setBusy(true);
    try {
      const r = await send<{ sent: number }>("POST", "/api/push/test");
      if (r.sent) toast.success("Test notification sent.", "It should appear in a moment.");
      else toast.error("Nothing was delivered. Turn notifications off and on again.");
    } catch { toast.error("Could not send the test."); }
    setBusy(false);
  }

  let line = "Alerts appear on this device even when SiteRadar is closed.";
  if (cfg && !cfg.enabled) line = "Browser notifications are not switched on for this server yet.";
  else if (!pwa.pushSupported) line = pwa.ios ? "On iPhone and iPad, install SiteRadar first (Share, then Add to Home Screen), then open it and turn notifications on." : "This browser can't show notifications.";
  else if (pwa.permission === "denied") line = "Notifications are blocked for SiteRadar in this browser. Allow them in the site settings next to the address bar, then reload.";

  const can = !!cfg?.enabled && pwa.pushSupported && pwa.permission !== "denied";
  return (
    <section aria-label="This device" className={box}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1 basis-72">
          <h2 className="text-lg font-semibold">Notifications on this device</h2>
          <p className="mt-1 text-sm text-muted">{line}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {pwa.subscribed && <span className="rounded-full bg-ok-soft px-2.5 py-1 text-xs font-semibold text-ok">On</span>}
          {can && (pwa.subscribed
            ? <><button type="button" onClick={test} disabled={busy} className={btn.secondary}>Send a test</button><button type="button" onClick={off} disabled={busy} className={btn.secondary}>Turn off</button></>
            : <button type="button" onClick={on} disabled={busy} className={btn.primary}>{busy ? "Turning on…" : "Turn on"}</button>)}
          {!pwa.installed && pwa.canPrompt && <button type="button" onClick={() => installApp()} className={btn.secondary}>Install app</button>}
        </div>
      </div>
    </section>
  );
}
