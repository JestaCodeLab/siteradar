"use client";

import { Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { aBtn, aInput } from "./ui";
import { send } from "@/lib/api";

/** Super admin: delete a customer and everything it owns. The workspace name has to be typed back and a reason is kept in the audit trail. */
export function EraseCustomerDialog({ id, name, sites, people, onClose, onDone }: {
  id: string; name: string; sites: number; people: number; onClose: () => void; onDone: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [typed, setTyped] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  const ready = typed.trim() === name && reason.trim().length >= 5;

  async function erase(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setBusy(true); setError(null);
    try { await send("POST", `/api/admin/customers/${id}/delete`, { confirm: typed.trim(), reason: reason.trim() }); onDone(); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not delete the customer."); setBusy(false); }
  }

  return (
    <dialog
      ref={ref} aria-labelledby="ec-title" onClose={onClose}
      className="m-auto w-[min(520px,calc(100vw-32px))] rounded-2xl border border-[#E2E5EA] bg-white p-0 text-[#16122B] shadow-[0_24px_80px_rgba(15,23,42,0.28)] backdrop:bg-[#0F172A]/60"
    >
      <form onSubmit={erase} className="flex max-h-[calc(100vh-32px)] flex-col gap-4 overflow-y-auto p-6">
        <div className="flex items-start gap-3.5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#FBE7E5] text-[#B3261E]"><Trash2 aria-hidden="true" size={22} /></span>
          <div className="min-w-0 flex-1">
            <h2 id="ec-title" className="text-xl font-bold">Delete {name}?</h2>
            <p className="mt-0.5 text-[15px] text-[#5B6472]">This cannot be undone.</p>
          </div>
          <button type="button" onClick={() => ref.current?.close()} aria-label="Close" className="-m-1 flex size-9 shrink-0 items-center justify-center rounded-lg text-[#5B6472] hover:bg-[#F3F4F6]"><X aria-hidden="true" size={18} /></button>
        </div>

        <div className="rounded-xl bg-[#FEF2F2] px-4 py-3.5 text-sm leading-relaxed text-[#7F1D1D]">
          <b>Everything this customer owns is deleted now:</b>
          <ul className="mt-1.5 list-disc space-y-1 pl-5">
            <li>{sites} website{sites === 1 ? "" : "s"} with all their checks, audits, visitor stats and screenshots</li>
            <li>Subscriptions, invoices and stored reports, and the company logo</li>
            <li>The accounts of {people} team member{people === 1 ? "" : "s"}, unless they also belong to another workspace</li>
            <li>Pending invitations and internal notes</li>
          </ul>
          <p className="mt-2"><b>Kept:</b> payment records, for accounting, and this deletion in the audit trail. The saved card is removed.</p>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="ec-reason" className="text-sm font-medium">Reason <span className="font-normal text-[#5B6472]">(kept in the audit trail)</span></label>
          <input id="ec-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Customer asked us to delete their account" className={aInput} />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="ec-name" className="text-sm font-medium">Type <b className="font-mono">{name}</b> to confirm</label>
          <input id="ec-name" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" className={aInput} />
        </div>
        {error && <p role="alert" className="rounded-lg bg-[#FBE7E5] px-3.5 py-2.5 text-sm text-[#B3261E]">{error}</p>}
        <div className="flex justify-end gap-2.5">
          <button type="button" onClick={() => ref.current?.close()} className={aBtn.secondary}>Cancel</button>
          <button disabled={!ready || busy} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#B3261E] px-[18px] text-sm font-semibold text-white hover:bg-[#8F1F18] disabled:opacity-50">{busy ? "Deleting…" : "Delete permanently"}</button>
        </div>
      </form>
    </dialog>
  );
}
