"use client";

import { AlertTriangle, Bell, Check, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type Kind = "success" | "error" | "info" | "notification";
interface ToastItem { id: number; kind: Kind; title: string; text?: string }
interface ToastApi {
  success: (title: string, text?: string) => void;
  error: (title: string, text?: string) => void;
  info: (title: string, text?: string) => void;
  notify: (title: string, text?: string) => void;
}

const look: Record<Kind, { icon: typeof Check; chip: string }> = {
  success: { icon: Check, chip: "bg-ok-soft text-ok" },
  error: { icon: AlertTriangle, chip: "bg-bad-soft text-bad" },
  info: { icon: Info, chip: "bg-line-soft text-ink-2" },
  notification: { icon: Bell, chip: "bg-brand-soft text-brand" },
};

const ToastContext = createContext<ToastApi | null>(null);

/** Shows short success, error and notification messages in the corner of the screen. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const next = useRef(1);

  const dismiss = useCallback((id: number) => setItems((all) => all.filter((t) => t.id !== id)), []);
  const push = useCallback((kind: Kind, title: string, text?: string) => {
    const id = next.current++;
    setItems((all) => [...all.slice(-3), { id, kind, title, text }]);
  }, []);

  const api = useMemo<ToastApi>(() => ({
    success: (t, x) => push("success", t, x),
    error: (t, x) => push("error", t, x),
    info: (t, x) => push("info", t, x),
    notify: (t, x) => push("notification", t, x),
  }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[100] flex flex-col items-end gap-2.5 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[380px]">
        {items.map((t) => <ToastCard key={t.id} item={t} onClose={() => dismiss(t.id)} />)}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const { icon: Glyph, chip } = look[item.kind];
  const [paused, setPaused] = useState(false);
  const ms = item.kind === "error" ? 8000 : 5000;

  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(onClose, ms);
    return () => clearTimeout(timer);
  }, [paused, ms, onClose]);

  return (
    <div
      role={item.kind === "error" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
      className="toast-in pointer-events-auto flex w-full items-start gap-3 rounded-xl border border-line bg-surface p-3.5 shadow-[0_8px_30px_rgba(15,23,42,0.14)]"
    >
      <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${chip}`}><Glyph aria-hidden="true" size={16} /></span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-sm font-semibold leading-snug text-ink">{item.title}</p>
        {item.text && <p className="mt-0.5 text-[13px] leading-snug text-muted">{item.text}</p>}
      </div>
      <button type="button" onClick={onClose} aria-label="Dismiss message" className="-m-1 flex size-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-soft hover:text-ink">
        <X aria-hidden="true" size={16} />
      </button>
    </div>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

/** For code that reports results as { ok, text }: shows each one as a success or error toast. Null does nothing. */
export function useNoteToast() {
  const toast = useToast();
  return useCallback((n: { ok: boolean; text: string } | null) => {
    if (n) (n.ok ? toast.success : toast.error)(n.text);
  }, [toast]);
}
