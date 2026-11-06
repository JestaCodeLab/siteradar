"use client";

import { AddWebsiteProvider } from "./add-website";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Eye } from "lucide-react";
import { send } from "@/lib/api";
import { POWERED_BY } from "@/lib/brand";
import { useMe } from "@/lib/me";
import { PageLoader } from "./page-loader";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

function mmss(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function SupportBanner({ until, reason, mode, workspace, owner }: { until: number; reason: string; mode: "view" | "edit"; workspace: string; owner: string }) {
  const router = useRouter();
  const { mutate } = useMe();
  const ref = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(0);
  useEffect(() => { const tick = () => setNow(Date.now() / 1000); const t = setInterval(tick, 1000); const first = setTimeout(tick, 0); return () => { clearInterval(t); clearTimeout(first); }; }, []);
  useEffect(() => { if (now && until - now <= 0) { mutate().then(() => router.replace("/admin")); } }, [now, until, mutate, router]);
  // the sidebar and top bar sit below the banner, whatever height it wraps to
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const set = () => document.documentElement.style.setProperty("--support-h", `${el.offsetHeight}px`);
    set(); const ro = new ResizeObserver(set); ro.observe(el);
    return () => { ro.disconnect(); document.documentElement.style.removeProperty("--support-h"); };
  }, []);
  const full = mode === "edit";
  async function exit() { await send("POST", "/api/admin/support/stop").catch(() => {}); await mutate(); router.replace("/admin"); }
  async function toggleMode() { await send("POST", "/api/admin/support/mode", { mode: full ? "view" : "edit" }); await mutate(); }
  return (
    <div ref={ref} role="status" style={{ background: full ? "#8A5A00" : "#4A33B0" }} className="relative z-[60] flex flex-wrap items-center justify-between gap-x-5 gap-y-2.5 px-4 py-2.5 text-white lg:px-6">
      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1.5">
        <span className="inline-flex items-center gap-2 text-sm font-semibold"><Eye size={18} aria-hidden="true" />Viewing {workspace} as {owner}</span>
        <span className="rounded-full bg-white/[0.18] px-2.5 py-0.5 text-[13px] font-semibold">{full ? "Full access" : "View only"}</span>
        <span className="text-[13px] opacity-90">Reason: {reason} · session ends in <span className="font-mono">{now ? mmss(until - now) : "…"}</span> · the customer is not notified</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={toggleMode} className="min-h-11 rounded-lg border border-white/50 px-4 text-[13px] font-semibold hover:bg-white/10">{full ? "Back to view only" : "Switch to full access"}</button>
        <button onClick={exit} className="min-h-11 rounded-lg bg-white px-[18px] text-[13px] font-semibold text-[#12151C]">Exit session</button>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [menu, setMenu] = useState(false);
  const router = useRouter();
  const { me, ws, isLoading, mutate } = useMe();

  useEffect(() => {
    if (isLoading || !me) return;
    if (!me.authenticated) { send("POST", "/api/auth/logout").catch(() => {}).finally(() => router.replace("/login")); return; }
    if (!ws) router.replace(me.user?.is_super ? "/admin" : "/onboarding/company");
    else if (!ws.onboarded && !me.support) router.replace("/onboarding/company");
  }, [me, ws, isLoading, router]);

  if (!me?.authenticated || !ws) return <PageLoader />;
  void mutate;
  const owner = ws.owner_name ?? "the owner";

  return (
    <AddWebsiteProvider>
    <div className="min-h-screen">
      {me.support && <SupportBanner {...me.support} workspace={ws.name} owner={owner} />}
      <Sidebar open={menu} onClose={() => setMenu(false)} />
      <div className="flex min-h-screen flex-col lg:pl-64">
        {me.announcement && <p role="status" className="bg-[#EFEAFF] px-4 py-2.5 text-sm text-[#4A33B0] lg:px-6">{me.announcement}</p>}
        <Topbar onMenu={() => setMenu(true)} />
        {ws.plan_status === "past_due" && (
          <p role="alert" className="bg-warn-soft px-4 py-2.5 text-sm text-warn lg:px-6">Your last payment did not go through. <Link href="/settings?tab=billing" className="font-semibold underline">Update billing</Link> to keep your {ws.plan.name} plan.</p>
        )}
        {ws.plan_status === "lapsed" && (
          <p role="alert" className="bg-bad-soft px-4 py-2.5 text-sm text-bad lg:px-6">Your plan ended after a failed payment, so your account is on Free limits. <Link href="/settings?tab=billing" className="font-semibold underline">Choose a plan</Link> to restore it.</p>
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
        <footer className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-t border-line bg-surface px-4 py-4 text-[13px] text-muted lg:px-6">
          <span>© {new Date().getFullYear()} SiteRadar. All rights reserved.</span>
          <span>Powered by <a href={POWERED_BY.url} target="_blank" rel="noopener noreferrer" className="font-medium text-ink-2 hover:text-ink">{POWERED_BY.name}</a></span>
        </footer>
      </div>
    </div>
    </AddWebsiteProvider>
  );
}
