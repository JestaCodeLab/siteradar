"use client";

import { Check, ChevronDown, Lock, Search } from "lucide-react";
import { useCallback, useId, useRef, useState } from "react";
import { Popover } from "./popover";

export interface Option { value: string; label: string; hint?: string; /** Shown but not choosable; badge says why, e.g. a plan name. */ locked?: string }

const trigger =
  "flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border border-[#c9cfd8] bg-surface px-3.5 text-left text-[15px] text-ink hover:border-[#9aa5b8] disabled:opacity-60";

/**
 * A dropdown that replaces the native select. Use it controlled (value + onChange) or inside a
 * plain form (name + defaultValue), where it writes its choice to a hidden field.
 */
export function Select({ options, value, defaultValue, onChange, name, id, ariaLabel, placeholder = "Select…", searchable, disabled, className = "", compact }: {
  options: Option[]; value?: string; defaultValue?: string; onChange?: (value: string) => void; name?: string; id?: string;
  ariaLabel?: string; placeholder?: string; searchable?: boolean; disabled?: boolean; className?: string; compact?: boolean;
}) {
  const [inner, setInner] = useState(defaultValue ?? "");
  const current = value ?? inner;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const btn = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const typed = useRef({ text: "", at: 0 });

  const shown = searchable && q ? options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase())) : options;
  const selected = options.find((o) => o.value === current);
  const close = useCallback(() => { setOpen(false); setQ(""); }, []);

  const openList = () => {
    if (disabled) return;
    setActive(Math.max(0, options.findIndex((o) => o.value === current)));
    setOpen(true);
  };
  const choose = (o: Option) => {
    if (o.locked) return;
    setInner(o.value); onChange?.(o.value); close(); btn.current?.focus();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) { e.preventDefault(); openList(); }
      return;
    }
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(shown.length - 1, i + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
    else if (e.key === "Home") { e.preventDefault(); setActive(0); }
    else if (e.key === "End") { e.preventDefault(); setActive(shown.length - 1); }
    else if (e.key === "Enter" || (e.key === " " && !searchable)) { e.preventDefault(); if (shown[active]) choose(shown[active]); }
    else if (e.key === "Tab") close();
    else if (!searchable && e.key.length === 1) {
      const now = Date.now();
      typed.current = { text: (now - typed.current.at < 700 ? typed.current.text : "") + e.key.toLowerCase(), at: now };
      const hit = shown.findIndex((o) => o.label.toLowerCase().startsWith(typed.current.text));
      if (hit >= 0) setActive(hit);
    }
  };

  return (
    <div className={className}>
      {name && <input type="hidden" name={name} value={current} />}
      <button
        ref={btn} id={id} type="button" disabled={disabled} aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open}
        aria-controls={open ? listId : undefined} onClick={() => (open ? close() : openList())} onKeyDown={onKey}
        className={`${trigger} ${compact ? "!min-h-10 text-sm" : ""}`}
      >
        <span className={`truncate ${selected ? "" : "text-muted"}`}>{selected?.label ?? placeholder}</span>
        <ChevronDown aria-hidden="true" size={16} className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <Popover anchor={btn} onClose={close} minWidth={compact ? 180 : undefined} className="overflow-hidden">
          {searchable && (
            <div className="flex items-center gap-2 border-b border-line-soft px-3">
              <Search aria-hidden="true" size={15} className="shrink-0 text-muted" />
              <input
                autoFocus value={q} onChange={(e) => { setQ(e.target.value); setActive(0); }} onKeyDown={onKey}
                aria-label="Search options" placeholder="Search" className="min-h-12 w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
              />
            </div>
          )}
          <ul id={listId} role="listbox" aria-label={ariaLabel} className="flex max-h-72 flex-col gap-1 overflow-y-auto p-2">
            {shown.length === 0 && <li className="px-3 py-3 text-sm text-muted">Nothing matches.</li>}
            {shown.map((o, i) => (
              <li
                key={o.value} role="option" aria-selected={o.value === current}
                ref={(el) => { if (el && i === active) el.scrollIntoView({ block: "nearest" }); }}
                onMouseEnter={() => setActive(i)} onMouseDown={(e) => e.preventDefault()} onClick={() => choose(o)}
                aria-disabled={o.locked ? true : undefined}
                className={`flex shrink-0 items-center justify-between gap-3 rounded-lg px-3.5 text-sm ${o.hint ? "min-h-[52px] py-2" : "min-h-11 py-2"} ${o.locked ? "cursor-not-allowed text-muted" : "cursor-pointer"} ${i === active ? "bg-soft" : ""} ${o.value === current ? "font-semibold text-ink" : o.locked ? "" : "text-ink-2"}`}
              >
                <span className="min-w-0"><span className="block truncate leading-snug">{o.label}</span>{o.hint && <span className="mt-0.5 block truncate text-xs font-normal leading-snug text-muted">{o.hint}</span>}</span>
                {o.locked ? <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-line-soft px-2 py-0.5 text-xs font-semibold text-ink-2"><Lock aria-hidden="true" size={11} />{o.locked}</span>
                  : o.value === current && <Check aria-hidden="true" size={16} className="shrink-0 text-brand" />}
              </li>
            ))}
          </ul>
        </Popover>
      )}
    </div>
  );
}

/** Turns a list of plain strings into options. */
export const opts = (labels: readonly string[]): Option[] => labels.map((l) => ({ value: l, label: l }));
