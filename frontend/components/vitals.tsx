import { Image as ImageIcon, Monitor, MousePointerClick, MoveVertical, Smartphone, type LucideIcon } from "lucide-react";
import { useState } from "react";
import type { PageSpeed } from "@/lib/api";
import { InfoTip } from "./info-tip";
import { Card, CardTitle, Skeleton } from "./ui";

type Rating = "good" | "improve" | "poor";

// Google's thresholds for Core Web Vitals
const rate = {
  lcp: (ms: number): Rating => (ms <= 2500 ? "good" : ms <= 4000 ? "improve" : "poor"),
  cls: (v: number): Rating => (v <= 0.1 ? "good" : v <= 0.25 ? "improve" : "poor"),
  inp: (ms: number): Rating => (ms <= 200 ? "good" : ms <= 500 ? "improve" : "poor"),
  score: (v: number): Rating => (v >= 90 ? "good" : v >= 50 ? "improve" : "poor"),
};

const chip: Record<Rating, [string, string]> = {
  good: ["Good", "bg-ok-soft text-ok"],
  improve: ["Needs work", "bg-warn-soft text-warn"],
  poor: ["Poor", "bg-bad-soft text-bad"],
};

const scoreLabels: [string, string][] = [
  ["performance", "Performance"], ["seo", "SEO"], ["accessibility", "Accessibility"], ["best-practices", "Best practices"],
];

const scoreInfo: Record<string, string> = {
  performance: "How fast the page loads and becomes usable on a phone, scored by Google Lighthouse. 90 or more is good.",
  seo: "Basic search-engine readiness: page titles, descriptions, links that can be crawled and mobile-friendly layout.",
  accessibility: "How usable the page is for people who use screen readers, keyboards or have low vision, for example colour contrast and image descriptions.",
  "best-practices": "Whether the page follows modern web standards: secure HTTPS, no browser errors and up-to-date libraries.",
};

function Metric({ label, hint, value, rating, icon: Glyph, info }: { label: string; hint: string; value: string; rating: Rating | null; icon: LucideIcon; info: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-soft p-4">
      <span className="mb-1 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand"><Glyph aria-hidden="true" size={16} /></span>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[13px] leading-snug text-muted">{label}</span>
        <InfoTip label={label} text={info} />
      </div>
      <span className="text-[26px] font-semibold leading-none">{value}</span>
      <div className="flex flex-wrap items-center gap-2">
        {rating && <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${chip[rating][1]}`}>{chip[rating][0]}</span>}
        <span className="text-xs text-muted">{hint}</span>
      </div>
    </div>
  );
}

type Device = "mobile" | "desktop";

export function PageSpeedCard({ ps, auditRan, loading = false }: { ps: PageSpeed | null; auditRan: boolean; loading?: boolean }) {
  const [picked, setPicked] = useState<Device | null>(null);
  if (!ps && loading) {
    return (
      <Card className="flex flex-col gap-4 p-5" aria-busy="true">
        <div className="flex flex-col gap-0.5"><h2 className="text-lg font-semibold">Google PageSpeed</h2><span role="status" className="text-sm text-muted">Running the first PageSpeed test. This takes about a minute.</span></div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28" />)}</div>
      </Card>
    );
  }
  if (!ps) {
    return (
      <Card className="p-5">
        <CardTitle>Google PageSpeed</CardTitle>
        <p className="text-sm text-muted">
          {auditRan
            ? "The last audit has no PageSpeed data. Check that the PAGESPEED_API_KEY is set on the server, then run an audit."
            : "No audit has run yet. PageSpeed results appear after the first audit."}
        </p>
      </Card>
    );
  }
  const device: Device = picked ?? (ps.mobile ? "mobile" : "desktop");
  const res = ps[device];
  const tabs: [Device, string, LucideIcon][] = [["mobile", "Mobile", Smartphone], ["desktop", "Desktop", Monitor]];

  return (
    <Card className="flex flex-col gap-5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-lg font-semibold">Google PageSpeed</h2>
          {res && <span className="text-sm text-muted">{res.field_data ? "Measured from real Chrome visitors" : "Lab test (not enough real visitor data yet)"}</span>}
        </div>
        <div role="group" aria-label="Device" className="inline-flex gap-1 rounded-[10px] bg-[#e8ebf0] p-1">
          {tabs.map(([key, label, Glyph]) => (
            <button key={key} aria-pressed={device === key} onClick={() => setPicked(key)}
              className={`inline-flex min-h-10 items-center gap-2 rounded-[7px] px-4 text-sm ${device === key ? "bg-surface font-semibold shadow-sm" : "font-medium text-ink-2"}`}>
              <Glyph size={16} aria-hidden="true" />{label}
            </button>
          ))}
        </div>
      </div>

      {!res && <p className="rounded-lg bg-soft px-4 py-6 text-center text-sm text-muted">No {device} results yet. They appear after the next audit, which runs every night or when you press Run audit.</p>}

      {res && (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
            <Metric label="Largest Contentful Paint" icon={ImageIcon} info="How long it takes for the main content, usually the biggest image or heading, to appear on screen. Good is 2.5 seconds or less." hint="Good: 2.5 s or less"
              value={res.lcp_ms ? `${(res.lcp_ms / 1000).toFixed(1)} s` : "—"} rating={res.lcp_ms ? rate.lcp(res.lcp_ms) : null} />
            <Metric label="Cumulative Layout Shift" icon={MoveVertical} info="How much the page jumps around while it loads, for example when an image pushes the text down. Good is 0.1 or less." hint="Good: 0.1 or less"
              value={res.cls != null ? res.cls.toFixed(2) : "—"} rating={res.cls != null ? rate.cls(res.cls) : null} />
            <Metric label="Interaction to Next Paint" icon={MousePointerClick} info="How quickly the page reacts when someone taps or clicks. Good is 200 milliseconds or less." hint="Good: 200 ms or less"
              value={res.inp_ms ? `${Math.round(res.inp_ms)} ms` : "—"} rating={res.inp_ms ? rate.inp(res.inp_ms) : null} />
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-4">
            {scoreLabels.filter(([k]) => res.scores[k] != null).map(([k, label]) => (
              <div key={k} className="flex flex-col gap-2 rounded-xl border border-line p-4">
                <div className="flex items-start justify-between gap-2"><span className="text-[13px] leading-snug text-muted">{label}</span><InfoTip label={label} text={scoreInfo[k]} /></div>
                <span className="text-2xl font-semibold leading-none">{res.scores[k]}<span className="text-sm font-medium text-muted"> / 100</span></span>
                <div className="h-1.5 rounded bg-[#e8ebf0]">
                  <div className={`h-1.5 rounded ${rate.score(res.scores[k]) === "good" ? "bg-bar-ok" : rate.score(res.scores[k]) === "improve" ? "bg-bar-warn" : "bg-bar-bad"}`} style={{ width: `${res.scores[k]}%` }} />
                </div>
              </div>
            ))}
          </div>
          {res.opportunities.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <h3 className="text-[15px] font-semibold">Biggest improvements suggested by Google ({device})</h3>
              <ul className="list-disc pl-5 text-sm leading-relaxed text-ink-2">
                {res.opportunities.map((o) => <li key={o}>{o}</li>)}
              </ul>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
