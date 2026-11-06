"use client";

import { Clock } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Popover } from "./popover";

const pad = (n: number) => String(n).padStart(2, "0");

/** "14:30" -> "2:30 PM". */
export function readableTime(v: string): string {
  const [h, m] = v.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return "";
  return `${h % 12 || 12}:${pad(m)} ${h < 12 ? "AM" : "PM"}`;
}

const trigger =
  "flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border border-[#c9cfd8] bg-surface px-3.5 text-left text-[15px] text-ink hover:border-[#9aa5b8] disabled:opacity-60";
const cell = (on: boolean) =>
  `flex min-h-10 w-full items-center justify-center rounded-lg text-sm ${on ? "bg-brand font-semibold text-white" : "text-ink hover:bg-soft"}`;

/** Time picker that replaces the native time input. Values stay 24-hour ("14:30") and are shown as "2:30 PM". */
export function TimePicker({ value, onChange, step = 5, id, ariaLabel, placeholder = "Choose a time", disabled, className = "" }: {
  value: string; onChange: (value: string) => void; step?: number; id?: string; ariaLabel?: string; placeholder?: string;
  disabled?: boolean; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);

  const [h24, min] = value ? value.split(":").map(Number) : [NaN, NaN];
  const has = !Number.isNaN(h24);
  const hour12 = has ? h24 % 12 || 12 : 0;
  const pm = has ? h24 >= 12 : false;

  const set = (h12: number, m: number, isPm: boolean) => onChange(`${pad((h12 % 12) + (isPm ? 12 : 0))}:${pad(m)}`);
  const minutes = Array.from({ length: Math.ceil(60 / step) }, (_, i) => i * step);
  // snap an odd stored minute onto the list so the column never shows nothing selected
  const snapped = has ? minutes.reduce((a, b) => (Math.abs(b - min) < Math.abs(a - min) ? b : a), 0) : -1;

  return (
    <div className={className}>
      <button
        ref={btn} id={id} type="button" disabled={disabled} aria-label={ariaLabel} aria-haspopup="dialog" aria-expanded={open}
        onClick={() => (open ? close() : !disabled && setOpen(true))} className={trigger}
      >
        <span className={`truncate ${value ? "" : "text-muted"}`}>{value ? readableTime(value) : placeholder}</span>
        <Clock aria-hidden="true" size={16} className="shrink-0 text-muted" />
      </button>
      {open && (
        <Popover anchor={btn} onClose={close} minWidth={240} role="dialog" label="Choose a time" className="w-[240px] p-3">
          <div className="grid grid-cols-3 gap-2">
            <div role="listbox" aria-label="Hour" className="flex max-h-56 flex-col gap-0.5 overflow-y-auto pr-0.5">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                <button key={h} type="button" role="option" aria-selected={h === hour12} ref={(el) => { if (el && h === hour12) el.scrollIntoView({ block: "nearest" }); }}
                  onClick={() => set(h, has ? snapped : 0, pm)} className={cell(h === hour12)}>{h}</button>
              ))}
            </div>
            <div role="listbox" aria-label="Minute" className="flex max-h-56 flex-col gap-0.5 overflow-y-auto pr-0.5">
              {minutes.map((m) => (
                <button key={m} type="button" role="option" aria-selected={m === snapped} ref={(el) => { if (el && m === snapped) el.scrollIntoView({ block: "nearest" }); }}
                  onClick={() => set(has ? hour12 : 12, m, pm)} className={cell(m === snapped)}>{pad(m)}</button>
              ))}
            </div>
            <div role="listbox" aria-label="AM or PM" className="flex flex-col gap-0.5">
              {(["AM", "PM"] as const).map((p) => (
                <button key={p} type="button" role="option" aria-selected={has && pm === (p === "PM")}
                  onClick={() => set(has ? hour12 : 12, has ? snapped : 0, p === "PM")} className={cell(has && pm === (p === "PM"))}>{p}</button>
              ))}
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-line-soft pt-2">
            <button type="button" onClick={() => { const d = new Date(); onChange(`${pad(d.getHours())}:${pad(d.getMinutes() - (d.getMinutes() % step))}`); }} className="min-h-9 rounded-lg px-3 text-sm font-semibold text-brand hover:bg-soft">Now</button>
            <button type="button" onClick={close} className="min-h-9 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover">Done</button>
          </div>
        </Popover>
      )}
    </div>
  );
}
