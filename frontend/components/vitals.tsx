import type { PageSpeed } from "@/lib/api";
import { Card, CardTitle } from "./ui";

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

function Metric({ label, hint, value, rating }: { label: string; hint: string; value: string; rating: Rating | null }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-soft p-4">
      <span className="text-[13px] text-muted">{label}</span>
      <span className="text-[26px] font-semibold leading-none">{value}</span>
      <div className="flex flex-wrap items-center gap-2">
        {rating && <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${chip[rating][1]}`}>{chip[rating][0]}</span>}
        <span className="text-xs text-muted">{hint}</span>
      </div>
    </div>
  );
}

export function PageSpeedCard({ ps, auditRan }: { ps: PageSpeed | null; auditRan: boolean }) {
  if (!ps) {
    return (
      <Card className="p-5">
        <CardTitle>Google PageSpeed (mobile)</CardTitle>
        <p className="text-sm text-muted">
          {auditRan
            ? "The last audit has no PageSpeed data. Check that the PAGESPEED_API_KEY is set on the server, then run an audit."
            : "No audit has run yet. PageSpeed results appear after the first audit."}
        </p>
      </Card>
    );
  }
  return (
    <Card className="flex flex-col gap-5 p-5">
      <CardTitle aside={ps.field_data ? "Measured from real Chrome visitors" : "Lab test (not enough real visitor data yet)"}>
        Google PageSpeed (mobile)
      </CardTitle>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <Metric label="Largest Contentful Paint" hint="Good: 2.5 s or less"
          value={ps.lcp_ms ? `${(ps.lcp_ms / 1000).toFixed(1)} s` : "—"} rating={ps.lcp_ms ? rate.lcp(ps.lcp_ms) : null} />
        <Metric label="Cumulative Layout Shift" hint="Good: 0.1 or less"
          value={ps.cls != null ? ps.cls.toFixed(2) : "—"} rating={ps.cls != null ? rate.cls(ps.cls) : null} />
        <Metric label="Interaction to Next Paint" hint="Good: 200 ms or less"
          value={ps.inp_ms ? `${Math.round(ps.inp_ms)} ms` : "—"} rating={ps.inp_ms ? rate.inp(ps.inp_ms) : null} />
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-4">
        {scoreLabels.filter(([k]) => ps.scores[k] != null).map(([k, label]) => (
          <div key={k} className="flex flex-col gap-2 rounded-xl border border-line p-4">
            <span className="text-[13px] text-muted">{label}</span>
            <span className="text-2xl font-semibold leading-none">{ps.scores[k]}<span className="text-sm font-medium text-muted"> / 100</span></span>
            <div className="h-1.5 rounded bg-[#e8ebf0]">
              <div className={`h-1.5 rounded ${rate.score(ps.scores[k]) === "good" ? "bg-bar-ok" : rate.score(ps.scores[k]) === "improve" ? "bg-bar-warn" : "bg-bar-bad"}`} style={{ width: `${ps.scores[k]}%` }} />
            </div>
          </div>
        ))}
      </div>
      {ps.opportunities.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <h3 className="text-[15px] font-semibold">Biggest improvements suggested by Google</h3>
          <ul className="list-disc pl-5 text-sm leading-relaxed text-ink-2">
            {ps.opportunities.map((o) => <li key={o}>{o}</li>)}
          </ul>
        </div>
      )}
    </Card>
  );
}
