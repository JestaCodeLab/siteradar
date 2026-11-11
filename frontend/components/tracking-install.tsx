"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { btn, Card, CardTitle } from "./ui";
import { useToast } from "./toast";
import { send } from "@/lib/api";
import { fmtAgo, fmtDateTime } from "@/lib/format";

export interface TrackingCheck { installed: boolean; found: string | null; receiving: boolean; last_hit: number | null; error: string | null; url: string }

/** What a snippet check means for the person, in plain words: [good news or not, headline, what to do next]. */
export function trackingVerdict(c: TrackingCheck, host: string, id: string): [boolean, string, string] {
  if (c.installed && c.receiving) return [true, "Installed and receiving data", "Visitors are being recorded. Nothing more to do."];
  if (c.installed) return [true, "Snippet found on your home page", "Open your website once. The first visit shows up here within a minute."];
  if (c.receiving) return [true, "Receiving data", `We did not see the snippet on the home page of ${host}, but visits are arriving, so it is installed on other pages or added through a tag manager.`];
  if (c.error) return [false, "We could not check your website", `${c.error} Make sure ${host} is online, then try again.`];
  if (c.found && c.found !== "?") return [false, "The snippet has a different website ID", `The page uses data-site="${c.found}" but this website's ID is "${id}". Copy the snippet again and replace the old one.`];
  return [false, "Snippet not found", `We could not find it on the home page of ${host}. Paste it just before </head>, save and publish, then check again. If you use a cache or a plugin, clear it first.`];
}

export interface TrackingSite {
  id: string; host: string; snippet: string; tracking_live: boolean;
  tracking: { verified_at: number | null; last_hit: number | null };
}

/** Install and verify the tracking snippet. Used on the website's Overview tab and in the Add website dialog. */
export function TrackingInstall({ site, onChange, bare = false, onVerified }: {
  site: TrackingSite; onChange: () => void | Promise<unknown>; bare?: boolean; onVerified?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [check, setCheck] = useState<TrackingCheck | null>(null);
  const [checking, setChecking] = useState(false);
  const toast = useToast();
  const verified = site.tracking_live || !!site.tracking?.verified_at;

  async function verify() {
    setChecking(true);
    try {
      const r = await send<TrackingCheck>("POST", `/api/sites/${site.id}/verify-tracking`);
      setCheck(r); await onChange();
      if (r.installed || r.receiving) { toast.success("Tracking snippet verified."); onVerified?.(); }
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not check the snippet. Please try again."); }
    setChecking(false);
  }
  const verdict = check && !verified ? trackingVerdict(check, site.host, site.id) : null;

  const body = (
    <>
      <p className="text-sm text-muted">Required. Paste this just before <code className="font-mono">&lt;/head&gt;</code> on every page of {site.host}. It gives you visitors, sources and page-load times, and the monthly report needs it.</p>
      <pre className="overflow-x-auto rounded-lg bg-soft p-3.5 font-mono text-[13px]">{site.snippet}</pre>
      <div className="flex flex-wrap gap-2.5">
        <button type="button" className={btn.secondary} onClick={async () => { await navigator.clipboard.writeText(site.snippet); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
          {copied ? "Copied" : "Copy snippet"}
        </button>
        {!verified && <button type="button" className={btn.primary} disabled={checking} onClick={verify}>{checking ? "Checking…" : "Verify installation"}</button>}
      </div>
      {verified ? (
        <div role="status" className="flex items-start gap-3 rounded-lg border border-ok/40 bg-ok-soft p-3.5">
          <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-ok" aria-hidden="true" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-sm font-semibold">{site.tracking_live ? "Installed and receiving data" : "Snippet verified"}</span>
            <span className="text-[13px] leading-relaxed text-muted">{site.tracking_live
              ? `Last visit ${fmtAgo(site.tracking.last_hit)}.`
              : `Verified ${site.tracking.verified_at ? fmtDateTime(site.tracking.verified_at) : "just now"}. Open your website once and the first visit shows up here within a minute.`}</span>
          </div>
          <button type="button" onClick={verify} disabled={checking} className="min-h-11 shrink-0 px-1 text-[13px] font-semibold text-brand hover:underline disabled:opacity-60">{checking ? "Checking…" : "Check again"}</button>
        </div>
      ) : verdict && (
        <div role="status" className="flex items-start gap-3 rounded-lg border border-warn/40 bg-warn-soft p-3.5">
          <AlertTriangle size={20} className="mt-0.5 shrink-0 text-warn" aria-hidden="true" />
          <div className="flex flex-col gap-0.5"><span className="text-sm font-semibold">{verdict[1]}</span><span className="text-[13px] leading-relaxed text-muted">{verdict[2]}</span></div>
        </div>
      )}
    </>
  );

  if (bare) return <div id="tracking" className="flex flex-col gap-3">{body}</div>;
  return (
    <Card className="flex flex-col gap-3 p-5">
      <CardTitle aside={site.tracking_live ? <span className="font-medium text-ok">Receiving data</span> : verified ? <span className="font-medium text-ok">Snippet verified</span> : <span className="font-medium text-warn">Required, not verified yet</span>}>
        <span id="tracking">Tracking snippet</span>
      </CardTitle>
      {body}
    </Card>
  );
}
