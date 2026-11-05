import type { Money } from "./api";

export const fmtMs = (ms: number | null | undefined) =>
  ms == null ? "—" : ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${ms} ms`;

export const fmtPct = (v: number | null | undefined) =>
  v == null ? "—" : v >= 99.995 ? "100%" : `${v.toFixed(2)}%`;

export const fmtNum = (n: number | null | undefined) =>
  n == null ? "—" : n >= 10000 ? `${(n / 1000).toFixed(0)}k` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"} ago`;
const startOfDay = (d: Date | number) => new Date(d).setHours(0, 0, 0, 0);

/** 7:06 PM */
export const fmtTime = (ts: number) =>
  new Date(ts * 1000).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

/** 5 Nov 2026 */
export const fmtDateTs = (ts: number | null | undefined) =>
  ts ? new Date(ts * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

/** 5 Nov 2026, 7:06 PM */
export const fmtDateTime = (ts: number) => `${fmtDateTs(ts)}, ${fmtTime(ts)}`;

/** Today, 7:06 PM  /  Yesterday, 7:06 PM  /  5 Nov 2026, 7:06 PM */
export function fmtWhen(ts: number) {
  const diff = Math.round((startOfDay(Date.now()) - startOfDay(ts * 1000)) / 86400000);
  if (diff === 0) return `Today, ${fmtTime(ts)}`;
  if (diff === 1) return `Yesterday, ${fmtTime(ts)}`;
  return fmtDateTime(ts);
}

/** just now / 5 minutes ago / 3 hours ago / Yesterday / 4 days ago / 5 Nov 2026 */
export function fmtAgo(ts: number | null | undefined) {
  if (!ts) return "never";
  const s = Date.now() / 1000 - ts;
  if (s < 60) return "just now";
  if (s < 3600) return plural(Math.round(s / 60), "minute");
  const diff = Math.round((startOfDay(Date.now()) - startOfDay(ts * 1000)) / 86400000);
  if (diff === 0) return plural(Math.max(1, Math.round(s / 3600)), "hour");
  if (diff === 1) return "Yesterday";
  if (diff < 7) return plural(diff, "day");
  return fmtDateTs(ts);
}

export const fmtDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export const fmtDay = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export function money(currency: string, amount: number) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export const moneyMap = (m: Money | undefined) => {
  const parts = Object.entries(m ?? {}).map(([c, a]) => money(c, a));
  return parts.length ? parts.join(" · ") : "—";
};

export const fmtSize = (bytes: number) =>
  bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export const daysUntil = (iso: string) =>
  Math.round((new Date(iso + "T00:00:00").getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000);

export const splitEmails = (v: FormDataEntryValue | string | null) =>
  String(v ?? "").split(/[,\s;]+/).map((x) => x.trim()).filter(Boolean);

export function dayLabel(ts: number) {
  const d = new Date(ts * 1000);
  const diff = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
