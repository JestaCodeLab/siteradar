"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FormError } from "@/components/auth-shell";
import { btn, Icon } from "@/components/ui";
import { checkout } from "@/lib/paystack";
import { ghs } from "@/lib/me";
import { planFeatures, priceLine, usePlans } from "@/lib/plans";

const suggest: Record<string, string> = { "1 to 3": "starter", "4 to 15": "growth", "16 to 50": "scale", "More than 50": "scale" };

export default function PlanStep() {
  const router = useRouter();
  const cat = usePlans();
  const [plan, setPlan] = useState("free");
  const [yearly, setYearly] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- reading what the signup page saved in this browser, after mount */
    try {
      const picked = sessionStorage.getItem("sitewatch.plan");
      if (picked) { const p = JSON.parse(picked); setPlan(p.plan); setYearly(p.cycle === "yearly"); }
      const s = sessionStorage.getItem("sitewatch.sites");
      if (s && suggest[s]) setHint(suggest[s]);
    } catch { /* optional */ }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const plans = cat?.plans ?? [];
  const chosen = plans.find((p) => p.id === plan);
  const due = !chosen ? 0 : yearly ? chosen.price_year : chosen.price_month;
  const tab = (on: boolean) => `flex min-h-11 items-center gap-2 rounded-lg px-5 text-sm font-semibold ${on ? "bg-brand text-white" : "text-ink-2 hover:bg-soft"}`;

  async function go() {
    setBusy(true); setError(null);
    try {
      const r = await checkout("/api/onboarding/plan", { plan, cycle: yearly ? "yearly" : "monthly" });
      if (r === "cancelled") { setError("The payment was cancelled. Nothing was charged. You can try again or continue with Free."); setBusy(false); return; }
      try { sessionStorage.removeItem("sitewatch.plan"); } catch { /* optional */ }
      router.push("/onboarding/done");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not continue."); setBusy(false); }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2"><h1 className="text-[30px] font-semibold">Choose your plan</h1>
        <p className="text-[15px] text-muted">Start on Free, or pick a paid plan now. You can change plan any time.</p></div>
      <div role="group" aria-label="Billing period" className="inline-flex w-fit gap-1 rounded-xl border border-line bg-surface p-1">
        <button aria-pressed={!yearly} onClick={() => setYearly(false)} className={tab(!yearly)}>Monthly</button>
        <button aria-pressed={yearly} onClick={() => setYearly(true)} className={tab(yearly)}>Yearly <span className={`rounded-full px-2 py-0.5 text-xs ${yearly ? "bg-white/20" : "bg-ok-soft text-ok"}`}>Save {cat?.yearly_discount ?? 20}%</span></button>
      </div>
      <div role="radiogroup" aria-label="Plan" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((p) => (
          <button key={p.id} role="radio" aria-checked={plan === p.id} onClick={() => setPlan(p.id)}
            className={`relative flex flex-col gap-3 rounded-2xl bg-surface p-5 text-left ${plan === p.id ? "border-2 border-brand" : "border border-line"}`}>
            {hint === p.id && <span className="absolute -top-3 left-5 rounded-full bg-ok px-3 py-1 text-xs font-semibold text-white">Suggested for you</span>}
            <span className="text-lg font-semibold">{p.name}</span>
            <span className="text-[28px] font-semibold leading-none">{priceLine(p, yearly)}<span className="text-sm font-normal text-muted"> / month</span></span>
            <ul className="flex flex-col gap-1.5 text-[13px] text-ink-2">{planFeatures(p).slice(0, 5).map((f) => <li key={f} className="flex gap-2"><Icon.check className="mt-0.5 shrink-0 text-ok" />{f}</li>)}</ul>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-6">
        {plan === "free" ? (
          <div className="min-w-0 flex-[2_1_420px] rounded-2xl border border-line bg-surface p-6">
            <p className="mb-1 text-base font-semibold">Free plan: no card needed</p>
            <p className="text-[15px] leading-relaxed text-ink-2">One website, email alerts, and a monthly report that carries a light SiteRadar watermark. Upgrade any time from Billing to remove the watermark and add more websites.</p>
          </div>
        ) : (
          <div className="min-w-0 flex-[2_1_420px] rounded-2xl border border-line bg-surface p-6">
            <p className="mb-1 text-base font-semibold">How you pay</p>
            <p className="text-[15px] leading-relaxed text-ink-2">A secure Paystack window opens on this page so you can pay by card or mobile money (MTN MoMo, Telecel Cash, AirtelTigo Money). Cards renew automatically. With mobile money we email you a payment link before each renewal. You can cancel any time.</p>
          </div>
        )}
        <div className="min-w-0 flex-[1_1_300px] rounded-2xl border border-line bg-surface p-6">
          <p className="mb-3 text-base font-semibold">Order summary</p>
          <div className="flex justify-between text-sm"><span>{chosen?.name ?? "—"} plan</span><span>{chosen ? ghs(due) : ""}</span></div>
          <p className="text-[13px] text-muted">{plan === "free" ? "Free for ever" : yearly ? "Billed yearly" : "Billed monthly"}</p>
          <div className="mt-3 flex justify-between border-t border-line pt-3 font-semibold"><span>Due today</span><span>{ghs(due)}</span></div>
        </div>
      </div>
      <FormError message={error} />
      <div className="flex flex-wrap justify-between gap-3">
        <button onClick={() => router.push("/onboarding/company")} className={btn.secondary}>Back</button>
        <button onClick={go} disabled={busy || !chosen} className={`${btn.primary} min-h-12 px-8 text-[15px]`}>
          {busy ? "Please wait…" : plan === "free" ? "Continue with Free" : `Pay ${ghs(due)}`}</button>
      </div>
    </div>
  );
}
