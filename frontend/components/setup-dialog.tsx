"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, Download, Plug, X } from "lucide-react";
import { btn } from "./ui";
import { TrackingInstall } from "./tracking-install";
import { useToast } from "./toast";
import { send, type SiteDetail } from "@/lib/api";
import { fmtAgo } from "@/lib/format";
import { useMe } from "@/lib/me";

const seenKey = (id: string) => `siteradar-wp-modal:${id}`;
const seen = (id: string) => { try { return localStorage.getItem(seenKey(id)) === "1"; } catch { return false; } };
const markSeen = (id: string) => { try { localStorage.setItem(seenKey(id), "1"); } catch { /* the dialog may show again, which is harmless */ } };

export const isWordPress = (site: SiteDetail) => site.platform?.platform === "wordpress";

/** Set up means visits are arriving, the snippet was verified, or the WordPress plugin is connected and adds the snippet itself. */
export const siteIsSetUp = (site: SiteDetail) =>
  site.tracking_live || !!site.tracking?.verified_at || (isWordPress(site) && site.connector.connected && site.connector.info.snippet !== "off");

interface SetupApi { open: () => void; isWp: boolean; ready: boolean }
const Ctx = createContext<SetupApi>({ open: () => {}, isWp: false, ready: true });
export const useSetup = () => useContext(Ctx);

/**
 * One place that knows how to get this website set up, so any button on the page can open it:
 * WordPress sites get the plugin (with the snippet as a manual option), every other site gets the snippet.
 * It also finds out once what the website is built with, and tells a WordPress owner about the plugin the first time.
 */
export function SetupProvider({ site, onChange, children }: { site: SiteDetail; onChange: () => void | Promise<unknown>; children: ReactNode }) {
  const { isAdmin } = useMe();
  const [manual, setManual] = useState(false);
  const [dismissed, setDismissed] = useState(() => seen(site.id));
  const asked = useRef(false);
  const isWp = isWordPress(site);

  useEffect(() => {
    if (site.platform || asked.current) return;
    asked.current = true;
    send("POST", `/api/sites/${site.id}/detect-platform`).then(() => onChange()).catch(() => { /* the badge and card simply stay hidden */ });
  }, [site.id, site.platform, onChange]);

  const show = manual || (isWp && !site.connector.connected && isAdmin && !dismissed);
  function close() { markSeen(site.id); setDismissed(true); setManual(false); }

  return (
    <Ctx.Provider value={{ open: () => setManual(true), isWp, ready: siteIsSetUp(site) }}>
      {children}
      {show && <SetupModal site={site} onChange={onChange} onClose={close} />}
    </Ctx.Provider>
  );
}

