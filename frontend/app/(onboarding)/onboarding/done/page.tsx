"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Icon } from "@/components/ui";
import { ghs, useMe } from "@/lib/me";

const tasks = [
  { href: "/websites/new", title: "Add your first website", text: "Paste its address and we start checking straight away." },
  { href: "/team", title: "Invite a teammate", text: "Give a colleague or a client access to your workspace." },
  { href: "/settings", title: "Check where alerts go", text: "Add phone numbers and chat channels if your plan includes them." },
];

export default function DoneStep() {
  const { user, ws, mutate } = useMe();
  useEffect(() => { try { sessionStorage.removeItem("sitewatch.onboarding"); } catch { /* optional */ } mutate(); }, [mutate]);
  const paid = ws && ws.plan_id !== "free";
  return (
    <div className="mx-auto flex max-w-[720px] flex-col items-center gap-8 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-ok-soft text-ok"><Icon.check className="!size-8" /></span>
      <div className="flex flex-col gap-3">
        <h1 className="text-[34px] font-semibold">You are all set{user ? `, ${user.first_name}` : ""}</h1>
        <p className="text-[16px] leading-relaxed text-ink-2">
          {ws ? <>Your workspace <b>{ws.name}</b> is on the <b>{ws.plan.name}</b> plan. {paid
            ? <>Your plan renews on {ws.plan_renews ? new Date(ws.plan_renews * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "its next date"}. We emailed your receipt.</>
            : "Reports carry a light SiteWatch watermark. You can upgrade any time from Billing."}</> : "Setting up your workspace…"}
        </p>
      </div>
      <Link href="/overview" className="inline-flex min-h-12 items-center rounded-lg bg-brand px-8 text-[15px] font-semibold text-white hover:bg-brand-ink">Go to my dashboard</Link>
      <div className="w-full rounded-2xl border border-line bg-surface p-6 text-left">
        <p className="mb-3 text-base font-semibold">Do these next</p>
        <ul className="flex flex-col">{tasks.map((t) => (
          <li key={t.href} className="border-t border-line-soft first:border-0"><Link href={t.href} className="flex min-h-14 items-center justify-between gap-4 py-3 hover:text-brand">
            <span><span className="block text-[15px] font-semibold">{t.title}</span><span className="block text-sm text-muted">{t.text}</span></span><Icon.chevronRight /></Link></li>))}</ul>
      </div>
    </div>
  );
}
