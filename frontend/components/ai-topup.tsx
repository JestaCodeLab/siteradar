"use client";

import { useEffect, useState, type ReactNode } from "react";
import useSWR from "swr";
import { Sparkles, X } from "lucide-react";
import { btn } from "./ui";
import { useToast } from "./toast";
import { fetcher, type AiCredits } from "@/lib/api";
import { payFor } from "@/lib/paystack";
import { useMe } from "@/lib/me";

export const useAiCredits = () => useSWR<AiCredits>("/api/ai/credits", fetcher);

const money = (n: number, cur: string) => `${cur === "USD" ? "$" : "GHS "}${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

/**
 * Every button that spends an AI draft goes through `gate`. With credits left it runs the action; with none left it opens the top-up window instead,
 * so the person can buy a package, pay in Paystack's popup and carry straight on.
 */
export function useAiGate(): { gate: (action: () => void) => void; modal: ReactNode; credits: AiCredits | undefined } {
  const { data, mutate } = useAiCredits();
  const [open, setOpen] = useState<null | (() => void)>(null);
  const gate = (action: () => void) => { if (data && data.left < 1) setOpen(() => action); else action(); };
  const modal = open && data ? <AiTopUpModal credits={data} onClose={() => setOpen(null)} onBought={async () => { await mutate(); const go = open; setOpen(null); go(); }} /> : null;
  return { gate, modal, credits: data };
}

export function AiTopUpModal({ credits, onClose, onBought }: { credits: AiCredits; onClose: () => void; onBought: () => void | Promise<void> }) {
  const { isOwner } = useMe();
  const toast = useToast();
  const [busy, setBusy] = useState<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && busy === null) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, busy]);

  async function buy(n: number) {
    setBusy(n);
    try {
      const r = await payFor("/api/billing/ai-topup", { credits: n });
      if (r === "cancelled") toast.info("The payment was cancelled. Nothing was charged.");
      else if (r === "pending") toast.info("We are waiting for your payment to be confirmed.", "Your credits are added as soon as it is.");
      else { toast.success(`${n.toLocaleString()} AI credits added.`); await onBought(); }
    } catch (e) { toast.error(e instanceof Error ? e.message : "The payment could not be started."); }
    setBusy(null);
  }

  const best = credits.bundles.length ? Math.min(...credits.bundles.map((b) => b.price / b.credits)) : 0;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="aitop-title" className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/60 p-4">
      <div className="flex max-h-[92vh] w-[min(560px,100%)] flex-col gap-4 overflow-y-auto rounded-2xl border border-line bg-surface p-6 text-ink shadow-[0_24px_80px_rgba(15,23,42,0.28)]">
        <div className="flex items-start gap-3.5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"><Sparkles aria-hidden="true" size={22} /></span>
          <div className="min-w-0 flex-1">
            <h2 id="aitop-title" className="text-xl font-bold">{credits.allowed ? "You have used all your AI credits" : "AI drafts are on paid plans"}</h2>
            <p className="mt-0.5 text-[15px] text-muted">{credits.allowed
              ? `Your plan includes ${credits.quota.toLocaleString()} a month and they renew on the 1st. Add credits to keep fixing issues now. Credits you buy never expire.`
              : "AI-written titles, descriptions and alt text are part of the Starter, Growth and Scale plans."}</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy !== null} aria-label="Close" className="flex size-10 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-soft"><X aria-hidden="true" size={18} /></button>
        </div>

        {credits.allowed ? (
          <>
            <ul className="flex flex-col gap-2.5">
              {credits.bundles.map((b) => (
                <li key={b.credits} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3.5">
                  <span className="flex flex-col">
                    <span className="text-[15px] font-semibold">{b.credits.toLocaleString()} AI credits {b.price / b.credits <= best + 1e-9 && credits.bundles.length > 1 && <span className="ml-1.5 rounded-full bg-ok-soft px-2 py-0.5 text-xs font-semibold text-ok">Best value</span>}</span>
                    <span className="text-[13px] text-muted">{money(b.price, credits.currency)} · one credit writes one title, description or page of alt text</span>
                  </span>
                  <button type="button" onClick={() => buy(b.credits)} disabled={!isOwner || busy !== null} className={btn.primary}>{busy === b.credits ? "Opening…" : "Buy"}</button>
                </li>
              ))}
            </ul>
            {!isOwner && <p className="rounded-lg bg-soft px-3.5 py-2.5 text-sm text-ink-2">Only the workspace owner can buy credits. Ask them to add some.</p>}
          </>
        ) : (
          <a href="/settings?tab=billing" className={btn.primary}>See plans</a>
        )}
        <div className="flex justify-end"><button type="button" onClick={onClose} disabled={busy !== null} className={btn.secondary}>Not now</button></div>
      </div>
    </div>
  );
}
