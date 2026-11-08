"use client";

import { Tag, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DatePicker } from "../date-picker";
import { Select } from "../select";
import { aBtn, aInput, Checkbox, shortDate } from "./ui";
import { fetcher, send, type DiscountCode } from "@/lib/api";
import { money } from "@/lib/me";
import useSWR from "swr";

const shell = "m-auto w-[min(560px,calc(100vw-32px))] rounded-2xl border border-[#E2E5EA] bg-white p-0 text-[#16122B] shadow-[0_24px_80px_rgba(15,23,42,0.28)] backdrop:bg-[#0F172A]/60";
const label = "text-sm font-medium";

/** `locked` is for forms: Esc and a click on the dimmed background do nothing, so a half-filled form is never lost by accident. Only Cancel and the X close it. */
function useDialog(onClose: () => void, locked = false) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  const lockedProps = { onCancel: (e: React.SyntheticEvent) => e.preventDefault() };
  const looseProps = { onClick: (e: React.MouseEvent) => { if (e.target === ref.current) ref.current?.close(); } };
  return { ref, props: { ref, onClose, ...(locked ? lockedProps : looseProps) } };
}

/** A random, readable code such as K7M2QX9D (no 0/O or 1/I to mix up). */
const randomCode = () => Array.from({ length: 8 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");

export function NewDiscountDialog({ plans, onClose, onDone }: { plans: { id: string; name: string }[]; onClose: () => void; onDone: () => void }) {
  const d = useDialog(onClose, true);
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<"percent" | "fixed">("percent");
  const [percent, setPercent] = useState("20");
  const [ghs, setGhs] = useState("");
  const [usd, setUsd] = useState("");
  const [chosen, setChosen] = useState<string[]>([]);
  const [cycles, setCycles] = useState("both");
  const [lasts, setLasts] = useState("1");
  const [count, setCount] = useState("3");
  const [maxUses, setMaxUses] = useState("");
  const [starts, setStarts] = useState("");
  const [ends, setEnds] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(null);
    try {
      await send("POST", "/api/admin/discounts", {
        code, description, kind, percent: Number(percent), amount_ghs: Number(ghs || 0), amount_usd: Number(usd || 0), plan_ids: chosen, cycles,
        periods: lasts === "n" ? Number(count) : Number(lasts), max_uses: maxUses || null, starts: starts || null, expires: ends || null,
      });
      onDone();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save the code."); setBusy(false); }
  }

  const radio = (on: boolean) => `flex min-h-11 flex-1 items-center justify-center rounded-lg border text-sm font-semibold ${on ? "border-2 border-[#6B4FE0] bg-[#F5F1FF] text-[#4A33B0]" : "border-[#C9CFD8] bg-white"}`;
  return (
    <dialog {...d.props} aria-labelledby="nd-title" className={shell}>
      <form onSubmit={save} className="flex max-h-[calc(100vh-32px)] flex-col gap-4 overflow-y-auto p-6">
        <div className="flex items-start gap-3.5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#EFEAFF] text-[#4A33B0]"><Tag aria-hidden="true" size={22} /></span>
          <div className="min-w-0 flex-1"><h2 id="nd-title" className="text-xl font-bold">New discount code</h2><p className="mt-0.5 text-[15px] text-[#5B6472]">Customers type it in when they pick a paid plan.</p></div>
          <button type="button" onClick={() => d.ref.current?.close()} aria-label="Close" className="-m-1 flex size-9 shrink-0 items-center justify-center rounded-lg text-[#5B6472] hover:bg-[#F3F4F6]"><X aria-hidden="true" size={18} /></button>
        </div>

        <div className="flex flex-col gap-2"><label htmlFor="nd-code" className={label}>Code</label>
          <div className="flex gap-2"><input id="nd-code" required value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))} placeholder="LAUNCH20" maxLength={32} className={`${aInput} font-mono uppercase`} />
            <button type="button" onClick={() => setCode(randomCode())} className={aBtn.secondary}>Generate</button></div></div>
        <div className="flex flex-col gap-2"><label htmlFor="nd-desc" className={label}>Note <span className="font-normal text-[#5B6472]">(only you see this)</span></label>
          <input id="nd-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Launch offer for the first agencies" className={aInput} /></div>

        <fieldset className="flex flex-col gap-2"><legend className={`${label} mb-1`}>Discount</legend>
          <div className="flex gap-2"><button type="button" aria-pressed={kind === "percent"} onClick={() => setKind("percent")} className={radio(kind === "percent")}>Percentage off</button>
            <button type="button" aria-pressed={kind === "fixed"} onClick={() => setKind("fixed")} className={radio(kind === "fixed")}>Fixed amount off</button></div>
          {kind === "percent" ? (
            <div className="flex items-center gap-2"><input aria-label="Percent off" type="number" min={1} max={100} step="any" required value={percent} onChange={(e) => setPercent(e.target.value)} className={`${aInput} max-w-[140px]`} /><span className="text-[15px]">% off the plan price (100 makes the plan free)</span></div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-[13px] text-[#5B6472]">Off in cedis (GHS)<input type="number" min={0} step="any" value={ghs} onChange={(e) => setGhs(e.target.value)} placeholder="50" className={aInput} /></label>
              <label className="flex flex-col gap-1.5 text-[13px] text-[#5B6472]">Off in dollars (USD)<input type="number" min={0} step="any" value={usd} onChange={(e) => setUsd(e.target.value)} placeholder="5" className={aInput} /></label>
            </div>
          )}
        </fieldset>

        <fieldset className="flex flex-col gap-2"><legend className={`${label} mb-1`}>Applies to <span className="font-normal text-[#5B6472]">(none ticked means every paid plan)</span></legend>
          <div className="flex flex-wrap gap-2">{plans.map((p) => (
            <label key={p.id} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3.5 text-sm ${chosen.includes(p.id) ? "border-2 border-[#6B4FE0] bg-[#F5F1FF] font-semibold" : "border-[#C9CFD8]"}`}>
              <Checkbox label={`${p.name} plan`} checked={chosen.includes(p.id)} onChange={(on) => setChosen(on ? [...chosen, p.id] : chosen.filter((x) => x !== p.id))} />{p.name}</label>))}</div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2"><span className={label}>Billing</span><Select value={cycles} onChange={setCycles} options={[{ value: "both", label: "Monthly and yearly" }, { value: "monthly", label: "Monthly only" }, { value: "yearly", label: "Yearly only" }]} /></div>
          <div className="flex flex-col gap-2"><span className={label}>How long it lasts</span><Select value={lasts} onChange={setLasts} options={[{ value: "1", label: "First payment only" }, { value: "0", label: "Every payment" }, { value: "n", label: "A number of payments…" }]} /></div>
        </div>
        {lasts === "n" && <div className="flex items-center gap-2"><label htmlFor="nd-n" className="text-sm">Discount applies to the first</label><input id="nd-n" type="number" min={2} value={count} onChange={(e) => setCount(e.target.value)} className={`${aInput} max-w-[100px]`} /><span className="text-sm">payments</span></div>}

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-2"><label htmlFor="nd-max" className={label}>Maximum uses</label><input id="nd-max" type="number" min={1} value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="No limit" className={aInput} /></div>
          <div className="flex flex-col gap-2"><span className={label}>Starts</span><DatePicker value={starts} onChange={setStarts} placeholder="Right away" /></div>
          <div className="flex flex-col gap-2"><span className={label}>Ends</span><DatePicker value={ends} onChange={setEnds} min={starts || undefined} placeholder="Never" /></div>
        </div>
        <p className="text-[13px] leading-relaxed text-[#5B6472]">Each customer workspace can use a code once. The value, plans and length can&apos;t be changed later, so create a new code if you need different terms. You can always disable a code.</p>

        {error && <p role="alert" className="rounded-lg bg-[#FBE7E5] px-3.5 py-2.5 text-sm text-[#B3261E]">{error}</p>}
        <div className="flex justify-end gap-2.5"><button type="button" onClick={() => d.ref.current?.close()} className={aBtn.secondary}>Cancel</button><button disabled={busy || !code} className={aBtn.primary}>{busy ? "Saving…" : "Create code"}</button></div>
      </form>
    </dialog>
  );
}

interface Redemption { ts: number; workspace_id: number; workspace: string | null; plan_id: string | null; cycle: string | null; amount_off: number; currency: string; renewal: boolean }

export function UsesDialog({ code, onClose }: { code: DiscountCode; onClose: () => void }) {
  const d = useDialog(onClose);
  const { data } = useSWR<{ redemptions: Redemption[] }>(`/api/admin/discounts/${code.id}/redemptions`, fetcher);
  return (
    <dialog {...d.props} aria-labelledby="ud-title" className={shell}>
      <div className="flex max-h-[calc(100vh-32px)] flex-col gap-4 overflow-y-auto p-6">
        <div className="flex items-start justify-between gap-3">
          <div><h2 id="ud-title" className="text-xl font-bold">Uses of <span className="font-mono">{code.code}</span></h2><p className="mt-0.5 text-[15px] text-[#5B6472]">{code.uses} {code.uses === 1 ? "customer has" : "customers have"} used it.</p></div>
          <button onClick={() => d.ref.current?.close()} aria-label="Close" className="-m-1 flex size-9 items-center justify-center rounded-lg text-[#5B6472] hover:bg-[#F3F4F6]"><X aria-hidden="true" size={18} /></button>
        </div>
        {!data && <p className="text-sm text-[#5B6472]">Loading…</p>}
        {data && data.redemptions.length === 0 && <p className="rounded-xl bg-[#F8F9FB] px-4 py-6 text-center text-sm text-[#5B6472]">Nobody has used this code yet.</p>}
        {data && data.redemptions.map((r, i) => (
          <div key={i} className="flex items-center justify-between gap-3 border-t border-[#EDEFF3] py-3 text-sm">
            <span className="min-w-0"><span className="block truncate font-semibold">{r.workspace ?? "Deleted workspace"}</span><span className="block text-[13px] text-[#5B6472]">{shortDate(r.ts)} · {r.plan_id} {r.cycle}{r.renewal ? " · renewal" : ""}</span></span>
            <span className="font-mono font-semibold">−{money(r.amount_off, r.currency)}</span>
          </div>
        ))}
        <div className="flex justify-end"><button onClick={() => d.ref.current?.close()} className={aBtn.secondary}>Close</button></div>
      </div>
    </dialog>
  );
}
