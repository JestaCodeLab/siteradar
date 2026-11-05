"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { mutate } from "swr";
import { Crumbs, PageHeader } from "@/components/ui";
import { ApiError, send, type SiteCard } from "@/lib/api";
import { splitEmails } from "@/lib/format";
import { useMe } from "@/lib/me";

const field = "min-h-[46px] w-full rounded-lg border border-[#c9cfd8] px-3.5 text-[15px] disabled:cursor-not-allowed disabled:bg-[#f3f4f6]";
const NEXT: Record<string, string> = { free: "Starter", starter: "Growth", growth: "Scale" };

export default function NewWebsitePage() {
  const router = useRouter();
  const { ws, canWrite, isAdmin, mutate: refreshMe } = useMe();
  const [error, setError] = useState<{ text: string; limit: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const used = ws?.usage.sites ?? 0, limit = ws?.plan.sites ?? 1;
  const atLimit = !!ws && used >= limit;
  const locked = atLimit || !canWrite;
  const next = NEXT[ws?.plan_id ?? ""];

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true); setError(null);
    try {
      const site = await send<SiteCard>("POST", "/api/sites", {
        name: f.get("name"), url: f.get("url"), keyword: f.get("keyword"), report_to: splitEmails(f.get("report_to")),
      });
      await Promise.all([mutate("/api/sites"), refreshMe()]);
      router.push(`/websites/${site.id}`);
    } catch (err) {
      setError({ text: err instanceof Error ? err.message : "Could not add the website.", limit: err instanceof ApiError && err.code === "limit" });
      setBusy(false);
    }
  }

  return (
    <>
      <Crumbs items={[{ label: "Overview", href: "/overview" }, { label: "Add website" }]} />
      <PageHeader title="Add website" subtitle="SiteRadar starts checking it right away and takes a picture of the homepage." />
      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-5">
          {atLimit && (
            <div role="status" className="flex flex-wrap items-center justify-between gap-3.5 rounded-[14px] bg-warn-soft px-[22px] py-5">
              <div className="flex max-w-[520px] flex-col gap-1"><span className="text-base font-semibold text-warn">You have reached your website limit</span>
                <span className="text-sm leading-relaxed text-warn">The {ws?.plan.name} plan includes {limit} website{limit === 1 ? "" : "s"} and you are using {used}.{next ? ` Upgrade to ${next} for more,` : ""} or remove a website you no longer need.</span></div>
              {isAdmin && next && <Link href="/settings?tab=billing" className="inline-flex min-h-11 items-center rounded-lg bg-brand px-5 text-sm font-semibold text-white">Upgrade to {next}</Link>}
            </div>
          )}
          {!canWrite && <p className="rounded-xl bg-[#e8ebf0] px-5 py-3.5 text-sm">You have view-only access, so you can&apos;t add websites.</p>}
          <form onSubmit={submit} className="flex flex-col gap-5 rounded-[14px] border border-line bg-surface p-6">
            <div className="flex flex-col gap-2"><label htmlFor="name" className="text-sm font-medium">Name</label><input id="name" name="name" required disabled={locked} placeholder="Acme Ltd" className={field} /></div>
            <div className="flex flex-col gap-2"><label htmlFor="url" className="text-sm font-medium">Address</label><input id="url" name="url" required disabled={locked} placeholder="https://www.example.com" className={field} /></div>
            <div className="flex flex-col gap-2"><label htmlFor="kw" className="text-sm font-medium">Text the page must contain <span className="font-normal text-muted">(optional, catches blank pages)</span></label><input id="kw" name="keyword" disabled={locked} placeholder="Contact" className={field} /></div>
            <div className="flex flex-col gap-2"><label htmlFor="rep" className="text-sm font-medium">Send the monthly report to <span className="font-normal text-muted">(separate emails with commas)</span></label><input id="rep" name="report_to" disabled={locked} placeholder="you@company.com, client@example.com" className={field} /></div>
            {error && <p role="alert" className="rounded-lg bg-bad-soft px-3.5 py-2.5 text-sm text-bad">{error.text} {error.limit && <Link href="/settings?tab=billing" className="font-semibold underline">See plans</Link>}</p>}
            <div className="flex flex-wrap justify-end gap-3">
              <button type="button" onClick={() => router.back()} className="inline-flex min-h-[46px] items-center rounded-lg border border-[#c9cfd8] bg-surface px-5 text-sm font-semibold hover:bg-soft">Cancel</button>
              <button disabled={locked || busy} className="inline-flex min-h-[46px] items-center rounded-lg bg-brand px-[22px] text-sm font-semibold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-[#c9cfd8] disabled:hover:bg-[#c9cfd8]">{busy ? "Adding…" : "Add website"}</button>
            </div>
          </form>
        </div>

        <aside aria-label="Plan usage" className="flex max-w-[360px] flex-[1_1_280px] flex-col gap-3.5 rounded-[14px] border border-line bg-surface p-[22px]">
          <h2 className="text-base font-semibold">Websites on your plan</h2>
          <div className="flex items-baseline gap-2"><span className="text-[34px] font-semibold leading-none">{used}</span><span className="text-sm text-muted">of {limit} used</span></div>
          <div className="h-2 rounded bg-[#e8ebf0]"><div className={`h-2 rounded ${atLimit ? "bg-bar-warn" : "bg-brand"}`} style={{ width: `${Math.min(100, (used / Math.max(limit, 1)) * 100)}%` }} /></div>
          <span className="text-sm text-muted">{atLimit ? "No websites left on this plan. Your existing websites keep running." : `${limit - used} website${limit - used === 1 ? "" : "s"} left on your plan.`}</span>
          {isAdmin && <Link href="/settings?tab=billing" className="flex min-h-11 items-center text-sm font-semibold text-brand">See plans</Link>}
        </aside>
      </div>
    </>
  );
}
