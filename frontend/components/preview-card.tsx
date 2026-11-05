"use client";

import { Camera, ImageOff, RefreshCw } from "lucide-react";
import { useState } from "react";
import { btn, Card } from "./ui";
import { send, type SiteDetail } from "@/lib/api";
import { fmtAgo } from "@/lib/format";

// A picture of the homepage as visitors see it, on a laptop and on a phone.
export function PreviewCard({ site, onChange }: { site: SiteDetail; onChange: () => void }) {
  const { desktop, mobile, running } = site.preview;
  const [starting, setStarting] = useState(false);
  const [broken, setBroken] = useState<{ desktop?: boolean; mobile?: boolean }>({});
  const busy = starting || running;

  async function refresh() {
    setStarting(true);
    try {
      await send("POST", `/api/sites/${site.id}/screenshot`);
      onChange();
    } finally {
      setStarting(false);
    }
  }

  const src = (device: "desktop" | "mobile", v: number | null) => `/api/sites/${site.id}/screenshot?device=${device}&v=${v}`;

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Camera size={18} aria-hidden="true" className="text-muted" />Website preview</h2>
          <span className="text-sm text-muted">{desktop ? `Captured ${fmtAgo(desktop)}. Retaken every night.` : "The first preview is taken automatically within a minute or two."}</span>
        </div>
        <button onClick={refresh} disabled={busy} className={btn.secondary}>
          <RefreshCw size={16} aria-hidden="true" className={busy ? "animate-spin" : ""} />
          {busy ? "Capturing…" : "Refresh preview"}
        </button>
      </div>

      <div className="flex flex-wrap items-start gap-5">
        <div className="min-w-0 flex-[1_1_420px]">
          <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
            <div className="flex items-center gap-3 border-b border-line bg-soft px-3.5 py-2.5">
              <span className="flex gap-1.5" aria-hidden="true"><i className="size-2.5 rounded-full bg-[#ff6b5b]" /><i className="size-2.5 rounded-full bg-[#f5c04a]" /><i className="size-2.5 rounded-full bg-[#4fd08f]" /></span>
              <span className="min-w-0 flex-1 truncate rounded-md bg-surface px-3 py-1 text-center font-mono text-xs text-muted">{site.host}</span>
            </div>
            {desktop && !broken.desktop ? (
              <a href={src("desktop", desktop)} target="_blank" rel="noreferrer" aria-label={`Open the full-size desktop preview of ${site.name}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src("desktop", desktop)} alt={`Desktop view of the ${site.name} homepage`} width={1280} height={800} onError={() => setBroken((b) => ({ ...b, desktop: true }))} className="block h-auto w-full" />
              </a>
            ) : (
              <Empty busy={busy} />
            )}
          </div>
        </div>

        <div className="mx-auto w-[190px] shrink-0 sm:mx-0">
          <div className="overflow-hidden rounded-[28px] border-[6px] border-nav bg-nav shadow-sm">
            {mobile && !broken.mobile ? (
              <a href={src("mobile", mobile)} target="_blank" rel="noreferrer" aria-label={`Open the full-size phone preview of ${site.name}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src("mobile", mobile)} alt={`Phone view of the ${site.name} homepage`} width={390} height={844} onError={() => setBroken((b) => ({ ...b, mobile: true }))} className="block h-auto w-full rounded-[20px]" />
              </a>
            ) : (
              <div className="flex aspect-[390/844] items-center justify-center rounded-[20px] bg-soft"><ImageOff size={22} aria-hidden="true" className="text-muted" /></div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function Empty({ busy }: { busy: boolean }) {
  return (
    <div className="flex aspect-[1280/800] flex-col items-center justify-center gap-2 bg-soft px-6 text-center">
      {busy ? <RefreshCw size={22} aria-hidden="true" className="animate-spin text-muted" /> : <ImageOff size={22} aria-hidden="true" className="text-muted" />}
      <p className="text-sm text-muted">{busy ? "Taking the preview…" : "No preview yet. If the site is down, SiteWatch keeps the last good picture and tries again tonight."}</p>
    </div>
  );
}
