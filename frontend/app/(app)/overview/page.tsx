"use client";

import { AddWebsiteButton, useAddWebsite } from "@/components/add-website";
import Link from "next/link";
import { CalendarClock, Check, Globe, Lock, ShieldCheck, Timer } from "lucide-react";
import useSWR from "swr";
import { SitesTable } from "@/components/sites-table";
import { WelcomeAlerts } from "@/components/welcome-alerts";
import { btn, Card, ErrorState, PageHeader, Skeleton, Tile } from "@/components/ui";
import { fetcher, type SitesResponse } from "@/lib/api";
import { fmtDay, fmtMs } from "@/lib/format";
import { useMe } from "@/lib/me";

export default function DashboardPage() {
  const { canWrite, me, ws, user } = useMe();
  const { data, error, mutate, isLoading } = useSWR<SitesResponse>("/api/sites", fetcher, { refreshInterval: 60000 });
  if (error) return <ErrorState message={error.message} retry={() => mutate()} />;
  const s = data?.summary;

  const steps = ws && data ? [
    { title: "Verify your email", sub: "Done", href: "/settings?tab=profile", done: true },
    { title: "Choose a plan", sub: `${ws.plan.name} plan is active`, href: "/settings?tab=billing", done: true },
    { title: "Add your first website", sub: data.sites.length ? `${data.sites.length} website${data.sites.length === 1 ? "" : "s"} added` : "Paste its address and we start checking.", href: "/websites/new", done: data.sites.length > 0 },
    { title: "Install the tracking snippet", sub: "See visitors and real page speed.", href: data.sites[0] ? `/websites/${data.sites[0].id}` : "/websites/new", done: data.setup.snippet },
  ] : [];
  const done = steps.filter((x) => x.done).length;

  return (
    <>
      <WelcomeAlerts />
      <PageHeader title={`Welcome, ${user?.first_name ?? ""}`.trim().replace(/,$/, "")} subtitle={ws ? `Here is how your websites at ${ws.name} are doing.` : ""}
        actions={canWrite ? <AddWebsiteButton className={btn.primary} /> : (
          <div className="flex flex-col items-end gap-1">{me?.support
              ? <span aria-disabled="true" className="inline-flex min-h-11 cursor-not-allowed items-center gap-2 rounded-[10px] border border-dashed border-[#A5B4FC] bg-[#EEF2FF] px-[18px] text-sm font-bold text-[#4338CA]"><Lock aria-hidden="true" size={16} />Add website</span>
              : <span aria-disabled="true" className="inline-flex min-h-11 cursor-not-allowed items-center rounded-lg bg-[#c9cfd8] px-5 text-sm font-semibold text-white">Add website</span>}
            <span className={`text-xs ${me?.support ? "text-[#4338CA]" : "text-muted"}`}>{me?.support ? "Locked in view-only support mode" : "View-only access"}</span></div>)} />

      {steps.length > 0 && done < steps.length && (
        <section aria-label="Getting started" className="flex flex-col gap-4 rounded-[14px] border border-line bg-surface px-6 py-[22px]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5"><h2 className="text-lg font-semibold">Finish setting up</h2><span className="text-sm text-muted">{done} of {steps.length} done. A few minutes left.</span></div>
            <div className="h-2 w-[220px] max-w-full rounded bg-[#e8ebf0]"><div className="h-2 rounded bg-brand" style={{ width: `${(done / steps.length) * 100}%` }} /></div>
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            {steps.map((st) => (
              <StepLink key={st.title} href={st.href} className="flex min-h-11 w-full items-start gap-3 rounded-xl border border-line p-3.5 text-left hover:bg-soft">
                {st.done ? <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-ok text-white"><Check size={14} strokeWidth={3} aria-hidden="true" /></span>
                  : <span className="size-6 shrink-0 rounded-full border-2 border-[#c9cfd8]" />}
                <span className="flex flex-col gap-0.5"><span className="text-sm font-semibold">{st.title}</span><span className="text-[13px] leading-snug text-muted">{st.sub}</span></span>
              </StepLink>
            ))}
          </div>
        </section>
      )}

      <section aria-label="Summary" className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
        {s ? (
          <>
            <Tile label="Sites up" icon={Globe} info="How many of your websites answered the latest uptime check. A site counts as up when it responds successfully, even if it is slow." value={<>{s.up} <span className="text-lg font-medium text-muted">of {s.total}</span></>}
              note={s.down.length ? `${s.down.length} ${s.down.length === 1 ? "site is" : "sites are"} down` : "All sites are up"} tone={s.down.length ? "bad" : "ok"} />
            <Tile label="Average response" icon={Timer} info={`The average time sites took to answer their latest check, leaving out sites that are down. Anything over ${s.slow_threshold_ms / 1000} seconds is flagged as slow.`} value={fmtMs(s.avg_response_ms)} note={s.slow.length ? `${s.slow.length} slower than ${s.slow_threshold_ms / 1000} s` : "Within limits"} tone={s.slow.length ? "warn" : "muted"} />
            <Tile label="Domains expiring in 60 days" icon={CalendarClock} tone={s.domains_expiring.length ? "warn" : "muted"} info="Domain names that expire within 60 days. If a domain lapses, the website and every email address on it stop working, so renew early." value={s.domains_expiring.length} note={s.domains_expiring.length ? s.domains_expiring.map((x) => `${x.name} (${x.expires ? fmtDay(x.expires) : x.days + " d"})`).join(" · ") : "Nothing to renew"} />
            <Tile label="SSL expiring in 30 days" icon={ShieldCheck} info="Websites whose SSL certificate runs out within 30 days. An expired certificate shows visitors a security warning, so renew it early." value={s.ssl_expiring.length} tone={s.ssl_expiring.length ? "warn" : "muted"} note={s.ssl_expiring.length ? s.ssl_expiring.map((x) => `${x.name} (${x.expires ? fmtDay(x.expires) : x.days + " d"})`).join(" · ") : "Nothing to renew"} />
          </>
        ) : [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[128px]" />)}
      </section>

      <SitesTable sites={data?.sites} loading={isLoading} />
      
    </>
  );
}

/** A checklist row. The "add a website" row opens the dialog instead of going to a page. */
function StepLink({ href, className, children }: { href: string; className: string; children: React.ReactNode }) {
  const { open } = useAddWebsite();
  return href === "/websites/new"
    ? <button type="button" onClick={open} className={className}>{children}</button>
    : <Link href={href} className={className}>{children}</Link>;
}
