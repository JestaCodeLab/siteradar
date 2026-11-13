"use client";

import { Info } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

// A small "i" button that explains a card. Opens on hover, focus or tap; closes on Escape or outside tap.
export function InfoTip({ label, text, compact = false }: { label: string; text: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  // The note is placed against the screen, not against the icon's container, so a table or card that scrolls or clips its contents cannot cut it off.
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const ref = useRef<HTMLSpanElement>(null);
  const id = useId();

  const show = useCallback(() => {
    const r = ref.current?.getBoundingClientRect();
    if (r) {
      const width = Math.min(256, window.innerWidth * 0.78);
      const left = Math.min(Math.max(r.left + r.width / 2 - width / 2, 12), window.innerWidth - width - 12);
      setPos({ top: r.bottom + 8, left, width });
    }
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const away = () => setOpen(false);
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    window.addEventListener("scroll", away, true);
    window.addEventListener("resize", away);
    return () => { document.removeEventListener("mousedown", down); document.removeEventListener("keydown", key); window.removeEventListener("scroll", away, true); window.removeEventListener("resize", away); };
  }, [open]);

  return (
    <span ref={ref} className="relative inline-flex" onMouseEnter={show} onMouseLeave={() => setOpen(false)}>
      <button type="button" aria-label={`About ${label}`} aria-describedby={open ? id : undefined} aria-expanded={open}
        onClick={() => (open ? setOpen(false) : show())} onFocus={show} onBlur={() => setOpen(false)}
        className={`relative inline-flex items-center justify-center rounded-full ${compact ? "text-muted/55" : "text-muted"} before:absolute before:-inset-3 before:content-[''] hover:text-brand ${compact ? "size-4" : "size-5"}`}>
        <Info size={compact ? 13 : 15} aria-hidden="true" />
      </button>
      {open && pos && (
        <span role="tooltip" id={id} style={{ top: pos.top, left: pos.left, width: pos.width }}
          className="fixed z-[90] rounded-lg bg-nav px-3 py-2.5 text-left text-xs font-normal leading-relaxed text-white shadow-lg">
          {text}
        </span>
      )}
    </span>
  );
}