function SetupModal({ site, onChange, onClose }: { site: SiteDetail; onChange: () => void | Promise<unknown>; onClose: () => void }) {
  const { isAdmin } = useMe();
  const toast = useToast();
  const [busy, setBusy] = useState<"download" | "check" | null>(null);
  const isWp = isWordPress(site);
  const conn = site.connector;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function download() {
    setBusy("download");
    try {
      const res = await fetch(`/api/sites/${site.id}/wordpress-plugin`, { method: "POST", credentials: "same-origin" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not prepare the plugin. Please try again.");
      }
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url; a.download = "siteradar.zip"; document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast.success("Plugin downloaded.", "Upload it in WordPress under Plugins, Add New, Upload Plugin, then come back and press Check connection.");
      await onChange();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not prepare the plugin."); }
    setBusy(null);
  }

  async function check() {
    setBusy("check");
    try {
      const r = await send<{ result: "alive" | "gone" | "unknown"; connected: boolean }>("POST", `/api/sites/${site.id}/connector/check`);
      await onChange();
      if (r.result === "alive") toast.success("The plugin is connected.");
      else if (r.result === "gone") toast.error("The plugin is not active on your website.", "It was deactivated or deleted. Download it again and install it to reconnect.");
      else if (r.connected) toast.error("We could not reach the plugin to check.", "Your website may block the check. Showing the last contact we had.");
      else toast.error("The plugin has not connected yet.", "Make sure it is activated in WordPress, wait a few seconds and try again.");
    } catch { toast.error("Could not check the connection. Please try again."); }
    setBusy(null);
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="setup-title" className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/60 p-4">
      <div className="flex max-h-[92vh] w-[min(620px,100%)] flex-col gap-4 overflow-y-auto rounded-2xl border border-line bg-surface p-6 text-ink shadow-[0_24px_80px_rgba(15,23,42,0.28)]">
        <div className="flex items-start gap-3.5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"><Plug aria-hidden="true" size={22} /></span>
          <div className="min-w-0 flex-1">
            <h2 id="setup-title" className="text-xl font-bold">{isWp ? <>Connect <span className="text-brand">{site.host}</span> to SiteRadar</> : <>Install the tracking snippet on <span className="text-brand">{site.host}</span></>}</h2>
            <p className="mt-0.5 text-[15px] text-muted">{isWp ? "Install the SiteRadar plugin. It adds tracking automatically, and it is how one-click fixes get applied." : "Add this snippet to your website so SiteRadar can show visitors, sources and page speed, and send your monthly report."}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex size-10 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-soft"><X aria-hidden="true" size={18} /></button>
        </div>

        {isWp ? (
          <>
            {conn.connected ? (
              <div role="status" className="flex items-start gap-3 rounded-lg border border-ok/40 bg-ok-soft p-3.5">
                <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-ok" aria-hidden="true" />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-sm">
                  <span className="flex items-center gap-2 font-semibold">The plugin is connected <span className="rounded-full bg-ok px-2 py-0.5 text-xs font-semibold text-white">Connected</span></span>
                  <span className="text-[13px] leading-relaxed text-muted">Last contact {fmtAgo(conn.last_seen)}.{conn.info.plugin_version ? ` Plugin ${conn.info.plugin_version}` : ""}{conn.info.wp_version ? `, WordPress ${conn.info.wp_version}` : ""}{conn.info.php_version ? `, PHP ${conn.info.php_version}` : ""}.</span>
                </div>
                <button type="button" onClick={check} disabled={busy !== null} className="min-h-11 shrink-0 px-1 text-[13px] font-semibold text-brand hover:underline disabled:opacity-60">{busy === "check" ? "Checking…" : "Check again"}</button>
              </div>
            ) : (
              <>
                <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm leading-relaxed text-ink-2">
                  <li>Download the plugin. It already contains the connection details for {site.host}.</li>
                  <li>In WordPress, open <b>Plugins</b>, <b>Add New</b>, <b>Upload Plugin</b>, choose the file and activate it.</li>
                  <li>Come back here and press <b>Check connection</b>. It adds the tracking snippet by itself, so you do not paste anything.</li>
                </ol>
                {!conn.allowed && (
                  <p className="rounded-lg bg-warn-soft px-3.5 py-2.5 text-sm text-warn">The plugin and one-click fixes need an active paid plan. <Link href="/settings?tab=billing" className="font-semibold underline">See plans</Link></p>
                )}
                {!isAdmin && <p className="rounded-lg bg-soft px-3.5 py-2.5 text-sm text-ink-2">Only an account admin can download the plugin. Ask one of them to open this page.</p>}
              </>
            )}
            {isAdmin && conn.allowed && (
              <div className="flex flex-wrap items-center gap-2.5">
                <button type="button" onClick={download} disabled={busy !== null} className={conn.connected ? btn.secondary : btn.primary}><Download size={16} aria-hidden="true" />{busy === "download" ? "Preparing…" : conn.connected ? "Download again" : "Download plugin"}</button>
                {!conn.connected && <button type="button" onClick={check} disabled={busy !== null} className={btn.secondary}>{busy === "check" ? "Checking…" : "Check connection"}</button>}
                {conn.connected && <span className="text-[13px] text-muted">A new download makes a new key, so the plugin already on your site stops working until you replace it.</span>}
              </div>
            )}
            <details className="rounded-lg border border-line px-4 py-3">
              <summary className="cursor-pointer text-sm font-semibold">Prefer to add the tracking snippet yourself?</summary>
              <div className="mt-3"><TrackingInstall site={site} onChange={onChange} bare /></div>
            </details>
          </>
        ) : (
          <TrackingInstall site={site} onChange={onChange} bare onVerified={onClose} />
        )}

        <div className="flex justify-end"><button type="button" onClick={onClose} className={btn.secondary}>{isWp && !conn.connected ? "Not now" : "Close"}</button></div>
      </div>
    </div>
  );
}
