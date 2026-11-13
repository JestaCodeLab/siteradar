"use client";

import Link from "next/link";
import { CheckCircle2, Download, Plug } from "lucide-react";
import { btn, Card, CardTitle } from "./ui";
import { usePluginActions } from "./setup-dialog";
import type { SiteDetail } from "@/lib/api";
import { fmtAgo } from "@/lib/format";
import { useMe } from "@/lib/me";

const SEO: Record<string, string> = { yoast: "Yoast SEO", rankmath: "Rank Math", aioseo: "All in One SEO", seopress: "SEOPress" };

/** WordPress websites only: the plugin's status and versions, and a download that is always one click away. */
export function PluginTab({ site, onChange }: { site: SiteDetail; onChange: () => void | Promise<unknown> }) {
  const { isAdmin } = useMe();
  const { busy, download, check } = usePluginActions(site, onChange);
  const conn = site.connector;
  const installed = conn.info.plugin_version;
  const latest = conn.latest_version;
  const facts: [string, string][] = [
    ["Installed version", installed ? `v${installed}` : "—"],
    ["Version in a new download", latest ? `v${latest}` : "—"],
    ["WordPress", conn.info.wp_version || "—"],
    ["PHP", conn.info.php_version || "—"],
    ["SEO plugin", conn.info.seo_plugin ? SEO[conn.info.seo_plugin] ?? conn.info.seo_plugin : "None found"],
    ["Last contact", conn.last_seen ? fmtAgo(conn.last_seen) : "—"],
  ];

  return (
    <div className="flex flex-col gap-5">
      <Card className="flex flex-col gap-4 p-5">
        <CardTitle aside={conn.connected ? <span className="rounded-full bg-ok-soft px-2.5 py-1 text-[13px] font-semibold text-ok">Connected</span> : <span className="font-medium text-warn">Not connected</span>}>
          <span className="inline-flex flex-wrap items-center gap-2">SiteRadar plugin{installed && <span className="rounded-full bg-soft px-2.5 py-0.5 font-mono text-[13px] font-semibold text-ink-2">v{installed}</span>}</span>
        </CardTitle>
        {conn.connected ? (
          <div role="status" className="flex items-start gap-3 rounded-lg border border-ok/40 bg-ok-soft p-3.5">
            <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-ok" aria-hidden="true" />
            <div className="flex flex-col gap-0.5 text-sm"><span className="font-semibold">The plugin is connected</span>
              <span className="text-[13px] leading-relaxed text-muted">It adds the tracking snippet and applies the fixes you approve in SiteRadar.</span></div>
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-ink-2">{site.host} is a WordPress website. The plugin connects it to your account, adds the tracking snippet for you, and applies the fixes you approve in SiteRadar. Download it below and install it.</p>
        )}
        <dl className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
          {facts.map(([k, v]) => <div key={k} className="rounded-xl bg-soft px-4 py-3"><dt className="text-xs font-semibold uppercase tracking-[0.04em] text-muted">{k}</dt><dd className="mt-1 font-mono text-[15px] font-semibold">{v}</dd></div>)}
        </dl>
      </Card>

      <Card className="flex flex-col gap-4 p-5">
        <CardTitle>{conn.connected ? "Install it again or on a new copy of the website" : "Install the plugin"}</CardTitle>
        <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm leading-relaxed text-ink-2">
          <li>Download the plugin. It already contains the connection details for {site.host}.</li>
          <li>In WordPress, open <b>Plugins</b>, <b>Add New</b>, <b>Upload Plugin</b>, choose the file and activate it. If an older copy is installed, deactivate and delete it first.</li>
          <li>Come back here and press <b>Check connection</b>.</li>
        </ol>
        {!conn.allowed && <p className="rounded-lg bg-warn-soft px-3.5 py-2.5 text-sm text-warn">The plugin needs an active paid plan. <Link href="/settings?tab=billing" className="font-semibold underline">See plans</Link></p>}
        {!isAdmin && <p className="rounded-lg bg-soft px-3.5 py-2.5 text-sm text-ink-2">Only an account admin can download the plugin. Ask one of them to open this page.</p>}
        {isAdmin && conn.allowed && (
          <div className="flex flex-wrap items-center gap-2.5">
            <button type="button" onClick={download} disabled={busy !== null} className={btn.primary}><Download size={16} aria-hidden="true" />{busy === "download" ? "Preparing…" : `Download plugin${latest ? ` v${latest}` : ""}`}</button>
            <button type="button" onClick={check} disabled={busy !== null} className={btn.secondary}><Plug size={16} aria-hidden="true" />{busy === "check" ? "Checking…" : "Check connection"}</button>
          </div>
        )}
        <p className="text-[13px] leading-relaxed text-muted">Each download makes a new connection key, so a copy of the plugin already on your website stops working until you replace it with the new file.</p>
      </Card>
    </div>
  );
}
