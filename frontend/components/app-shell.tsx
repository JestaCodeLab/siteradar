"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { send } from "@/lib/api";
import { useMe } from "@/lib/me";
import { Skeleton } from "./ui";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

function mmss(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function SupportBanner({ until, reason, mode, workspace }: { until: number; reason: string; mode: string; workspace: string }) {
  const router = useRouter();
  const { mutate } = useMe();
  const [now, setNow] = useState(0);
  useEffect(() => { const tick = () => setNow(Date.now() / 1000); const t = setInterval(tick, 1000); const first = setTimeout(tick, 0); return () => { clearInterval(t); clearTimeout(first); }; }, []);
  const left = now ? until - now : 0;
  useEffect(() => { if (now && until - now <= 0) { mutate().then(() => router.replace("/admin")); } }, [now, until, mutate, router]);
  async function exit() { await send("POST", "/api/admin/support/stop").catch(() => {}); await mutate(); router.replace("/admin"); }
  return (
    <div role="status" className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 bg-[#5b3fd1] px-4 py-2.5 text-sm text-white lg:px-6">
      <span><b>Viewing {workspace}</b> · {mode === "edit" ? "Full access" : "View only"} · Reason: {reason} · ends in {now ? mmss(left) : "…"} · the customer is not notified</span>
      <button onClick={exit} className="min-h-9 rounded-lg bg-white/15 px-3.5 font-semibold hover:bg-white/25">Exit session</button>
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

  if (!me?.authenticated || !ws) return <div className="p-8"><Skeleton className="h-10 w-64" /></div>;
  void mutate;

  return (
    <div className="min-h-screen">
      <Sidebar open={menu} onClose={() => setMenu(false)} />
      <div className="flex min-h-screen flex-col lg:pl-64">
        {me.support && <SupportBanner {...me.support} workspace={ws.name} />}
        <Topbar onMenu={() => setMenu(true)} />
        {ws.plan_status === "past_due" && (
          <p role="alert" className="bg-warn-soft px-4 py-2.5 text-sm text-warn lg:px-6">Your last payment did not go through. <Link href="/billing" className="font-semibold underline">Update billing</Link> to keep your {ws.plan.name} plan.</p>
        )}
        {ws.plan_status === "lapsed" && (
          <p role="alert" className="bg-bad-soft px-4 py-2.5 text-sm text-bad lg:px-6">Your plan ended after a failed payment, so your account is on Free limits. <Link href="/billing" className="font-semibold underline">Choose a plan</Link> to restore it.</p>
        )}
        {ws.role === "viewer" && <p className="bg-line-soft px-4 py-2.5 text-sm text-ink-2 lg:px-6"><b>You have view-only access.</b> You can see dashboards and reports. Ask an admin if you need to change something.</p>}
        <main className="min-w-0 flex-1 px-4 py-5 lg:px-6">
          <div className="mx-auto flex max-w-[1400px] flex-col gap-5">{children}</div>
        </main>
        <footer className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-t border-line bg-surface px-4 py-4 text-[13px] text-muted lg:px-6">
          <span>© {new Date().getFullYear()} SiteWatch. All rights reserved.</span>
          <span>Powered by <span className="font-medium text-ink-2">Upplause Consulting</span></span>
        </footer>
      </div>
    </div>
  );
}
