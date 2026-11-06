"use client";

import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useId, useRef, useState } from "react";
import { Popover } from "./popover";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

/** "2026-11-05" -> "5 Nov 2026", "2026-11" -> "Nov 2026". */
export function readableDate(v: string, mode: "date" | "month" = "date"): string {
  const [y, m, d] = v.split("-").map(Number);
  if (!y || !m) return "";
  const mon = MONTHS[m - 1].slice(0, 3);
  return mode === "month" ? `${mon} ${y}` : `${d} ${mon} ${y}`;
}

const trigger =
  "flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border border-[#c9cfd8] bg-surface px-3.5 text-left text-[15px] text-ink hover:border-[#9aa5b8] disabled:opacity-60";
const nav = "flex size-9 items-center justify-center rounded-lg text-ink-2 hover:bg-soft";

/**
 * Calendar picker that replaces the native date and month inputs. Values stay in the ISO
 * form the API already uses ("2026-11-05" or, in month mode, "2026-11") but are shown as
 * "5 Nov 2026" and "Nov 2026".
 */
export function DatePicker({ value, onChange, mode = "date", id, ariaLabel, placeholder, required, disabled, min, className = "" }: {
  value: string; onChange: (value: string) => void; mode?: "date" | "month"; id?: string; ariaLabel?: string;
  placeholder?: string; required?: boolean; disabled?: boolean; min?: string; className?: string;
}) {
  const now = new Date();
  const parsed = value.split("-").map(Number);
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(parsed[0] || now.getFullYear());
  const [month, setMonth] = useState(parsed[1] ? parsed[1] - 1 : now.getMonth());
  const [view, setView] = useState<"days" | "months">(mode === "month" ? "months" : "days");
  const btn = useRef<HTMLButtonElement>(null);
  const label = useId();
  const close = useCallback(() => setOpen(false), []);

  const show = () => {
    if (disabled) return;
    setYear(parsed[0] || now.getFullYear()); setMonth(parsed[1] ? parsed[1] - 1 : now.getMonth());
    setView(mode === "month" ? "months" : "days");
    setOpen(true);
  };
  const pick = (v: string) => { onChange(v); close(); btn.current?.focus(); };
  const step = (by: number) => {
    const d = new Date(year, month + by, 1);
    setYear(d.getFullYear()); setMonth(d.getMonth());
  };

  const first = (new Date(year, month, 1).getDay() + 6) % 7; // Monday first
  const length = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((first + length) / 7) * 7 }, (_, i) => i - first + 1);
  const today = iso(now.getFullYear(), now.getMonth(), now.getDate());

  const onGridKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const by = ({ ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 } as Record<string, number>)[e.key];
    if (!by) return;
    e.preventDefault();
    const cur = (document.activeElement as HTMLElement)?.dataset.day;
    if (!cur) return;
    const d = new Date(year, month, Number(cur) + by);
    setYear(d.getFullYear()); setMonth(d.getMonth());
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-day="${d.getDate()}"][data-in="1"]`)?.focus());
  };

  return (
    <div className={className}>
      <button
        ref={btn} id={id} type="button" disabled={disabled} aria-label={ariaLabel} aria-haspopup="dialog" aria-expanded={open}
        onClick={() => (open ? close() : show())} className={trigger}
      >
        <span className={`truncate ${value ? "" : "text-muted"}`}>{value ? readableDate(value, mode) : placeholder ?? (mode === "month" ? "Choose a month" : "Choose a date")}</span>
        <Calendar aria-hidden="true" size={16} className="shrink-0 text-muted" />
      </button>
      {open && (
        <Popover anchor={btn} onClose={close} minWidth={304} role="dialog" label={mode === "month" ? "Choose a month" : "Choose a date"} className="w-[304px] p-3">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" aria-label={view === "days" ? "Previous month" : "Previous year"} onClick={() => (view === "days" ? step(-1) : setYear(year - 1))} className={nav}><ChevronLeft aria-hidden="true" size={18} /></button>
            <button
              type="button" id={label} disabled={mode === "month"} onClick={() => setView(view === "days" ? "months" : "days")}
              className="min-h-9 rounded-lg px-3 text-sm font-semibold text-ink hover:bg-soft disabled:hover:bg-transparent"
            >
              {view === "days" ? `${MONTHS[month]} ${year}` : year}
            </button>
            <button type="button" aria-label={view === "days" ? "Next month" : "Next year"} onClick={() => (view === "days" ? step(1) : setYear(year + 1))} className={nav}><ChevronRight aria-hidden="true" size={18} /></button>
          </div>

          {view === "months" ? (
            <div className="grid grid-cols-3 gap-1.5">
              {MONTHS.map((m, i) => {
                const on = parsed[0] === year && parsed[1] === i + 1;
                return (
                  <button
                    key={m} type="button" aria-pressed={on}
                    onClick={() => (mode === "month" ? pick(`${year}-${pad(i + 1)}`) : (setMonth(i), setView("days")))}
                    className={`min-h-11 rounded-lg text-sm ${on ? "bg-brand font-semibold text-white" : "text-ink hover:bg-soft"}`}
                  >
                    {m.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          ) : (
            <div role="grid" aria-labelledby={label} onKeyDown={onGridKey}>
              <div className="mb-1 grid grid-cols-7 text-center text-xs font-medium text-muted">{DAYS.map((d) => <span key={d} className="py-1">{d}</span>)}</div>
              <div className="grid grid-cols-7 gap-y-0.5">
                {cells.map((n, i) => {
                  const inMonth = n >= 1 && n <= length;
                  if (!inMonth) return <span key={i} />;
                  const v = iso(year, month, n);
                  const on = v === value, isToday = v === today, blocked = !!min && v < min;
                  return (
                    <button
                      key={i} type="button" role="gridcell" data-day={n} data-in="1" disabled={blocked} aria-selected={on}
                      aria-label={readableDate(v)} tabIndex={on || (n === 1 && !(parsed[0] === year && parsed[1] === month + 1)) ? 0 : -1}
                      onClick={() => pick(v)}
                      className={`mx-auto flex size-10 items-center justify-center rounded-full text-sm disabled:opacity-35 ${on ? "bg-brand font-semibold text-white" : isToday ? "font-semibold text-brand ring-1 ring-brand/60 hover:bg-soft" : "text-ink hover:bg-soft"}`}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-2 flex items-center justify-between border-t border-line-soft pt-2">
            <button type="button" onClick={() => pick(mode === "month" ? today.slice(0, 7) : today)} className="min-h-9 rounded-lg px-3 text-sm font-semibold text-brand hover:bg-soft">{mode === "month" ? "This month" : "Today"}</button>
            {!required && value && <button type="button" onClick={() => pick("")} className="min-h-9 rounded-lg px-3 text-sm font-medium text-muted hover:bg-soft hover:text-ink">Clear</button>}
          </div>
        </Popover>
      )}
    </div>
  );
}
