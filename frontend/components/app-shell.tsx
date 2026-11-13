"use client";

import { AddWebsiteProvider } from "./add-website";
import { AuditWatchProvider } from "./audit-watch";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { send } from "@/lib/api";
import { SUPPORT_EMAIL } from "@/lib/brand";
import { useMe } from "@/lib/me";
import { PageLoader } from "./page-loader";
import { PwaBanner } from "./pwa";
import { Sidebar } from "./sidebar";
import { SupportFrame } from "./support-session";
import { Topbar } from "./topbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [menu, setMenu] = useState(false);
  const router = useRouter();
  const { me, ws, isLoading, mutate } = useMe();

  useEffect(() => {
    if (isLoading || !me) return;
    if (!me.authenticated) { send("POST", "/api/auth/logout").catch(() => {}).finally(() => router.replace("/login")); return; }
    if (!ws) router.replace(me.user?.is_super ? "/admin" : "/onboarding/company");
    else if (!ws.onboarded && !me.support) router.replace("/onboarding/plan");
  }, [me, ws, isLoading, router]);

  if (!me?.authenticated || !ws) return <PageLoader />;
  void mutate;

  return (
    <AddWebsiteProvider>
    <AuditWatchProvider>
    <div className="min-h-screen bg-[#F3F4F6]">
      <SupportFrame />
      <Sidebar open={menu} onClose={() => setMenu(false)} />
      <div className="flex min-h-screen flex-col lg:pl-64">
        {me.announcement && <p role="status" className="bg-[#EFEAFF] px-4 py-2.5 text-sm text-[#4A33B0] lg:px-6">{me.announcement}</p>}
        <Topbar onMenu={() => setMenu(true)} />
        <PwaBanner />
        {ws.plan_status === "past_due" && (
          <p role="alert" className="bg-warn-soft px-4 py-2.5 text-sm text-warn lg:px-6">Your last payment did not go through. <Link href="/settings?tab=billing" className="font-semibold underline">Update billing</Link> to keep your {ws.plan.name} plan.</p>
        )}
        {ws.locked && ws.onboarded && (
          <p role="alert" className="bg-bad-soft px-4 py-2.5 text-sm text-bad lg:px-6"><b>Your plan has ended, so this workspace is read-only.</b> Monitoring and alerts are off, and nothing has been deleted. <Link href="/settings?tab=billing" className="font-semibold underline">Choose a plan</Link> to switch everything back on.</p>
        )}
        {ws.role === "viewer" && <p className="bg-line-soft px-4 py-2.5 text-sm text-ink-2 lg:px-6"><b>You have view-only access.</b> You can see dashboards and reports. Ask an admin if you need to change something.</p>}
        <main className="min-w-0 flex-1 px-4 py-5 lg:px-6">
          <div className="mx-auto flex max-w-[1400px] flex-col gap-5">{children}</div>
        </main>
        {me.support && (
          <section aria-label="What this session can do" className="mx-4 mb-5 flex flex-col gap-2 rounded-xl border border-line bg-surface px-6 py-5 lg:mx-6">
            <h2 className="text-base font-semibold">What this session can do</h2>
            <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-ink-2">
              <li>{me.support.mode === "edit" ? "You can edit websites, subscriptions and settings for this workspace." : "You can look at everything the customer sees. Nothing can be changed."}</li>
              <li>Passwords, email address, payment method and deleting the workspace are never available in a support session.</li>
              <li>Every page you open is recorded in the audit trail.</li>
            </ul>
          </section>
        )}
        <footer className="mt-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-t border-line bg-surface px-4 py-4 text-[13px] text-muted lg:px-6">
          <span>© {new Date().getFullYear()} SiteRadar. All rights reserved.</span>
          {SUPPORT_EMAIL && <span>Support: <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-ink-2 hover:text-ink">{SUPPORT_EMAIL}</a></span>}
        </footer>
      </div>
    </div>
    </AuditWatchProvider>
    </AddWebsiteProvider>
  );
}
