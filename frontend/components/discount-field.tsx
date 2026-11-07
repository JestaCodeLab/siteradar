"use client";

import { Tag, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { send, type DiscountCheck } from "@/lib/api";
import { money } from "@/lib/me";

/** "Have a discount code?" for the plan being bought. The code is checked on the server; `applied` is what it takes off, or null. */
export function DiscountField({ plan, cycle, applied, onApplied }: { plan: string; cycle: string; applied: DiscountCheck | null; onApplied: (r: DiscountCheck | null) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const last = useRef(`${plan}:${cycle}`);

  async function check(code: string, quiet = false) {
    setBusy(true); if (!quiet) setError(null);
    try { onApplied(await send<DiscountCheck>("POST", "/api/billing/discount", { code, plan, cycle })); setError(null); }
    catch (e) { onApplied(null); setError(e instanceof Error ? e.message : "Could not check the code."); }
    setBusy(false);
  }

  // another plan or billing period was chosen: the same code may no longer fit, so check it again
  useEffect(() => {
    const now = `${plan}:${cycle}`;
    if (last.current !== now) { last.current = now; if (applied) { const code = applied.code; setTimeout(() => void check(code, true), 0); } }
  });

  if (applied) {
    return (
      <div role="status" className="flex items-center gap-3 rounded-xl border border-ok/30 bg-ok-soft p-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-ok text-white"><Tag aria-hidden="true" size={18} /></span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5"><span className="font-mono text-[15px] font-bold tracking-wide text-ink">{applied.code}</span><span className="rounded-full bg-ok px-2 py-0.5 text-xs font-bold text-white">{discountLine(applied)}</span></span>
          <span className="text-[13px] text-ok">{applied.label} · {applied.duration === "every payment" ? "every payment" : applied.duration}</span>
        </span>
        <button type="button" onClick={() => { onApplied(null); setText(""); }} aria-label={`Remove discount code ${applied.code}`} className="flex size-9 shrink-0 items-center justify-center rounded-lg text-ok hover:bg-ok/15"><X aria-hidden="true" size={18} /></button>
      </div>
    );
  }
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-dashed border-[#c9cfd8] px-3.5 text-left text-sm font-semibold text-ink-2 hover:border-brand hover:bg-brand-soft hover:text-brand-ink">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand"><Tag aria-hidden="true" size={16} /></span>Add a discount code
      </button>
    );
  }
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (text.trim()) void check(text.trim()); }} className="flex flex-col gap-2">
      <label htmlFor="dc-code" className="text-sm font-semibold">Discount code</label>
      <div className={`flex items-center rounded-xl border bg-surface p-1 pl-3 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20 ${error ? "border-bad" : "border-[#c9cfd8]"}`}>
        <Tag aria-hidden="true" size={16} className="shrink-0 text-muted" />
        <input id="dc-code" autoFocus value={text} onChange={(e) => { setText(e.target.value.toUpperCase()); setError(null); }} placeholder="Enter your code" autoComplete="off" aria-invalid={!!error}
          className="min-h-10 min-w-0 flex-1 border-0 bg-transparent px-2.5 outline-none focus-visible:!outline-none font-mono text-[15px] uppercase tracking-wide outline-none placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:text-muted" />
        <button disabled={busy || !text.trim()} className="inline-flex min-h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50">{busy ? "Checking…" : "Apply"}</button>
      </div>
      {error && <p role="alert" className="text-[13px] font-medium text-bad">{error}</p>}
    </form>
  );
}

/** For places that pay in one step (the billing page): a plain box for the code, checked when the customer pays. */
export function DiscountBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-dashed border-[#c9cfd8] px-3.5 py-3">
      <span className="flex items-center gap-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand"><Tag aria-hidden="true" size={16} /></span><label htmlFor="bp-code" className="text-sm font-semibold">Have a discount code?</label></span>
      <input id="bp-code" value={value} onChange={(e) => onChange(e.target.value.toUpperCase())} placeholder="Enter your code" autoComplete="off" className="min-h-10 w-full max-w-[220px] rounded-lg border border-[#c9cfd8] bg-surface px-3 font-mono text-[15px] uppercase tracking-wide placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:text-muted" />
      <span className="text-[13px] text-muted">Applied when you choose a paid plan below.</span>
    </div>
  );
}

export const discountLine = (a: DiscountCheck) => `−${money(a.discount, a.currency)}`;
