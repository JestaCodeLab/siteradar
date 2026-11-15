"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { Turnstile, turnstileKey } from "./turnstile";
import { ApiError, send } from "@/lib/api";

interface Result {
  url: string; host: string; up: boolean; verdict: "up" | "slow" | "error" | "down"; status_code: number | null; response_ms: number | null;
  final_url: string | null; redirects: { status: number; url: string }[]; title: string | null; server: string | null;
  ssl_days_left: number | null; ssl_expires: string | null; https_redirect: boolean | null; error: string | null; checked_at: number;
}

const VERDICT = {
  up: { Icon: CheckCircle2, label: "is up", tone: "bg-[#DCFCE7] text-[#166534]" },
  slow: { Icon: Clock, label: "is up, but slow", tone: "bg-[#FEF3C7] text-[#92400E]" },
  error: { Icon: XCircle, label: "answered with an error", tone: "bg-[#FEE2E2] text-[#991B1B]" },
  down: { Icon: XCircle, label: "is down", tone: "bg-[#FEE2E2] text-[#991B1B]" },
} as const;

function Fact({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl border border-[#EFE4D8] bg-white p-4">
      <dt className="text-[13px] font-semibold uppercase tracking-[0.05em] text-[#64748B]">{label}</dt>
      <dd className="mt-1 break-words text-lg font-bold text-[#0F172A]">{value}</dd>
      {note && <dd className="mt-0.5 text-sm text-[#475569]">{note}</dd>}
    </div>
  );
}

export function UptimeChecker() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [res, setRes] = useState<Result | null>(null);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    if (turnstileKey && !captcha) { setError("Please complete the security check first."); return; }
    setBusy(true); setError(null); setRes(null);
    try { setRes(await send<Result>("POST", "/api/tools/uptime-check", { url, turnstile_token: captcha })); }
    catch (err) { setError(err instanceof ApiError || err instanceof Error ? err.message : "The check could not be run."); }
    setCaptcha(null); setCaptchaReset((n) => n + 1);
    setBusy(false);
  }

  const v = res ? VERDICT[res.verdict] : null;
  const ssl = res?.ssl_days_left;
  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={check} className="flex flex-col gap-3 rounded-2xl border border-[#EFE4D8] bg-white p-5 md:p-6">
        <label htmlFor="uc-url" className="text-sm font-semibold">Website address</label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input id="uc-url" value={url} onChange={(e) => setUrl(e.target.value)} required placeholder="example.com" inputMode="url" autoCapitalize="off" autoCorrect="off" spellCheck={false}
            className="min-h-12 flex-1 rounded-xl border border-[#CBD5E1] px-4 text-base text-[#0F172A] placeholder:text-[#94A3B8]" />
          <button disabled={busy || !url.trim()} className="min-h-12 rounded-xl bg-[#F97316] px-7 text-base font-bold text-white hover:bg-[#EA580C] disabled:opacity-60">{busy ? "Checking…" : "Check website"}</button>
        </div>
        <Turnstile onToken={setCaptcha} resetKey={captchaReset} />
        {error && <p role="alert" className="rounded-lg bg-[#FEE2E2] px-3.5 py-2.5 text-sm text-[#991B1B]">{error}</p>}
      </form>

      {res && v && (
        <section aria-live="polite" aria-label="Result" className="flex flex-col gap-4">
          <div className={`flex flex-wrap items-center gap-3 rounded-2xl px-5 py-4 ${v.tone}`}>
            <v.Icon aria-hidden="true" size={28} />
            <p className="text-xl font-bold"><span className="font-mono">{res.host}</span> {v.label}</p>
          </div>
          {res.error && <p className="text-[15px] text-[#475569]">{res.error}</p>}
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Fact label="Status" value={res.status_code ? String(res.status_code) : "No answer"} note={res.status_code ? (res.status_code < 400 ? "The page loaded." : "The server returned an error.") : undefined} />
            <Fact label="Response time" value={res.response_ms !== null ? `${res.response_ms.toLocaleString()} ms` : "—"} note={res.response_ms !== null ? (res.response_ms > 3000 ? "Slow. Visitors may leave." : res.response_ms > 1000 ? "Acceptable, could be faster." : "Fast.") : undefined} />
            {ssl !== null && ssl !== undefined
              ? <Fact label="SSL certificate" value={ssl < 0 ? "Expired" : `${ssl} days left`} note={res.ssl_expires ? `Expires ${res.ssl_expires}` : undefined} />
              : <Fact label="SSL certificate" value="Not found" note="No valid HTTPS certificate was read." />}
            {res.https_redirect !== null && <Fact label="HTTP to HTTPS" value={res.https_redirect ? "Redirects" : "No redirect"} note={res.https_redirect ? "Visitors on http:// are sent to the secure site." : "Visitors on http:// stay on an unsecured page."} />}
            {res.title && <Fact label="Page title" value={res.title} />}
            {res.server && <Fact label="Server" value={res.server} />}
          </dl>
          {res.redirects.length > 0 && (
            <div className="rounded-xl border border-[#EFE4D8] bg-white p-4">
              <h3 className="text-sm font-bold">Redirects followed</h3>
              <ol className="mt-2 flex list-decimal flex-col gap-1 pl-5 text-sm text-[#475569]">
                {res.redirects.map((r, i) => <li key={i} className="break-all">{r.status} · {r.url}</li>)}
                {res.final_url && <li className="break-all font-semibold text-[#0F172A]">Final address · {res.final_url}</li>}
              </ol>
            </div>
          )}
          <div className="flex flex-col gap-3 rounded-2xl border border-[#FDBA74] bg-[#FFF7ED] p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[15px] text-[#334155]"><b className="text-[#0F172A]">This was one check, right now.</b> SiteRadar checks {res.host} every few minutes and tells you on WhatsApp or email the moment it goes down.</p>
            <Link href="/signup" className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[#F97316] px-5 py-3 font-bold text-white hover:bg-[#EA580C]">Monitor this website</Link>
          </div>
        </section>
      )}
    </div>
  );
}
