"use client";

import { useId, useSyncExternalStore } from "react";

const slow = [12, 21, 28];
const mono = "font-mono";
// The response-time line: its resting shape, and the shapes it moves through (a smooth loop, like new checks arriving).
const LINE = "0,8.49 10.3,41.59 20.7,9.93 31,42.03 41.4,10.75 51.7,12.77 62.1,34.66 72.4,17.68 82.8,41.92 93.1,13.82 103.4,38.64 113.8,40.24 124.1,20.89 134.5,12.94 144.8,34 155.2,38.57 165.5,45.77 175.9,46.6 186.2,35.94 196.6,45.07 206.9,19.32 217.2,40.6 227.6,42.01 237.9,32.94 248.3,19.79 258.6,35.07 269,36.8 279.3,30.69 289.7,7.99 300,34.41";
const MORPH = {
  values: "0,8.49 10.3,41.59 20.7,9.93 31,42.03 41.4,10.75 51.7,12.77 62.1,34.66 72.4,17.68 82.8,41.92 93.1,13.82 103.4,38.64 113.8,40.24 124.1,20.89 134.5,12.94 144.8,34 155.2,38.57 165.5,45.77 175.9,46.6 186.2,35.94 196.6,45.07 206.9,19.32 217.2,40.6 227.6,42.01 237.9,32.94 248.3,19.79 258.6,35.07 269,36.8 279.3,30.69 289.7,7.99 300,34.41;0,8.49 10.3,41.59 20.7,9.93 31,42.03 41.4,10.75 51.7,12.77 62.1,34.66 72.4,17.68 82.8,41.92 93.1,13.82 103.4,38.64 113.8,40.24 124.1,20.89 134.5,12.94 144.8,34 155.2,38.57 165.5,45.77 175.9,46.6 186.2,35.94 196.6,45.07 206.9,19.32 217.2,40.6 227.6,42.01 237.9,32.94 248.3,19.79 258.6,35.07 269,36.8 279.3,30.69 289.7,7.99 300,34.41;0,34.04 10.3,35.99 20.7,37.58 31,12.39 41.4,22.99 51.7,22.67 62.1,48.48 72.4,39.97 82.8,37.64 93.1,24.25 103.4,33.4 113.8,37.55 124.1,38.76 134.5,32.08 144.8,46.71 155.2,33.36 165.5,8.74 175.9,41.19 186.2,42.41 196.6,10.2 206.9,18.28 217.2,31.67 227.6,11.23 237.9,41.08 248.3,12.16 258.6,37.46 269,19.92 279.3,46.17 289.7,14.34 300,36.18;0,34.04 10.3,35.99 20.7,37.58 31,12.39 41.4,22.99 51.7,22.67 62.1,48.48 72.4,39.97 82.8,37.64 93.1,24.25 103.4,33.4 113.8,37.55 124.1,38.76 134.5,32.08 144.8,46.71 155.2,33.36 165.5,8.74 175.9,41.19 186.2,42.41 196.6,10.2 206.9,18.28 217.2,31.67 227.6,11.23 237.9,41.08 248.3,12.16 258.6,37.46 269,19.92 279.3,46.17 289.7,14.34 300,36.18;0,12.25 10.3,39.71 20.7,34.04 31,41.41 41.4,46.85 51.7,46.31 62.1,46.54 72.4,6.94 82.8,23.83 93.1,24.3 103.4,41.29 113.8,34.95 124.1,33.38 134.5,20.86 144.8,32.13 155.2,31.73 165.5,12.72 175.9,12.67 186.2,46.37 196.6,23.43 206.9,39.16 217.2,34.4 227.6,40.36 237.9,17.58 248.3,34.5 258.6,33.94 269,48.63 279.3,47.96 289.7,30.71 300,38.57;0,12.25 10.3,39.71 20.7,34.04 31,41.41 41.4,46.85 51.7,46.31 62.1,46.54 72.4,6.94 82.8,23.83 93.1,24.3 103.4,41.29 113.8,34.95 124.1,33.38 134.5,20.86 144.8,32.13 155.2,31.73 165.5,12.72 175.9,12.67 186.2,46.37 196.6,23.43 206.9,39.16 217.2,34.4 227.6,40.36 237.9,17.58 248.3,34.5 258.6,33.94 269,48.63 279.3,47.96 289.7,30.71 300,38.57;0,45.37 10.3,34.68 20.7,33.79 31,5.08 41.4,13.27 51.7,37.37 62.1,10.36 72.4,5.97 82.8,39.41 93.1,39.76 103.4,30.15 113.8,34.4 124.1,10.02 134.5,21.24 144.8,23.96 155.2,18.61 165.5,9.46 175.9,46.1 186.2,24.82 196.6,22.54 206.9,22.4 217.2,33.91 227.6,21.43 237.9,34.63 248.3,32.51 258.6,11.78 269,39.49 279.3,32.88 289.7,11.9 300,42.1;0,45.37 10.3,34.68 20.7,33.79 31,5.08 41.4,13.27 51.7,37.37 62.1,10.36 72.4,5.97 82.8,39.41 93.1,39.76 103.4,30.15 113.8,34.4 124.1,10.02 134.5,21.24 144.8,23.96 155.2,18.61 165.5,9.46 175.9,46.1 186.2,24.82 196.6,22.54 206.9,22.4 217.2,33.91 227.6,21.43 237.9,34.63 248.3,32.51 258.6,11.78 269,39.49 279.3,32.88 289.7,11.9 300,42.1;0,8.49 10.3,41.59 20.7,9.93 31,42.03 41.4,10.75 51.7,12.77 62.1,34.66 72.4,17.68 82.8,41.92 93.1,13.82 103.4,38.64 113.8,40.24 124.1,20.89 134.5,12.94 144.8,34 155.2,38.57 165.5,45.77 175.9,46.6 186.2,35.94 196.6,45.07 206.9,19.32 217.2,40.6 227.6,42.01 237.9,32.94 248.3,19.79 258.6,35.07 269,36.8 279.3,30.69 289.7,7.99 300,34.41",
  keyTimes: "0;0.2;0.26;0.47;0.52;0.78;0.83;0.95;1",
  keySplines: "0 0 1 1;0.8 0 0.2 1;0 0 1 1;0.8 0 0.2 1;0 0 1 1;0.8 0 0.2 1;0 0 1 1;0.8 0 0.2 1",
};

const noMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const subscribe = (cb: () => void) => { const m = window.matchMedia("(prefers-reduced-motion: reduce)"); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); };

/** The dashboard card in the home page banner. The last twelve bars fill in as if checks were arriving, the response line draws itself and
 * then keeps moving, and the green dot blinks. Everything stops for people who ask their device for reduced motion. */
export function HeroPreview() {
  const still = useSyncExternalStore(subscribe, noMotion, () => false);
  const reveal = useId().replace(/:/g, "");
  return (
    <div role="img" aria-label="SiteRadar dashboard showing a website marked Slow, 99.98% uptime, 6.1 second response time, SSL valid for 74 days and an audit score of 81"
      className="hidden min-w-0 flex-[1_1_520px] flex-col gap-4 rounded-[20px] bg-white p-6 text-[#0F172A] shadow-[0_30px_80px_rgba(0,0,0,0.35)] md:flex">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5"><span className="text-xl font-bold tracking-[-0.02em]">Jesta Digital Solutions</span><span className="rounded-full bg-[#FEF3C7] px-2.5 py-[3px] text-xs font-bold text-[#92400E]">● Slow</span></div>
          <span className={`${mono} text-[13px] text-[#C2410C]`}>jestadigitalsolutions.com</span>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-[#475569]"><span className="sr-live size-2 rounded-full bg-[#16A34A]" />Live · checked 2 min ago</span>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[["Uptime, 30 days", "99.98%", ""], ["Response", "6.1 s", "text-[#B45309]"], ["SSL expires", "74 d", ""], ["Audit score", "81", ""]].map(([k, v, c]) => (
          <div key={k} className="rounded-xl border border-[#EFE4D8] p-3"><div className="text-xs text-[#475569]">{k}</div><div className={`${mono} text-[22px] font-semibold ${c}`}>{v}</div></div>))}
      </div>
      <div className="flex flex-col gap-2"><div className="flex justify-between text-[13px]"><span className="font-semibold">Uptime, last 30 days</span><span className="text-[#475569]">1 incident · 7 min downtime</span></div>
        <div className="sr-bars flex h-7 items-end gap-[3px]">{Array.from({ length: 30 }, (_, i) => {
          const c = slow.includes(i) ? "#F59E0B" : "#16A34A";
          return <div key={i} className="h-full flex-1 rounded-[3px]" style={{ backgroundColor: c, color: c }} />;
        })}</div></div>
      <div className="flex flex-col gap-1.5"><div className="flex justify-between text-[13px]"><span className="font-semibold">Response time</span><span className="text-[#92400E]">Above the 3 s threshold</span></div>
        <svg viewBox="0 0 300 100" width="100%" height="110" preserveAspectRatio="none" aria-hidden="true">
          <line x1="0" y1="62.5" x2="300" y2="62.5" stroke="#94A3B8" strokeWidth="1.2" strokeDasharray="5 4" />
          {/* the line is uncovered from left to right when the page opens */}
          <clipPath id={reveal}><rect x="0" y="-10" height="120" width={still ? 300 : 0}>{!still && <animate attributeName="width" from="0" to="300" dur="1.6s" begin="0.3s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.2 0 0.2 1" />}</rect></clipPath>
          <polyline clipPath={`url(#${reveal})`} fill="none" stroke="#F97316" strokeWidth="2.4" strokeLinejoin="round" vectorEffect="non-scaling-stroke" points={LINE}>
            {!still && <animate attributeName="points" dur="5.2s" begin="1.9s" repeatCount="indefinite" calcMode="spline" keyTimes={MORPH.keyTimes} keySplines={MORPH.keySplines} values={MORPH.values} />}
          </polyline>
        </svg></div>
      <div className="flex flex-col border-t border-[#EFE4D8]">
        {["Security headers missing (CSP, X-Frame-Options)", "9 images are larger than 500 KB"].map((t, i) => (
          <div key={t} className={`flex items-center gap-2.5 py-2.5 ${i === 0 ? "border-b border-[#EFE4D8]" : ""}`}><span className="rounded-full bg-[#FEE2E2] px-2.5 py-[3px] text-[11px] font-bold text-[#991B1B]">High</span><span className="text-sm">{t}</span></div>))}
      </div>
    </div>
  );
}
