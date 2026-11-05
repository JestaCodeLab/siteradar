"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export const tones = {
  ok: "bg-[#E3F4EC] text-[#0B7A4B]", warn: "bg-[#FFF1D6] text-[#8A5A00]", bad: "bg-[#FBE7E5] text-[#B3261E]",
  muted: "bg-[#E8EBF0] text-[#3F4857]", purple: "bg-[#EFEAFF] text-[#4A33B0]", blue: "bg-[#E5ECFF] text-[#1F4FD8]",
} as const;
export type Tone = keyof typeof tones;

const AVATARS = ["#1F4FD8", "#4A33B0", "#8A5A00", "#0B7A4B", "#5B6472", "#0F1420", "#B3261E", "#2B1C77"];
export const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
export const avatarColor = (name: string) => AVATARS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATARS.length];

export function Avatar({ name, size = 36, round = false }: { name: string; size?: number; round?: boolean }) {
  return (
    <span aria-hidden="true" style={{ width: size, height: size, flex: `0 0 ${size}px`, background: avatarColor(name), fontSize: size > 40 ? 18 : 12 }}
      className={`flex items-center justify-center font-semibold text-white ${round ? "rounded-full" : size > 40 ? "rounded-[14px]" : "rounded-[9px]"}`}>{initials(name)}</span>
  );
}

export function Pill({ tone = "purple", children, className = "" }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-[3px] text-xs font-semibold ${tones[tone]} ${className}`}>{children}</span>;
}

export const statusTone = (s: string): Tone => (s === "Past due" || s === "Lapsed" ? "bad" : s === "Suspended" ? "muted" : s === "Free" ? "purple" : "ok");

export function AdminCard({ children, className = "", label }: { children: ReactNode; className?: string; label?: string }) {
  return <section aria-label={label} className={`rounded-[14px] border border-[#E2E5EA] bg-white p-[22px] ${className}`}>{children}</section>;
}

export function AdminHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 max-w-[820px] flex-col gap-1.5">
        <h1 className="text-[30px] font-semibold leading-tight">{title}</h1>
        {subtitle && <p className="text-[15px] text-[#5B6472]">{subtitle}</p>}
      </div>
      {actions}
    </header>
  );
}

export const aBtn = {
  primary: "inline-flex min-h-11 items-center justify-center rounded-lg bg-[#6B4FE0] px-[18px] text-sm font-semibold text-white hover:bg-[#5B3FD1] disabled:opacity-60",
  secondary: "inline-flex min-h-11 items-center justify-center rounded-lg border border-[#C9CFD8] bg-white px-[18px] text-sm font-semibold hover:bg-[#F8F9FB] disabled:opacity-60",
  danger: "inline-flex min-h-11 items-center justify-center rounded-lg border border-[#C9CFD8] bg-white px-[18px] text-sm font-semibold text-[#B3261E] hover:bg-[#FBE7E5] disabled:opacity-60",
  small: "inline-flex min-h-11 items-center justify-center rounded-lg border border-[#C9CFD8] bg-white px-3.5 text-[13px] font-semibold hover:bg-[#F8F9FB] disabled:opacity-60",
};
export const aInput = "min-h-11 w-full rounded-lg border border-[#C9CFD8] bg-white px-3 text-[15px] focus-visible:!outline-[#6B4FE0]";
export const aSelect = "min-h-10 rounded-lg border border-[#C9CFD8] bg-white px-3 text-sm";

export function TableHead({ cols, template, children }: { cols?: string[]; template: string; children?: ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: template }} className="items-center gap-4 border-b border-[#E2E5EA] bg-[#F8F9FB] px-5 py-3 text-xs font-semibold uppercase tracking-[0.04em] text-[#5B6472]">
      {cols?.map((c) => <span key={c}>{c}</span>)}{children}
    </div>
  );
}

export function Tabs<T extends string>({ items, value, onChange }: { items: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="tablist" className="flex flex-wrap gap-1.5">
      {items.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
          className={`min-h-10 rounded-lg px-3.5 text-sm ${value === t.id ? "bg-[#EFEAFF] font-semibold text-[#4A33B0]" : "font-medium text-[#5B6472] hover:bg-[#F8F9FB]"}`}>{t.label}</button>
      ))}
    </div>
  );
}

export const money = (n: number) => `GHS ${n.toLocaleString("en-GH", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
export const shortDate = (ts: number | null | undefined) => (ts ? new Date(ts * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");
export function whenAgo(ts: number) {
  const s = Date.now() / 1000 - ts;
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} hours ago`;
  if (s < 172800) return "Yesterday";
  if (s < 86400 * 7) return `${Math.round(s / 86400)} days ago`;
  return shortDate(ts);
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="font-medium text-[#4A33B0]">{children}</Link>;
}

/** Downloads a CSV the API builds (the login cookie goes with the request). */
export async function downloadCsv(path: string, name: string) {
  const res = await fetch(path, { credentials: "same-origin" });
  if (!res.ok) return;
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a"); a.href = url; a.download = `${name}.csv`; a.click();
  URL.revokeObjectURL(url);
}

/** Empty state: an icon, what is missing, and what to do or expect. */
export function EmptyState({ Icon, title, text, compact = false }: { Icon: LucideIcon; title: string; text: string; compact?: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-2 px-6 text-center ${compact ? "py-8" : "py-12"}`}>
      <span className="flex size-12 items-center justify-center rounded-full bg-[#EFEAFF] text-[#4A33B0]"><Icon size={22} aria-hidden="true" /></span>
      <p className="text-base font-semibold">{title}</p>
      <p className="max-w-sm text-sm leading-relaxed text-[#5B6472]">{text}</p>
    </div>
  );
}
