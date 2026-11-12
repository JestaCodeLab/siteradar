"use client";

import { useEffect, useId, useRef, useState } from "react";
import { fmtDay } from "@/lib/format";
import type { SearchPoint } from "@/lib/api";

type Metric = "clicks" | "impressions" | "ctr" | "position";
const METRICS: { key: Metric; label: string }[] = [
  { key: "clicks", label: "Clicks" }, { key: "impressions", label: "Times shown" }, { key: "ctr", label: "Click rate" }, { key: "position", label: "Average position" },
];

const sum = (pts: SearchPoint[], f: (p: SearchPoint) => number) => pts.reduce((a, p) => a + f(p), 0);

/** One number for a run of days. Click rate and position are weighted by how often the page was shown, so a quiet day counts for less. */
function measure(m: Metric, pts: SearchPoint[]): number | null {
  const imps = sum(pts, (p) => p.impressions);
  if (m === "clicks") return sum(pts, (p) => p.clicks);
  if (m === "impressions") return imps;
  if (!imps) return null;
  if (m === "ctr") return sum(pts, (p) => p.clicks) / imps;
  return sum(pts, (p) => (p.position ?? 0) * p.impressions) / imps;
}

function fmt(m: Metric, v: number | null) {
  if (v == null) return "—";
  return m === "ctr" ? `${(v * 100).toFixed(1)}%` : m === "position" ? v.toFixed(1) : Math.round(v).toLocaleString("en-US");
}

function niceMax(v: number) {
  const base = 10 ** Math.floor(Math.log10(v || 1));
  return [1, 2, 2.5, 5, 10].map((k) => k * base).find((k) => k >= v) ?? v;
}

const H = 240, L = 58, R = 18, T = 18, B = 32;

/** Segments of a line where the value exists, so a day with no data leaves a gap instead of a false zero. */
function segments(vals: (number | null)[], x: (i: number) => number, y: (v: number) => number) {
  const out: string[] = [];
  let cur: string[] = [];
  vals.forEach((v, i) => {
    if (v == null) { if (cur.length) out.push(cur.join(" ")); cur = []; } else cur.push(`${x(i)},${y(v)}`);
  });
  if (cur.length) out.push(cur.join(" "));
  return out;
}

/**
 * Google search over time. One measure at a time on one axis (the four buttons choose it), the daily line faint and a 7-day average on top, so a small
 * site's noisy days do not read as a trend. Position is drawn upside down because 1 is the best place to be.
 */
