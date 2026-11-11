"use client";

import { CheckCircle2, Plug } from "lucide-react";
import { btn, Card, CardTitle } from "./ui";
import { useSetup } from "./setup-dialog";
import type { SiteDetail } from "@/lib/api";
import { fmtAgo } from "@/lib/format";
import { useMe } from "@/lib/me";

/** WordPress sites: shows whether the SiteRadar plugin is connected and opens the setup dialog (download, check connection, manual snippet). */
export function WordPressPlugin({ site }: { site: SiteDetail }) {
  const { isAdmin } = useMe();
  const { open } = useSetup();
  if (site.platform?.platform !== "wordpress") return null;
  const conn = site.connector;

  return (
    <Card className="flex flex-col gap-3 p-5">
      <CardTitle aside={conn.connected ? <span className="rounded-full bg-ok-soft px-2.5 py-1 text-[13px] font-semibold text-ok">Connected</span> : <span className="font-medium text-warn">Not connected</span>}>WordPress plugin</CardTitle>
      {conn.connected ? (
        <div role="status" className="flex items-start gap-3 rounded-lg border border-ok/40 bg-ok-soft p-3.5">
          <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-ok" aria-hidden="true" />
          <div className="flex flex-col gap-0.5 text-sm">
            <span className="font-semibold">The plugin is connected</span>
            <span className="text-[13px] leading-relaxed text-muted">Last contact {fmtAgo(conn.last_seen)}.{conn.info.plugin_version ? ` Plugin ${conn.info.plugin_version}` : ""}{conn.info.wp_version ? `, WordPress ${conn.info.wp_version}` : ""}{conn.info.php_version ? `, PHP ${conn.info.php_version}` : ""}. It adds the tracking snippet for you.</span>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted">{site.host} is a WordPress website. The SiteRadar plugin connects it to your account, adds the tracking snippet for you and is how fixes will be applied with one click.</p>
      )}
      {(isAdmin || !conn.connected) && (
        <div className="flex flex-wrap items-center gap-2.5">
          <button type="button" onClick={open} className={conn.connected ? btn.secondary : btn.primary}><Plug size={16} aria-hidden="true" />{conn.connected ? "Manage plugin" : "Set up the plugin"}</button>
        </div>
      )}
    </Card>
  );
}
