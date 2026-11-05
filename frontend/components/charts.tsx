import type { StripDay } from "@/lib/api";
import { fmtDay } from "@/lib/format";

function barColor(uptime: number | null) {
  if (uptime == null) return "bg-bar-none";
  if (uptime >= 99.9) return "bg-bar-ok";
  if (uptime >= 95) return "bg-bar-warn";
  return "bg-bar-bad";
}

export function UptimeStrip({ days, height = "h-[26px]" }: { days: StripDay[]; height?: string }) {
  return (
    <div role="img" aria-label="Uptime for each of the last 30 days" className="flex items-center gap-0.5">
      {days.map((d) => (
        <span
          key={d.day}
          title={`${fmtDay(d.day)}: ${d.uptime == null ? "no data" : d.uptime.toFixed(1) + "% up"}`}
          className={`flex-1 rounded-[2px] ${height} ${barColor(d.uptime)}`}
        />
      ))}
    </div>
  );
}

export function StripLegend() {
  return (
    <div className="flex flex-wrap gap-5 text-[13px] text-muted">
      {[["bg-bar-ok", "Up all day"], ["bg-bar-warn", "Slow or partial"], ["bg-bar-bad", "Down"], ["bg-bar-none", "No data"]].map(([c, l]) => (
        <span key={l} className="inline-flex items-center gap-1.5">
          <span className={`size-3 rounded-[2px] ${c}`} />
          {l}
        </span>
      ))}
    </div>
  );
}

export function LineChart({ points, threshold, unit = "ms", label }: { points: { x: string; y: number }[]; threshold?: number; unit?: string; label: string }) {
  if (points.length < 2) return <p className="py-10 text-center text-sm text-muted">Not enough checks yet to draw a chart.</p>;
  const W = 640, H = 180, L = 44, R = 10, T = 10, B = 20;
  const max = Math.max(...points.map((p) => p.y), threshold ?? 0) * 1.1 || 1;
  const x = (i: number) => L + (i * (W - L - R)) / (points.length - 1);
  const y = (v: number) => H - B - (v / max) * (H - T - B);
  const fmt = (v: number) => (unit !== "ms" ? `${Math.round(v)}` : v >= 1000 ? `${(v / 1000).toFixed(1)} s` : `${Math.round(v)} ms`);
  const ticks = [0, 0.5, 1].map((f) => f * max);
  return (
    <svg role="img" aria-label={label} viewBox={`0 0 ${W} ${H}`} className="block h-52 w-full" preserveAspectRatio="none">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#e2e5ea" />
          <text x={0} y={y(t) + 4} fontSize="11" fill="#5b6472" fontFamily="var(--font-geist-mono)">{fmt(t)}</text>
        </g>
      ))}
      {threshold != null && threshold < max && (
        <line x1={L} x2={W - R} y1={y(threshold)} y2={y(threshold)} stroke="#b3261e" strokeWidth="1.5" strokeDasharray="5 4" />
      )}
      <polyline fill="none" stroke="var(--color-brand)" strokeWidth="2.5" strokeLinejoin="round" points={points.map((p, i) => `${x(i)},${y(p.y)}`).join(" ")} />
      <text x={L} y={H - 4} fontSize="11" fill="#5b6472">{fmtDay(points[0].x)}</text>
      <text x={W - R} y={H - 4} fontSize="11" fill="#5b6472" textAnchor="end">{fmtDay(points[points.length - 1].x)}</text>
    </svg>
  );
}

export function HBar({ label, value, pct, color = "bg-brand" }: { label: string; value: string; pct: number; color?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between gap-3 text-sm">
        <span className="min-w-0 truncate">{label}</span>
        <span className="font-mono">{value}</span>
      </div>
      <div className="h-2 rounded bg-[#e8ebf0]">
        <div className={`h-2 rounded ${color}`} style={{ width: `${Math.max(2, Math.min(100, pct))}%` }} />
      </div>
    </div>
  );
}
