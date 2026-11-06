"use client";

import { LogOut } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { btn } from "./ui";
import { send } from "@/lib/api";

/**
 * Asks before signing out. Use it where a person clicks "Log out":
 *   const { ask, dialog } = useLogoutConfirm(async () => { await mutate(); router.replace("/login"); });
 * Call ask() from the button and render {dialog} anywhere in the component. `after` runs once the server has ended the session.
 * (The automatic sign-out when a session runs out does not ask; it is not the person's choice.)
 */
export function useLogoutConfirm(after: () => void | Promise<void>): { ask: () => void; dialog: ReactNode } {
  const [open, setOpen] = useState(false);
  const ask = useCallback(() => setOpen(true), []);
  const dialog = open ? <LogoutDialog onClose={() => setOpen(false)} after={after} /> : null;
  return { ask, dialog };
}

function LogoutDialog({ onClose, after }: { onClose: () => void; after: () => void | Promise<void> }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { ref.current?.showModal(); }, []);

  async function confirm() {
    setBusy(true);
    await send("POST", "/api/auth/logout").catch(() => {});
    try { await after(); } finally { onClose(); }
  }

  return (
    <dialog
      ref={ref} aria-labelledby="lo-title" aria-describedby="lo-text" onClose={onClose}
      onClick={(e) => { if (e.target === ref.current && !busy) ref.current?.close(); }}      // a click on the dimmed backdrop cancels
      className="m-auto w-[min(420px,calc(100vw-32px))] rounded-2xl border border-line bg-surface p-0 text-ink shadow-[0_24px_80px_rgba(15,23,42,0.28)] backdrop:bg-[#0F172A]/60"
    >
      <div className="flex flex-col gap-5 p-6">
        <div className="flex items-start gap-3.5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-bad-soft text-bad"><LogOut aria-hidden="true" size={22} /></span>
          <div className="min-w-0">
            <h2 id="lo-title" className="text-xl font-bold">Log out of SiteRadar?</h2>
            <p id="lo-text" className="mt-1 text-[15px] text-muted">You will need to sign in again to see your websites and reports. Your monitoring keeps running while you are away.</p>
          </div>
        </div>
        <div className="flex justify-end gap-2.5">
          <button type="button" autoFocus disabled={busy} onClick={() => ref.current?.close()} className={btn.secondary}>Stay logged in</button>
          <button type="button" disabled={busy} onClick={confirm} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-bad px-5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">{busy ? "Logging out…" : "Log out"}</button>
        </div>
      </div>
    </dialog>
  );
}
