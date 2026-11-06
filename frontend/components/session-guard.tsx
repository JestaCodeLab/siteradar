"use client";

import { Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { btn } from "./ui";
import { send } from "@/lib/api";
import { useMe } from "@/lib/me";

const WARN_AT = 5 * 60;          // seconds left when the prompt appears

const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

/**
 * Signed-in sessions last an hour. Five minutes before the end this asks whether to stay logged in,
 * and when the time is up it signs the person out. The server enforces the same deadline.
 */
export function SessionGuard() {
  const router = useRouter();
  const { me, mutate } = useMe();
  const dialog = useRef<HTMLDialogElement>(null);
  const deadline = useRef<number | null>(null);
  const [left, setLeft] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  // the server says how long is left each time the profile loads; count down from there
  useEffect(() => {
    deadline.current = me?.authenticated && me.session_seconds_left != null ? Date.now() + me.session_seconds_left * 1000 : null;
  }, [me]);

  useEffect(() => {
    async function tick() {
      if (deadline.current == null) { setLeft(null); return; }
      const remaining = Math.ceil((deadline.current - Date.now()) / 1000);
      if (remaining <= 0) {
        deadline.current = null; setLeft(null);
        try { sessionStorage.setItem("sitewatch.expired", "1"); } catch { /* the message is optional */ }
        await send("POST", "/api/auth/logout").catch(() => {});
        await mutate();
        router.replace("/login?expired=1");
        return;
      }
      setLeft(remaining);
    }
    const t = setInterval(tick, 1000);
    const first = setTimeout(tick, 0);
    return () => { clearInterval(t); clearTimeout(first); };
  }, [mutate, router]);

  const show = left != null && left <= WARN_AT;
  useEffect(() => {
    const d = dialog.current;
    if (show && d && !d.open) d.showModal();
    if (!show && d?.open) d.close();
  }, [show]);

  async function stay() {
    setBusy(true);
    try {
      const r = await send<{ session_seconds_left: number }>("POST", "/api/auth/extend");
      deadline.current = Date.now() + r.session_seconds_left * 1000;      // set it here: the profile can come back unchanged
      setLeft(r.session_seconds_left);
      await mutate();
    } catch { /* the countdown carries on and signs out if this keeps failing */ }
    setBusy(false);
  }
  async function leave() {
    setBusy(true);
    await send("POST", "/api/auth/logout").catch(() => {});
    await mutate();
    router.replace("/login");
  }

  if (!show) return null;
  return (
    <dialog
      ref={dialog} aria-labelledby="sg-title" aria-describedby="sg-text" onCancel={(e) => e.preventDefault()}
      className="m-auto w-[min(440px,calc(100vw-32px))] rounded-2xl border border-line bg-surface p-0 text-ink shadow-[0_24px_80px_rgba(15,23,42,0.28)] backdrop:bg-[#0F172A]/60"
    >
      <div className="flex flex-col items-center gap-3 p-7 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-brand-soft text-brand"><Clock aria-hidden="true" size={26} /></span>
        <h2 id="sg-title" className="text-xl font-bold">Are you still there?</h2>
        <p id="sg-text" className="text-[15px] text-muted">For your security you will be logged out in <b className="font-mono text-ink" role="timer">{mmss(left ?? 0)}</b>. Do you want to stay logged in?</p>
        <div className="mt-2 flex w-full flex-col-reverse gap-2.5 sm:flex-row">
          <button type="button" disabled={busy} onClick={leave} className={`${btn.secondary} flex-1`}>Log out</button>
          <button type="button" disabled={busy} onClick={stay} autoFocus className={`${btn.primary} flex-1`}>{busy ? "Please wait…" : "Stay logged in"}</button>
        </div>
      </div>
    </dialog>
  );
}
