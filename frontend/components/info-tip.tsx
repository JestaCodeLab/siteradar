"use client";

import { Info } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

// A small "i" button that explains a card. Opens on hover, focus or tap; closes on Escape or outside tap.
export function InfoTip({ label, text, compact = false }: { label: string; text: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const id = useId();

  const show = useCallback(() => {
    const r = ref.current?.getBoundingClientRect();
    // the icon usually sits at the right edge of a card, so open the note leftwards unless that would leave the screen
    if (r) setAlignRight(r.right - 272 >= 12);
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", down); document.removeEventListener("keydown", key); };
  }, [open]);

  return (
    <span ref={ref} className="relative inline-flex" onMouseEnter={show} onMouseLeave={() => setOpen(false)}>
      <button type="button" aria-label={`About ${label}`} aria-describedby={open ? id : undefined} aria-expanded={open}
        onClick={() => (open ? setOpen(false) : show())} onFocus={show} onBlur={() => setOpen(false)}
        className={`relative inline-flex items-center justify-center rounded-full ${compact ? "text-muted/55" : "text-muted"} before:absolute before:-inset-3 before:content-[''] hover:text-brand ${compact ? "size-4" : "size-5"}`}>
        <Info size={compact ? 13 : 15} aria-hidden="true" />
      </button>
      {open && (
        <span role="tooltip" id={id}
          className={`absolute top-6 z-40 w-64 max-w-[78vw] rounded-lg bg-nav px-3 py-2.5 text-left text-xs font-normal leading-relaxed text-white shadow-lg ${alignRight ? "right-0" : "left-0"}`}>
          {text}
        </span>
      )}
    </span>
  );
}
