export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: "same-origin", ...init });
  if (res.status === 401 && !path.startsWith("/api/auth/")) {
    window.location.href = "/login?expired=1";
    throw new ApiError("Please sign in again.", 401);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.error ?? "Something went wrong. Please try again.", res.status, body.code);
  }
  return res.json();
}

export const fetcher = <T,>(path: string) => request<T>(path);
export const send = <T,>(method: "POST" | "PUT" | "PATCH" | "DELETE", path: string, body?: unknown) =>
  request<T>(path, {
    method,
    headers: body === undefined || body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
  });

// ---- types -----------------------------------------------------------------

export type SiteStatus = "up" | "slow" | "down" | "warn" | "unknown" | "paused";

export interface StripDay { day: string; uptime: number | null }

export interface SiteCard {
  id: string; name: string; url: string; host: string; keyword: string | null; owner: string;
  report_to: string[]; alert_to: string[]; track_analytics: boolean; audit_enabled: boolean;
  status: SiteStatus; error: string | null; down_since: number | null; last_check: number | null;
  response_ms: number | null; ssl_days: number | null; uptime30: number | null; avg_ms30: number | null;
  audit_score: number | null; visitors30: number; strip: StripDay[]; domain_days: number | null;
  domain_expires: string | null; ssl_expires: string | null; tracking_verified: boolean; platform?: { platform: string } | null;
}

export interface SitesResponse {
  sites: SiteCard[];
  summary: {
    total: number; up: number; down: string[]; slow: string[]; avg_response_ms: number | null;
    ssl_expiring: { name: string; days: number; expires: string | null }[]; domains_expiring: { name: string; days: number; expires: string | null }[]; errors: Record<string, string | null>;
    slow_threshold_ms: number; ssl_warning_days: number; check_interval_minutes: number; latest_check: number | null;
  };
  setup: { snippet: boolean; unverified: string[]; team: boolean };
}

export interface Issue {
  rule: string; category: string; severity: "high" | "medium" | "low"; title: string; fix: string; count: number;
}

export interface PageSpeedResult {
  scores: Record<string, number>; lcp_ms: number | null; cls: number | null; inp_ms: number | null;
  field_data: boolean; opportunities: string[];
}
export interface PageSpeed { mobile: PageSpeedResult | null; desktop: PageSpeedResult | null }

