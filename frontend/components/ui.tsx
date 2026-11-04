import Link from "next/link";
import type { ReactNode } from "react";
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

export function Tile({ label, value, note, tone = "muted" }: { label: string; value: ReactNode; note?: ReactNode; tone?: "muted" | "ok" | "warn" | "bad" }) {
  const toneClass = { muted: "text-muted", ok: "text-ok font-medium", warn: "text-warn font-medium", bad: "text-bad font-medium" }[tone];
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-5">
      <span className="text-[13px] text-muted">{label}</span>
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

export const Icon = {
  globe: (p: { className?: string }) => (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18" />
    </svg>
  ),
  receipt: (p: { className?: string }) => (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" />
    </svg>
  ),
  chevronDown: (p: { className?: string }) => (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 9l6 6 6-6" /></svg>
  ),
  chevronRight: (p: { className?: string }) => (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 6l6 6-6 6" /></svg>
  ),
  plus: (p: { className?: string }) => (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14" /></svg>
  ),
  upload: (p: { className?: string }) => (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 16V4M7 9l5-5 5 5M5 20h14" /></svg>
  ),
  file: (p: { className?: string }) => (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" /><path d="M14 3v5h5" /></svg>
  ),
  logout: (p: { className?: string }) => (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9" /></svg>
  ),
  menu: (p: { className?: string }) => (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
  ),
  pulse: (p: { className?: string }) => (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 12h4l3-7 4 14 3-7h4" /></svg>
  ),
};
