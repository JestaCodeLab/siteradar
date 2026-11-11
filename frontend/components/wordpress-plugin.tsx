"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, Plug } from "lucide-react";
import { btn, Card, CardTitle } from "./ui";
import { useToast } from "./toast";
import { send, type SiteDetail } from "@/lib/api";
import { fmtAgo } from "@/lib/format";
import { useMe } from "@/lib/me";

const seenKey = (id: string) => `siteradar-wp-modal:${id}`;
const seen = (id: string) => { try { return localStorage.getItem(seenKey(id)) === "1"; } catch { return false; } };
const markSeen = (id: string) => { try { localStorage.setItem(seenKey(id), "1"); } catch { /* the modal may show again, which is harmless */ } };

/** WordPress sites: finds out what the website is built with, offers the SiteRadar plugin and shows whether it is connected. */
export function WordPressPlugin({ site, onChange }: { site: SiteDetail; onChange: () => void | Promise<unknown> }) {
  const toast = useToast();
  const { isAdmin } = useMe();
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(() => seen(site.id));      // the notice was shown before, or closed just now
  const asked = useRef(false);
  const isWp = site.platform?.platform === "wordpress";
  const conn = site.connector;

  // Not looked at yet: ask once what the website is built with.
  useEffect(() => {
    if (site.platform || asked.current) return;
    asked.current = true;
    send("POST", `/api/sites/${site.id}/detect-platform`).then(() => onChange()).catch(() => { /* the card simply stays hidden */ });
  }, [site.id, site.platform, onChange]);

  // Found to be WordPress and not connected yet: tell the person once.
  const open = isWp && !conn.connected && isAdmin && !dismissed;
  function close() { markSeen(site.id); setDismissed(true); }

  async function download() {
    setBusy(true);
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
      close();
      toast.success("Plugin downloaded.", "Upload it in WordPress under Plugins, Add New, Upload Plugin.");
      await onChange();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not prepare the plugin."); }
    setBusy(false);
  }

  if (!isWp) return null;
  const steps = (
    <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm leading-relaxed text-ink-2">
      <li>Download the plugin. It already contains the connection details for {site.host}.</li>
      <li>In WordPress, open <b>Plugins</b>, <b>Add New</b>, <b>Upload Plugin</b>, choose the file and activate it.</li>
      <li>It connects by itself and adds the tracking snippet, so you do not paste anything.</li>
    </ol>
  );
  const upgrade = !conn.allowed && (
    <p className="rounded-lg bg-warn-soft px-3.5 py-2.5 text-sm text-warn">One-click fixes are part of the Starter, Growth and Scale plans. <Link href="/settings?tab=billing" className="font-semibold underline">See plans</Link></p>
  );

  return (
    <>
      <Card className="flex flex-col gap-3 p-5">
        <CardTitle aside={conn.connected ? <span className="font-medium text-ok">Connected</span> : <span className="font-medium text-warn">Not connected</span>}>WordPress plugin</CardTitle>
        {conn.connected ? (
          <div role="status" className="flex items-start gap-3 rounded-lg border border-ok/40 bg-ok-soft p-3.5">
            <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-ok" aria-hidden="true" />
            <div className="flex flex-col gap-0.5 text-sm">
              <span className="font-semibold">The plugin is connected</span>
              <span className="text-[13px] leading-relaxed text-muted">Last contact {fmtAgo(conn.last_seen)}.{conn.info.plugin_version ? ` Plugin ${conn.info.plugin_version}` : ""}{conn.info.wp_version ? `, WordPress ${conn.info.wp_version}` : ""}{conn.info.php_version ? `, PHP ${conn.info.php_version}` : ""}.</span>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted">{site.host} is a WordPress website. The SiteRadar plugin connects it to your account, adds the tracking snippet for you and is how fixes will be applied with one click.</p>
            {steps}
            {upgrade}
          </>
        )}
        {isAdmin && conn.allowed && (
          <div className="flex flex-wrap items-center gap-2.5">
            <button type="button" onClick={download} disabled={busy} className={conn.connected ? btn.secondary : btn.primary}><Download size={16} aria-hidden="true" />{busy ? "Preparing…" : conn.connected ? "Download again" : "Download plugin"}</button>
            {conn.connected && <span className="text-[13px] text-muted">A new download makes a new key, so the plugin already on your site stops working until you replace it.</span>}
          </div>
        )}
      </Card>

      {open && (
        <div role="dialog" aria-modal="true" aria-labelledby="wp-title" className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/60 p-4">
          <div className="flex w-[min(520px,100%)] flex-col gap-4 rounded-2xl border border-line bg-surface p-6 text-ink shadow-[0_24px_80px_rgba(15,23,42,0.28)]">
            <div className="flex items-start gap-3.5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"><Plug aria-hidden="true" size={22} /></span>
              <div className="min-w-0">
                <h2 id="wp-title" className="text-xl font-bold">{site.host} is a WordPress site</h2>
                <p className="mt-0.5 text-[15px] text-muted">Install the SiteRadar plugin to add tracking automatically and fix issues with one click.</p>
              </div>
            </div>
            {steps}
            {upgrade}
            <div className="flex flex-wrap justify-end gap-2.5">
              <button type="button" onClick={close} className={btn.secondary}>Not now</button>
              {conn.allowed && <button type="button" onClick={download} disabled={busy} className={btn.primary}><Download size={16} aria-hidden="true" />{busy ? "Preparing…" : "Download plugin"}</button>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