export interface SiteDetail extends SiteCard {
  audit_ts: number | null; pagespeed: PageSpeed | null;
  /** True while the first results of a website that was just added are still on their way. */
  first_run?: { checks: boolean; audit: boolean };
  preview: { desktop: number | null; mobile: number | null; running: boolean };
  uptime_stats: { uptime: number | null; avg_ms: number | null; p95_ms: number | null; downtime_minutes: number; incident_count: number };
  response_series: { day: string; ms: number }[];
  incidents: { started: number; ended: number | null; cause: string | null }[];
  platform: { platform: string; signals: string[]; seo_plugin: string | null; checked_at: number } | null;
  connector: { issued: boolean; connected: boolean; last_seen: number | null; allowed: boolean; info: { plugin_version?: string; wp_version?: string; php_version?: string; seo_plugin?: string; snippet?: string } };
  top_issues: Issue[]; tracking_live: boolean; tracking: { verified_at: number | null; checked_at: number | null; last_hit: number | null }; pageviews30: number; snippet: string; audit_running: boolean; audit_runs_left?: number;
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

export interface DiscountCode {
  id: number; code: string; description: string; kind: "percent" | "fixed"; percent: number; amount_ghs: number; amount_usd: number;
  plan_ids: string[] | null; cycles: "both" | "monthly" | "yearly"; periods: number; max_uses: number | null; starts: number | null; expires: number | null;
  active: boolean; uses: number; state: "active" | "disabled" | "scheduled" | "expired" | "used up"; created: number; label: string; duration: string;
}
export interface DiscountsResponse { codes: DiscountCode[]; plans: { id: string; name: string }[]; summary: { active: number; uses: number } }
export interface DiscountCheck { ok: boolean; code: string; discount: number; total: number; currency: string; label: string; duration: string }
export interface ReportHistoryMonth {
  period: string; label: string; range: string; in_progress: boolean; uptime: number | null; avg_ms: number | null; incidents: number;
  audit: number | null; visitors: number | null; generated: number | null; auto: boolean;
}
export interface ReportHistory { months: ReportHistoryMonth[]; keep_months: number; recipients: string[] }
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

export interface ActivityEvent {
  ts: number; kind: string; level: "bad" | "warn" | "ok" | "info"; title: string; detail: string;
  site_id: string | null; site_name: string | null;
}

export interface SettingsData {
  alerts: { emails: string[]; phones: string[]; webhooks: string[]; channels: ("email" | "chat" | "sms")[]; sms_quota: number; sms_used: number; sms_credits?: number };
  monitoring: {
    check_interval_minutes: number; failures_before_alert: number; timeout_seconds: number; slow_threshold_ms: number;
    ssl_warning_days: number; audit_daily_at: string; audit_max_pages: number; report_day_of_month: number;
    report_at: string; timezone: string; history_months: number;
  };
}

export interface DomainInfo {
  domain: string; expires: string | null; registrar: string | null; status: "ok" | "unsupported" | "error";
  error: string | null; days_left: number | null; ts: number;
}
export interface DnsCheck { id: string; label: string; status: "ok" | "warn" | "bad" | "na"; detail: string; fix: string }
export interface DnsInfo {
  ts: number; records: Record<string, string[]>; checks: DnsCheck[]; score: number | null;
  history: { ts: number; changes: { record: string; before: string[]; after: string[] }[] }[];
}
export interface SitemapInfo {
  ts: number; sitemap_url: string | null; total: number; checked: number; redirects: number;
  added: number | null; removed: number | null; error: string | null;
  broken: { url: string; status: number | string }[]; trend: { ts: number; total: number }[];
}
export interface HealthResponse { domain: DomainInfo | null; dns: DnsInfo | null; sitemap: SitemapInfo | null; running: boolean }


// ---- accounts, plans and billing ----------------------------------------------

export type Role = "owner" | "admin" | "member" | "viewer";

export interface PlanInfo {
  currency: string; price_month_usd?: number;
  id: string; name: string; tagline: string; price_month: number; price_year: number; price_year_month: number;
  sites: number; members: number; interval_minutes: number; sms: number; history_months: number;
  channels: ("email" | "chat" | "sms")[]; client_access: boolean; active: boolean;
}
export interface Catalogue { plans: PlanInfo[]; yearly_discount: number; currency: string }

export interface Workspace {
  id: number; name: string; owner_name?: string | null; website: string | null; industry: string | null; size: string | null; country: string | null;
  phone: string | null; address: string | null; logo_url: string | null; logo_name?: string | null; logo_size?: number | null; timezone?: string; role: Role | null; onboarded: boolean; coupon?: { code: string; left: number | null } | null; suspended: boolean; alerts_prompted?: boolean; report_day?: number; report_at?: string;
  plan: { id: string; name: string; sites: number; members: number; storage_mb?: number; interval_minutes: number; sms: number; history_months: number;
          channels: ("email" | "chat" | "sms")[]; client_access: boolean };
  plan_id: string; cycle: "monthly" | "yearly"; plan_status: "active" | "past_due" | "lapsed" | "none"; locked?: boolean; cancels?: boolean; currency?: string; plan_renews: number | null;
  usage: { sites: number; members: number; pending_invites: number; seats: number; sms: number }; sms_credits?: number;
}

export interface User { id: number; country?: string | null; pending_email?: string | null; email: string; first_name: string; last_name: string; phone: string; is_super: boolean; email_verified: boolean }

export interface Me {
  authenticated: boolean; user: User | null;
  workspaces: { id: number; name: string; role: Role; logo_url: string | null }[];
  workspace: Workspace | null;
  support: { until: number; reason: string; mode: "view" | "edit" } | null;
  announcement: string | null;
  session_seconds_left?: number | null;
}

export interface TeamData {
  members: { id: number; email: string; first_name: string; last_name: string; last_login: number | null; role: Role; created: number; site_access: string[] | null }[];
  invites: { id: number; email: string; role: Role; created: number; expires: number; site_access: string[] | null }[];
  plan: Workspace["plan"]; usage: Workspace["usage"]; role: Role;
}

export interface Payment { reference: string; plan_id: string; cycle: string; amount: number; currency: string; status: string; channel: string | null; created: number; paid: number | null }
export interface Invoice { reference: string; number: string; date: number; description: string; amount: number }
export interface BillingData {
  workspace: Workspace; catalogue: Catalogue; payments: Payment[]; invoices: Invoice[]; bundles: { qty: number; price: number }[];
  card: string | null; last_method: string | null; comped: boolean; storage: { used_mb: number; limit_mb: number };
  test_mode: boolean; grace_days: number;
}

export interface FixItem { label: string; what: string; confirm: boolean; state: "available" | "queued" | "applied"; since: number | null }
export interface FixesResponse { allowed: boolean; connected: boolean; items: Record<string, FixItem>; log: { t: number; who: string; rule: string; action: "apply" | "undo" }[] }
