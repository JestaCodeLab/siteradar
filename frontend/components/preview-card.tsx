"use client";

import { Camera, ExternalLink, ImageOff, RefreshCw } from "lucide-react";
import { useState } from "react";
import { btn, Card } from "./ui";
import { send, type SiteDetail } from "@/lib/api";
import { fmtAgo } from "@/lib/format";

// A small picture of the homepage as visitors see it, on a laptop and on a phone.
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
  const link = "inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-brand";

  return (
    <Card className="flex flex-wrap items-center gap-x-6 gap-y-4 p-4">
      <div className="flex items-end gap-3">
        <div className="w-[240px] shrink-0 overflow-hidden rounded-lg border border-line bg-surface shadow-sm sm:w-[300px]">
          <div className="flex items-center gap-2 border-b border-line bg-soft px-2.5 py-1.5" aria-hidden="true">
            <span className="flex gap-1"><i className="size-2 rounded-full bg-[#ff6b5b]" /><i className="size-2 rounded-full bg-[#f5c04a]" /><i className="size-2 rounded-full bg-[#4fd08f]" /></span>
            <span className="min-w-0 flex-1 truncate rounded bg-surface px-2 py-0.5 text-center font-mono text-[10px] text-muted">{site.host}</span>
          </div>
          {desktop && !broken.desktop ? (
            <a href={src("desktop", desktop)} target="_blank" rel="noreferrer" aria-label={`Open the full-size desktop preview of ${site.name}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src("desktop", desktop)} alt={`Desktop view of the ${site.name} homepage`} width={1280} height={800} onError={() => setBroken((b) => ({ ...b, desktop: true }))} className="block aspect-[1280/800] w-full object-cover object-top" />
            </a>
          ) : (
            <div className="flex aspect-[1280/800] items-center justify-center bg-soft">
              {busy ? <RefreshCw size={18} aria-hidden="true" className="animate-spin text-muted" /> : <ImageOff size={18} aria-hidden="true" className="text-muted" />}
            </div>
          )}
        </div>

        <div className="w-[84px] shrink-0 overflow-hidden rounded-[18px] border-[4px] border-nav bg-nav shadow-sm">
          {mobile && !broken.mobile ? (
            <a href={src("mobile", mobile)} target="_blank" rel="noreferrer" aria-label={`Open the full-size phone preview of ${site.name}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src("mobile", mobile)} alt={`Phone view of the ${site.name} homepage`} width={390} height={844} onError={() => setBroken((b) => ({ ...b, mobile: true }))} className="block aspect-[390/844] w-full rounded-[13px] object-cover object-top" />
            </a>
          ) : (
            <div className="flex aspect-[390/844] items-center justify-center rounded-[13px] bg-soft"><ImageOff size={16} aria-hidden="true" className="text-muted" /></div>
          )}
        </div>
      </div>

      <div className="flex min-w-[220px] flex-1 flex-col gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold"><Camera size={17} aria-hidden="true" className="text-muted" />Website preview</h2>
        <p className="text-sm text-muted">
          {desktop ? `Captured ${fmtAgo(desktop)}. Retaken every night.` : busy ? "Taking the first preview…" : "The first preview is taken automatically within a minute or two."}
        </p>
        <div className="flex flex-wrap items-center gap-x-4">
          <button onClick={refresh} disabled={busy} className={btn.secondary}>
            <RefreshCw size={16} aria-hidden="true" className={busy ? "animate-spin" : ""} />
            {busy ? "Capturing…" : "Refresh"}
          </button>
          {desktop && !broken.desktop && <a href={src("desktop", desktop)} target="_blank" rel="noreferrer" className={link}>Desktop<ExternalLink size={14} aria-hidden="true" /></a>}
          {mobile && !broken.mobile && <a href={src("mobile", mobile)} target="_blank" rel="noreferrer" className={link}>Phone<ExternalLink size={14} aria-hidden="true" /></a>}
        </div>
      </div>
    </Card>
  );
}
