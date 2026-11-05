import Link from "next/link";
import {
  Activity, Bell, Check, ChevronDown, ChevronRight, Clock, CreditCard, FileText, Globe, LayoutGrid, LogOut, Menu, Plus, Receipt, Search,
  Settings, Shield, Upload, User, Users, type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { InfoTip } from "./info-tip";
import type { SiteStatus, SubStatus } from "@/lib/api";

export const btn = {
  primary:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-ink disabled:opacity-60",
  secondary:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#c9cfd8] bg-surface px-4 text-sm font-semibold text-ink hover:bg-soft disabled:opacity-60",
  danger:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#c9cfd8] bg-surface px-4 text-sm font-semibold text-bad hover:bg-bad-soft disabled:opacity-60",
};

export const input =
  "min-h-11 w-full rounded-lg border border-[#c9cfd8] bg-surface px-3.5 text-[15px] text-ink placeholder:text-muted";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-line bg-surface ${className}`}>{children}</section>;
}

export function CardTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-lg font-semibold">{children}</h2>
      {aside && <div className="text-sm text-muted">{aside}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1.5">
        <h1 className="text-[30px] font-semibold leading-tight">{title}</h1>
        {subtitle && <p className="text-[15px] text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2.5">{actions}</div>}
    </header>
  );
}

export function Tile({ label, value, note, tone = "muted", icon: Glyph, info }: {
  label: string; value: ReactNode; note?: ReactNode; tone?: "muted" | "ok" | "warn" | "bad"; icon?: LucideIcon; info?: string;
}) {
  const toneClass = { muted: "text-muted", ok: "text-ok font-medium", warn: "text-warn font-medium", bad: "text-bad font-medium" }[tone];
  const chip = { muted: "bg-brand-soft text-brand", ok: "bg-ok-soft text-ok", warn: "bg-warn-soft text-warn", bad: "bg-bad-soft text-bad" }[tone];
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-5">
      {Glyph && <span className={`mb-1 flex size-9 shrink-0 items-center justify-center rounded-lg ${chip}`}><Glyph aria-hidden="true" size={18} /></span>}
      <div className="flex items-start justify-between gap-2">
        <span className="text-[13px] leading-snug text-muted">{label}</span>
        {info && <InfoTip label={label} text={info} />}
      </div>
      <span className="text-[30px] font-semibold leading-none">{value}</span>
      {note && <span className={`text-[13px] ${toneClass}`}>{note}</span>}
    </div>
  );
}

const chipBase = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-semibold";

export function StatusChip({ status }: { status: SiteStatus }) {
  const map = {
    up: ["Up", "bg-ok-soft text-ok", "bg-ok"],
    slow: ["Slow", "bg-warn-soft text-warn", "bg-warn"],
    down: ["Down", "bg-bad-soft text-bad", "bg-bad"],
    warn: ["Failing", "bg-warn-soft text-warn", "bg-warn"],
    unknown: ["Waiting", "bg-line-soft text-ink-2", "bg-muted"],
    paused: ["Paused", "bg-line-soft text-ink-2", "bg-muted"],
  } as const;
  const [label, cls, dot] = map[status];
  return (
    <span className={`${chipBase} ${cls}`}>
      <span className={`size-[7px] rounded-full ${dot}`} />
      {label}
    </span>
  );
}

export function SubStatusChip({ status }: { status: SubStatus }) {
  const map = {
    active: ["Active", "bg-ok-soft text-ok"],
    soon: ["Renews soon", "bg-warn-soft text-warn"],
    expired: ["Expired", "bg-bad-soft text-bad"],
    cancelled: ["Cancelled", "bg-line-soft text-ink-2"],
  } as const;
  const [label, cls] = map[status];
  return <span className={`${chipBase} ${cls}`}>{label}</span>;
}

export function SeverityChip({ severity }: { severity: "high" | "medium" | "low" }) {
  const map = { high: "bg-bad-soft text-bad", medium: "bg-warn-soft text-warn", low: "bg-line-soft text-ink-2" } as const;
  return (
    <span className={`inline-block min-w-16 rounded-full px-2 py-1 text-center text-xs font-semibold capitalize ${map[severity]}`}>
      {severity}
    </span>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-line ${className}`} aria-hidden="true" />;
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
      <p className="text-[15px] text-bad">{message}</p>
      {retry && (
        <button onClick={retry} className={btn.secondary}>
          Try again
        </button>
      )}
    </Card>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <p className="text-base font-semibold">{title}</p>
      {children && <div className="text-sm text-muted">{children}</div>}
    </div>
  );
}

export function Field({ label, htmlFor, hint, children }: { label: string; htmlFor?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label} {hint && <span className="font-normal text-muted">({hint})</span>}
      </label>
      {children}
    </div>
  );
}

export function Crumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-muted">
      {items.map((it, i) => (
        <span key={it.label} className="flex items-center gap-2">
          {i > 0 && <span aria-hidden="true">/</span>}
          {it.href ? (
            <Link href={it.href} className="font-medium text-brand">
              {it.label}
            </Link>
          ) : (
            <span>{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

type IconProps = { className?: string };
const make = (Cmp: LucideIcon, size = 18) => function Wrapped(props: IconProps) {
  return <Cmp aria-hidden="true" size={size} strokeWidth={2} {...props} />;
};

export const Icon = {
  globe: make(Globe),
  receipt: make(Receipt),
  chevronDown: make(ChevronDown, 16),
  chevronRight: make(ChevronRight, 16),
  plus: make(Plus, 15),
  upload: make(Upload),
  file: make(FileText, 16),
  logout: make(LogOut),
  menu: make(Menu, 20),
  grid: make(LayoutGrid),
  settings: make(Settings),
  activity: make(Clock),
  bell: make(Bell, 20),
  search: make(Search, 20),
  user: make(User, 16),
  check: make(Check, 16),
  card: make(CreditCard),
  users: make(Users),
  shield: make(Shield),
  pulse: (p: IconProps) => <Activity aria-hidden="true" size={20} strokeWidth={2.2} color="#fff" {...p} />,
};
