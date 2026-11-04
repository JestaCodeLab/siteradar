import type { Money } from "./api";

export const fmtMs = (ms: number | null | undefined) =>
  ms == null ? "—" : ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${ms} ms`;

export const fmtPct = (v: number | null | undefined) =>
  v == null ? "—" : v >= 99.995 ? "100%" : `${v.toFixed(2)}%`;

export const fmtNum = (n: number | null | undefined) =>
  n == null ? "—" : n >= 10000 ? `${(n / 1000).toFixed(0)}k` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

export function fmtAgo(ts: number | null | undefined) {
  if (!ts) return "never";
  const s = Date.now() / 1000 - ts;
  if (s < 90) return "just now";
  if (s < 5400) return `${Math.round(s / 60)} minutes ago`;
  if (s < 129600) return `${Math.round(s / 3600)} hours ago`;
  return new Date(ts * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export const fmtDateTime = (ts: number) =>
  new Date(ts * 1000).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

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
