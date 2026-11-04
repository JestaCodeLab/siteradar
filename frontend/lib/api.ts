export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: "same-origin", ...init });
  if (res.status === 401 && !path.startsWith("/api/auth/login")) {
    window.location.href = "/login";
    throw new ApiError("Please sign in again.", 401);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.error ?? "Something went wrong. Please try again.", res.status);
  }
  return res.json();
}

export const fetcher = <T,>(path: string) => request<T>(path);
export const send = <T,>(method: "POST" | "PATCH" | "DELETE", path: string, body?: unknown) =>
  request<T>(path, {
    method,
    headers: body === undefined || body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
  });

// ---- types -----------------------------------------------------------------

export type SiteStatus = "up" | "slow" | "down" | "warn" | "unknown";

export interface StripDay { day: string; uptime: number | null }

export interface SiteCard {
  id: string; name: string; url: string; host: string; keyword: string | null; owner: string;
  report_to: string[]; alert_to: string[]; track_analytics: boolean; audit_enabled: boolean;
  status: SiteStatus; error: string | null; down_since: number | null; last_check: number | null;
  response_ms: number | null; ssl_days: number | null; uptime30: number | null; avg_ms30: number | null;
  audit_score: number | null; visitors30: number; strip: StripDay[];
}

export interface SitesResponse {
  sites: SiteCard[];
  summary: {
    total: number; up: number; down: string[]; slow: string[]; avg_response_ms: number | null;
    ssl_expiring: { name: string; days: number }[]; errors: Record<string, string | null>;
    slow_threshold_ms: number; ssl_warning_days: number; check_interval_minutes: number; latest_check: number | null;
  };
}

export interface Issue {
  rule: string; category: string; severity: "high" | "medium" | "low"; title: string; fix: string; count: number;
}

export interface PageSpeed {
  scores: Record<string, number>; lcp_ms: number | null; cls: number | null; inp_ms: number | null;
  field_data: boolean; opportunities: string[];
}

export interface SiteDetail extends SiteCard {
  audit_ts: number | null; pagespeed: PageSpeed | null;
  uptime_stats: { uptime: number | null; avg_ms: number | null; p95_ms: number | null; downtime_minutes: number; incident_count: number };
  response_series: { day: string; ms: number }[];
  incidents: { started: number; ended: number | null; cause: string | null }[];
  top_issues: Issue[]; tracking_live: boolean; pageviews30: number; snippet: string; audit_running: boolean;
}

export type Counted = [string, number, number];
export interface AnalyticsSummary {
  pageviews: number; visitors: number; visits?: number; pages_per_visit?: number; bounce_rate?: number;
  avg_visit_seconds?: number; median_load_ms?: number | null;
  top_pages?: [string, number][]; referrers?: Counted[]; devices?: Counted[]; browsers?: Counted[];
  daily_visitors?: [string, number][];
}
export interface AnalyticsResponse {
  days: number; current: AnalyticsSummary;
  previous: { visitors: number | null; pageviews: number | null; bounce_rate: number | null };
}

export interface AuditResponse {
  audit: { ts: number; pages: number; scores: Record<string, number>; issues: Issue[]; pagespeed: PageSpeed | null } | null;
  running: boolean; categories: string[];
}

export interface ReportMonths { months: { period: string; label: string; in_progress: boolean }[]; recipients: string[] }

export type SubStatus = "active" | "soon" | "expired" | "cancelled";
export interface Invoice { id: number; period: string; name: string; size: number; uploaded: number; url: string }
export interface Subscription {
  id: number; site_id: string | null; site_name: string | null; name: string; category: string | null;
  provider: string | null; amount: number; currency: string; cycle: "monthly" | "yearly";
  started: string | null; next_renewal: string; auto_renew: boolean; remind_days: number; notes: string | null;
  active: boolean; status: SubStatus; invoices: Invoice[]; has_current_invoice: boolean; latest_invoice: Invoice | null;
}
export type Money = Record<string, number>;
export interface SubscriptionsResponse {
  subscriptions: Subscription[]; categories: string[];
  summary: {
    monthly: Money; yearly: Money; count: number; renewing_soon: number; due_soon: Money;
    expired: number; missing_invoices: number; today: string;
  };
}

export interface SubReport {
  period: string; label: string; generated: string; in_progress: boolean;
  total: Money; previous_total: Money; next_total: Money; next_label: string;
  active_count: number; expired_count: number; invoices_on_file: number; invoices_due: number;
  charges: { date: string; subscription_id: number; name: string; site: string; category: string; amount: number; currency: string; invoice: Invoice | null; future: boolean }[];
  by_site: Record<string, [string, number][]>; by_category: Record<string, [string, number][]>;
  upcoming: { date: string; name: string; site: string; amount: number; currency: string }[];
  actions: { level: "urgent" | "soon"; text: string }[];
}
export interface SubReportMonths {
  months: { period: string; label: string; total: Money; in_progress: boolean }[]; recipients: string[];
}
