"use client";

import { useEffect, useId, useRef, useState } from "react";
import { fmtDay, fmtMs } from "@/lib/format";

interface Point { x: string; y: number }

/** A round number at or above `v`, so the top of the chart reads 100 ms, 250 ms, 500 ms, 1 s … */
function niceMax(v: number) {
  const base = 10 ** Math.floor(Math.log10(v || 1));
  return ([1, 2, 2.5, 5, 10].map((m) => m * base).find((m) => m >= v) ?? v);
}

const H = 240, L = 58, R = 18, T = 18, B = 32;

/** Response time over the last days. The scale follows the data, so a fast site still shows its ups and downs; the slow limit is drawn
 * only when the site comes anywhere near it, and otherwise said in words. */
export function ResponseChart({ points, threshold, label, kind = "time", empty }: { points: Point[]; threshold?: number; label: string; kind?: "time" | "count"; empty?: string }) {
  const time = kind === "time";
  const fmt = (v: number) => (time ? fmtMs(Math.round(v)) : Math.round(v).toLocaleString("en-US"));
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(640);
  const [hover, setHover] = useState<number | null>(null);
  const gid = useId().replace(/:/g, "");

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (points.length === 0) return <p className="py-10 text-center text-sm text-muted">{empty ?? "No checks yet. The first results appear within a few minutes."}</p>;

  const ys = points.map((p) => p.y);
  const avg = Math.round(ys.reduce((a, b) => a + b, 0) / ys.length);
  const fast = points.reduce((a, b) => (b.y < a.y ? b : a)), slow = points.reduce((a, b) => (b.y > a.y ? b : a));
  const latest = points[points.length - 1];
  const nearLimit = time && threshold != null && Math.max(...ys) >= threshold * 0.5;
  const lo0 = Math.min(...ys), hi0 = Math.max(...ys);
  // Times start at zero. Counts zoom in on where the numbers are, so a rise from 120 to 124 pages is visible.
  let lo = 0, top = niceMax(Math.max(hi0, nearLimit ? threshold! : 0) * 1.1);
  if (!time) {
    const span = hi0 - lo0 || 10;
    lo = Math.max(0, Math.floor(lo0 - span * 0.4));
    top = Math.max(lo + 4, Math.ceil(hi0 + span * 0.4));
    top = lo + Math.ceil((top - lo) / 4) * 4;
  }
  const ticks = [0, 1, 2, 3, 4].map((i) => lo + ((top - lo) / 4) * i);

  const x = (i: number) => (points.length === 1 ? (L + W - R) / 2 : L + (i * (W - L - R)) / (points.length - 1));
  const y = (v: number) => T + (1 - (v - lo) / (top - lo)) * (H - T - B);
  const line = points.map((p, i) => `${x(i)},${y(p.y)}`).join(" ");
  const area = `${x(0)},${H - B} ${line} ${x(points.length - 1)},${H - B}`;
  const labelAt = points.length <= 6 ? points.map((_, i) => i) : [0, 1, 2, 3, 4].map((k) => Math.round((k * (points.length - 1)) / 4));
  const change = latest.y - points[0].y;
  const verdict = !time ? (change === 0 ? "The number of pages has not changed." : `${change > 0 ? "Up" : "Down"} ${Math.abs(change).toLocaleString("en-US")} page${Math.abs(change) === 1 ? "" : "s"} since ${fmtDay(points[0].x)}.`)
    : !nearLimit ? `Well under the ${threshold! / 1000} s slow limit.` : slow.y >= threshold! ? `Went over the ${threshold! / 1000} s slow limit on ${fmtDay(slow.x)}.` : `Getting close to the ${threshold! / 1000} s slow limit.`;
  const tiles = time
    ? [["Latest", fmt(latest.y), fmtDay(latest.x)], ["Average", fmt(avg), `over ${points.length} day${points.length === 1 ? "" : "s"}`], ["Fastest day", fmt(fast.y), fmtDay(fast.x)], ["Slowest day", fmt(slow.y), fmtDay(slow.x)]]
    : [["Pages now", fmt(latest.y), fmtDay(latest.x)], ["Change", `${change > 0 ? "+" : ""}${change.toLocaleString("en-US")}`, `since ${fmtDay(points[0].x)}`], ["Lowest", fmt(fast.y), fmtDay(fast.x)], ["Highest", fmt(slow.y), fmtDay(slow.x)]];

  function move(e: React.PointerEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    let best = 0;
    points.forEach((_, i) => { if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i; });
    setHover(best);
  }
  const h = hover != null ? points[hover] : null;

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map(([k, v, n]) => (
          <div key={k} className="rounded-xl bg-soft px-4 py-3">
            <dt className="text-xs font-semibold uppercase tracking-[0.04em] text-muted">{k}</dt>
            <dd className="mt-1 font-mono text-xl font-semibold">{v}</dd>
            <dd className="text-[13px] text-muted">{n}</dd>
          </div>))}
      </dl>

      <div ref={box} className="relative">
        <svg role="img" aria-label={`${label}. ${tiles.map(([k, v]) => `${k} ${v}`).join(", ")}.`} width={W} height={H} viewBox={`0 0 ${W} ${H}`}
          className="block touch-pan-y" onPointerMove={move} onPointerDown={move} onPointerLeave={() => setHover(null)}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-brand)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--color-line)" />
              <text x={L - 10} y={y(t) + 4} fontSize="11" textAnchor="end" fill="var(--color-muted)" fontFamily="var(--font-geist-mono), monospace">{fmt(t)}</text>
            </g>
          ))}
          {nearLimit && threshold != null && (
            <g>
              <line x1={L} x2={W - R} y1={y(threshold)} y2={y(threshold)} stroke="#b3261e" strokeWidth="1.5" strokeDasharray="5 4" />
              <text x={W - R} y={y(threshold) - 6} fontSize="11" textAnchor="end" fill="#b3261e">Slow limit {threshold / 1000} s</text>
            </g>
          )}
          {points.length > 1 && <polygon points={area} fill={`url(#${gid})`} />}
          {points.length > 1 && <polyline fill="none" stroke="var(--color-brand)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" points={line} />}
          {points.map((p, i) => (points.length <= 14 || i === hover) && (
            <circle key={`${p.x}-${i}`} cx={x(i)} cy={y(p.y)} r={i === hover ? 6 : 4} fill="var(--color-surface)" stroke="var(--color-brand)" strokeWidth="2.5" />
          ))}
          {hover != null && <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} stroke="var(--color-muted)" strokeOpacity="0.4" strokeDasharray="3 3" />}
          {labelAt.map((i) => (
            <text key={i} x={x(i)} y={H - 8} fontSize="11" fill="var(--color-muted)" textAnchor={i === 0 && points.length > 1 ? "start" : i === points.length - 1 && points.length > 1 ? "end" : "middle"}>{fmtDay(points[i].x)}</text>
          ))}
        </svg>
        {h && hover != null && (
          <div role="status" className="pointer-events-none absolute -translate-x-1/2 rounded-lg border border-line bg-surface px-3 py-2 text-[13px] shadow-md"
            style={{ left: Math.min(Math.max(x(hover), 70), W - 70), top: Math.max(y(h.y) - 62, 0) }}>
            <div className="text-muted">{fmtDay(h.x)}</div><div className="font-mono font-semibold">{fmt(h.y)}{time ? "" : " pages"}</div>
          </div>
        )}
      </div>
      <p className="text-[13px] text-muted">{time ? "Daily average." : "The last check of each day."} {verdict}</p>
    </div>
  );
}