export function SearchOverview({ series, days }: { series: SearchPoint[]; days: number }) {
  const [metric, setMetric] = useState<Metric>("clicks");
  const [hover, setHover] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(640);
  const gid = useId().replace(/:/g, "");

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pts = series.slice(-days);
  const n = pts.length;
  const flip = metric === "position";
  const daily = pts.map((p) => measure(metric, [p]));
  const avg = pts.map((_, i) => measure(metric, pts.slice(Math.max(0, i - 6), i + 1)));
  const showAvg = n >= 10;
  const have = daily.filter((v): v is number => v != null);
  const clicksTotal = sum(pts, (p) => p.clicks);

  let lo = 0, top = 1;
  if (have.length) {
    if (flip) { lo = Math.max(1, Math.floor(Math.min(...have) - 1)); top = Math.ceil(Math.max(...have) + 1); if (top - lo < 4) top = lo + 4; top = lo + Math.ceil((top - lo) / 4) * 4; }
    else top = niceMax(Math.max(...have, ...(showAvg ? avg.filter((v): v is number => v != null) : [])) * 1.1);
  }
  const ticks = [0, 1, 2, 3, 4].map((i) => lo + ((top - lo) / 4) * i);
  const x = (i: number) => (n === 1 ? (L + W - R) / 2 : L + (i * (W - L - R)) / (n - 1));
  const y = (v: number) => (flip ? T + ((v - lo) / (top - lo)) * (H - T - B) : T + (1 - (v - lo) / (top - lo)) * (H - T - B));
  const labelAt = n <= 6 ? pts.map((_, i) => i) : [0, 1, 2, 3, 4].map((k) => Math.round((k * (n - 1)) / 4));

  function move(e: React.PointerEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    let best = 0;
    pts.forEach((_, i) => { if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i; });
    setHover(best);
  }
  const hv = hover != null ? daily[hover] : null;

  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label="What to chart" className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
        {METRICS.map((m) => (
          <button key={m.key} type="button" aria-pressed={metric === m.key} onClick={() => { setMetric(m.key); setHover(null); }}
            className={`flex flex-col gap-0.5 rounded-xl border px-4 py-3 text-left ${metric === m.key ? "border-brand bg-brand-soft/40" : "border-line bg-surface hover:bg-soft"}`}>
            <span className="text-[13px] text-muted">{m.label}</span>
            <span className="text-[22px] font-semibold leading-tight">{fmt(m.key, measure(m.key, pts))}</span>
          </button>
        ))}
      </div>

      {have.length === 0 ? <p className="py-10 text-center text-sm text-muted">No search data for these days yet.</p> : (
        <>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] text-ink-2">
            <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="h-0 w-5 border-t-2 border-brand/40" />Daily</span>
            {showAvg && <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="h-0 w-5 border-t-[3px] border-brand" />7-day average</span>}
            {flip && <span className="text-muted">Lower is better</span>}
          </div>
          <div ref={box} className="relative">
            <svg role="img" width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block touch-pan-y" onPointerMove={move} onPointerDown={move} onPointerLeave={() => setHover(null)}
              aria-label={`${METRICS.find((m) => m.key === metric)!.label} by day, ${fmtDay(pts[0].d)} to ${fmtDay(pts[n - 1].d)}. Total ${fmt(metric, measure(metric, pts))}.`}>
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--color-line)" />
                  <text x={L - 10} y={y(t) + 4} fontSize="11" textAnchor="end" fill="var(--color-muted)" fontFamily="var(--font-geist-mono), monospace">{fmt(metric, t)}</text>
                </g>
              ))}
              {segments(daily, x, y).map((pl, k) => <polyline key={`d${k}`} fill="none" stroke="var(--color-brand)" strokeOpacity={showAvg ? 0.4 : 1} strokeWidth={showAvg ? 1.5 : 2.5} strokeLinejoin="round" strokeLinecap="round" points={pl} />)}
              {showAvg && segments(avg, x, y).map((pl, k) => <polyline key={`a${k}`} fill="none" stroke="var(--color-brand)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" points={pl} />)}
              {n <= 14 && daily.map((v, i) => v != null && <circle key={i} cx={x(i)} cy={y(v)} r={4} fill="var(--color-surface)" stroke="var(--color-brand)" strokeWidth="2.5" />)}
              {hover != null && hv != null && (<>
                <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} stroke="var(--color-muted)" strokeOpacity="0.4" strokeDasharray="3 3" />
                <circle cx={x(hover)} cy={y(hv)} r={6} fill="var(--color-surface)" stroke="var(--color-brand)" strokeWidth="2.5" />
              </>)}
              {labelAt.map((i) => (
                <text key={i} x={x(i)} y={H - 8} fontSize="11" fill="var(--color-muted)" textAnchor={i === 0 && n > 1 ? "start" : i === n - 1 && n > 1 ? "end" : "middle"}>{fmtDay(pts[i].d)}</text>
              ))}
            </svg>
            {hover != null && hv != null && (
              <div role="status" className="pointer-events-none absolute -translate-x-1/2 rounded-lg border border-line bg-surface px-3 py-2 text-[13px] shadow-md"
                style={{ left: Math.min(Math.max(x(hover), 70), W - 70), top: Math.max(y(hv) - 70, 0) }}>
                <div className="text-muted">{fmtDay(pts[hover].d)}</div>
                <div className="font-mono font-semibold">{fmt(metric, hv)}</div>
                {showAvg && avg[hover] != null && <div className="text-muted">7-day average {fmt(metric, avg[hover])}</div>}
              </div>
            )}
          </div>
          {metric !== "position" && clicksTotal < 100 && <p className="rounded-lg bg-soft px-3.5 py-2.5 text-[13px] text-ink-2">Low numbers, so day-to-day swings are mostly chance. Look at the 7-day average rather than single days.</p>}
          <p className="text-xs text-muted">Google&apos;s newest three days are not available yet, so the chart ends {fmtDay(pts[n - 1].d)}.</p>
          <details className="text-sm">
            <summary className="cursor-pointer font-medium text-ink-2">Show as a table</summary>
            <div className="mt-2 max-h-72 overflow-auto rounded-lg border border-line">
              <table className="w-full text-left text-[13px]">
                <thead className="sticky top-0 bg-soft text-xs uppercase tracking-[0.04em] text-muted"><tr><th className="px-3 py-2">Day</th><th className="px-3 py-2">Clicks</th><th className="px-3 py-2">Times shown</th><th className="px-3 py-2">Click rate</th><th className="px-3 py-2">Position</th></tr></thead>
                <tbody>{[...pts].reverse().map((p) => <tr key={p.d} className="border-t border-line-soft"><td className="px-3 py-1.5">{fmtDay(p.d)}</td><td className="px-3 py-1.5 font-mono">{p.clicks.toLocaleString()}</td><td className="px-3 py-1.5 font-mono">{p.impressions.toLocaleString()}</td><td className="px-3 py-1.5 font-mono">{p.impressions ? `${(p.ctr * 100).toFixed(1)}%` : "—"}</td><td className="px-3 py-1.5 font-mono">{p.position ?? "—"}</td></tr>)}</tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </div>
  );
}
