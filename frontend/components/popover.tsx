"use client";

import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

/**
 * A floating panel anchored under a trigger. It is rendered in the page body (or in the modal dialog that holds the trigger) so cards with
 * overflow hidden cannot clip it, flips above the trigger when there is no room below, and
 * follows the trigger on scroll, and closes on Escape, on an outside click, and on resize.
 */
export function Popover({ anchor, onClose, children, minWidth, className = "", role, id, label }: {
  anchor: RefObject<HTMLElement | null>; onClose: () => void; children: ReactNode; minWidth?: number;
  className?: string; role?: string; id?: string; label?: string;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; up: boolean } | null>(null);

  useLayoutEffect(() => {
    const place = () => {
      const a = anchor.current, p = panel.current;
      if (!a || !p) return;
      const r = a.getBoundingClientRect();
      const width = Math.max(r.width, minWidth ?? 0);
      const height = p.offsetHeight;
      const up = window.innerHeight - r.bottom < height + 12 && r.top > height + 12;
      const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
      setPos({ top: up ? r.top - height - 6 : r.bottom + 6, left, width, up });
    };
    place();
    // follow the trigger while the page scrolls; give up once it has scrolled out of view
    const follow = (e: Event) => {
      if (panel.current?.contains(e.target as Node)) return;
      const r = anchor.current?.getBoundingClientRect();
      if (!r || r.bottom < 0 || r.top > window.innerHeight) onClose(); else place();
    };
    const down = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!panel.current?.contains(t) && !anchor.current?.contains(t)) onClose();
    };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(); anchor.current?.focus(); } };
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    window.addEventListener("scroll", follow, true);
    window.addEventListener("resize", onClose);
    return () => {
      document.removeEventListener("mousedown", down);
      document.removeEventListener("keydown", key);
      window.removeEventListener("scroll", follow, true);
      window.removeEventListener("resize", onClose);
    };
  }, [anchor, onClose, minWidth]);

  return createPortal(
    <div
      ref={panel} id={id} role={role} aria-label={label}
      style={{ position: "fixed", top: pos?.top ?? 0, left: pos?.left ?? 0, minWidth: pos?.width, visibility: pos ? "visible" : "hidden" }}
      className={`pop-in z-[90] rounded-xl border border-line bg-surface shadow-[0_12px_40px_rgba(15,23,42,0.16)] ${className}`}
    >
      {children}
    </div>,
    // inside a modal dialog everything outside it is inert, so the panel has to live in the dialog too
    anchor.current?.closest("dialog") ?? document.body,
  );
}
