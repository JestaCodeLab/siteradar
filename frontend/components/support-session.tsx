"use client";

import { ChevronDown, Headphones, LogOut, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Popover } from "./popover";
import { send } from "@/lib/api";
import { useMe } from "@/lib/me";

const SESSION_SECONDS = 30 * 60;            // a support session lasts 30 minutes (SUPPORT_MINUTES on the server)
const mmss = (sec: number) => `${Math.floor(Math.max(0, sec) / 60)}:${String(Math.floor(Math.max(0, sec) % 60)).padStart(2, "0")}`;

/** Indigo for a view-only session, amber for full access, so a risky session is hard to miss. */
const TONE = {
  view: { solid: "#4F46E5", soft: "#EEF2FF", border: "#C7D2FE", ink: "#3730A3", track: "#E0E7FF" },
  edit: { solid: "#B45309", soft: "#FEF3C7", border: "#FCD34D", ink: "#78350F", track: "#FDE68A" },
};

function useSupport() {
  const router = useRouter();
  const { me, ws, user, mutate } = useMe();
  const support = me?.support ?? null;
  const [now, setNow] = useState(0);
  useEffect(() => {
    const tick = () => setNow(Date.now() / 1000);
    const t = setInterval(tick, 1000); const first = setTimeout(tick, 0);
    return () => { clearInterval(t); clearTimeout(first); };
  }, []);
  const left = support && now ? support.until - now : null;
  const exit = useCallback(async () => { await send("POST", "/api/admin/support/stop").catch(() => {}); await mutate(); router.replace("/admin"); }, [mutate, router]);
  const toggleMode = useCallback(async () => {
    if (!support) return;
    await send("POST", "/api/admin/support/mode", { mode: support.mode === "edit" ? "view" : "edit" }); await mutate();
  }, [support, mutate]);
  return { support, ws, user, left, exit, toggleMode, tone: TONE[support?.mode ?? "view"], full: support?.mode === "edit" };
}

/** A frame around the whole screen, so it is always clear this is the support view and not the customer's own screen. Also ends the session when time runs out. */
export function SupportFrame() {
  const { support, left, exit, tone, full } = useSupport();
  useEffect(() => { if (support && left !== null && left <= 0) void exit(); }, [support, left, exit]);
  if (!support) return null;
  return (
    <>
      <div aria-hidden="true" style={{ borderColor: tone.solid }} className="pointer-events-none fixed inset-0 z-[70] border-4" />
      <span aria-hidden="true" style={{ background: tone.solid }} className="pointer-events-none fixed left-1/2 top-0 z-[71] hidden -translate-x-1/2 rounded-b-lg px-3 pb-1 pt-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-white sm:block">
        Support view · {full ? "full access · " : ""}not the customer&apos;s screen
      </span>
    </>
  );
}

/** The support session in the top bar: a pill with the time left that opens the details, and an Exit button next to it. */
export function SupportPill() {
  const { support, ws, user, left, exit, toggleMode, tone, full } = useSupport();
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);
  if (!support) return null;
  const pct = left === null ? 100 : Math.max(0, Math.min(100, (left / SESSION_SECONDS) * 100));
  const agent = user ? `${user.first_name} ${user.last_name}`.trim() : "Support";

  return (
    <div className="flex items-center gap-2">
      <button
        ref={anchor} type="button" aria-expanded={open} aria-controls="support-panel" onClick={() => setOpen((o) => !o)}
        style={{ background: tone.soft, borderColor: tone.border, color: tone.ink }}
        className="flex min-h-9 items-center gap-2 rounded-full border py-1 pl-3 pr-2.5 text-sm"
      >
        <Headphones aria-hidden="true" size={18} style={{ color: tone.solid }} />
        <span className="hidden font-bold sm:inline">Support session</span>
        <span style={{ background: tone.solid }} className="rounded-full px-2 py-0.5 text-xs font-bold text-white">{full ? "Full access" : "View only"}</span>
        <span className="font-mono text-[13px] font-semibold" role="timer">{left === null ? "…" : mmss(left)}</span>
        <ChevronDown aria-hidden="true" size={16} className={open ? "rotate-180" : ""} />
      </button>
      <button type="button" onClick={exit} className="flex min-h-9 items-center gap-1.5 rounded-full bg-[#0F172A] px-3.5 text-sm font-bold text-white hover:bg-[#1E293B]">
        <LogOut aria-hidden="true" size={16} />Exit
      </button>

      {open && (
        <Popover anchor={anchor} onClose={close} minWidth={380} role="dialog" label="Support session details" id="support-panel" className="w-[min(400px,calc(100vw-24px))] overflow-hidden !border-[#C7D2FE]">
          <div style={{ background: tone.solid }} className="flex items-start justify-between gap-3 px-[18px] py-4 text-white">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold uppercase tracking-[0.08em] text-white/75">Support session</span>
              <span className="text-[17px] font-bold">Viewing {ws?.name ?? "this workspace"}</span>
            </div>
            <button type="button" onClick={close} aria-label="Close" className="-m-1 flex size-8 items-center justify-center rounded-lg hover:bg-white/15"><X aria-hidden="true" size={16} /></button>
          </div>
          <div className="flex flex-col gap-3 px-[18px] py-4 text-sm">
            <Row k="Support agent" v={agent} />
            <Row k="Viewing as" v={ws?.owner_name ?? "the owner"} />
            <Row k="Access" v={full ? "Full access" : "View only"} />
            <div className="flex flex-col gap-1"><span className="text-muted">Reason</span><span className="rounded-lg border border-line bg-soft px-2.5 py-2 font-semibold">{support.reason}</span></div>
            <Row k="Customer notified" v="No" />
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between"><span className="text-muted">Time left</span><span className="font-mono font-semibold">{left === null ? "…" : mmss(left)}</span></div>
              <div style={{ background: tone.track }} className="h-1.5 rounded-full"><div style={{ width: `${pct}%`, background: tone.solid }} className="h-1.5 rounded-full transition-[width] duration-1000 ease-linear" /></div>
            </div>
          </div>
          <div className="flex gap-2.5 border-t border-line-soft px-[18px] pb-[18px] pt-3.5">
            <button type="button" onClick={toggleMode} style={{ borderColor: tone.solid, color: tone.ink }} className="min-h-11 flex-1 rounded-[10px] border-[1.5px] bg-surface text-sm font-bold hover:bg-soft">{full ? "Back to view only" : "Switch to full access"}</button>
            <button type="button" onClick={exit} className="min-h-11 flex-1 rounded-[10px] bg-[#0F172A] text-sm font-bold text-white hover:bg-[#1E293B]">Exit session</button>
          </div>
        </Popover>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-3"><span className="text-muted">{k}</span><span className="text-right font-semibold">{v}</span></div>;
}
