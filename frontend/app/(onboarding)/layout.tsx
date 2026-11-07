"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Logo } from "@/components/mkt";
import { useMe } from "@/lib/me";
import { useLogoutConfirm } from "@/components/confirm-logout";

const steps = [["company", "Company"], ["plan", "Plan"], ["done", "Done"]];

/** True for two minutes after the plan step was completed, while the saved state catches up. */
function finishingNow() {
  try { return Date.now() - Number(sessionStorage.getItem("sitewatch.finishing") || 0) < 120000; } catch { return false; }
}

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { me, ws, isLoading, mutate } = useMe();
  const current = steps.findIndex(([k]) => path.endsWith(k));

  useEffect(() => {
    if (isLoading) return;
    if (!me?.authenticated) { router.replace("/login"); return; }
    if (ws?.onboarded && !path.endsWith("/done")) {
      // just finished the plan step: the finish page is next, not the dashboard
      router.replace(finishingNow() ? "/onboarding/done" : "/overview");
    }
    else if (!ws?.onboarded && path.endsWith("/done") && !finishingNow()) router.replace(ws ? "/onboarding/plan" : "/onboarding/company");   // no plan yet: no finish page
    else if (!ws && path.endsWith("/plan")) router.replace("/onboarding/company");                                        // no company yet: no plan step
  }, [me, ws, isLoading, path, router]);

  const { ask: askLogout, dialog: logoutDialog } = useLogoutConfirm(async () => { await mutate(); router.replace("/login"); });

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex min-h-[68px] max-w-[1100px] flex-wrap items-center justify-between gap-4 px-5 py-2">
          <Link href="/" aria-label="SiteRadar home"><Logo /></Link>
          <ol className="flex items-center gap-2 text-sm" aria-label="Progress">
            {steps.map(([k, label], i) => (
              <li key={k} aria-current={i === current ? "step" : undefined} className="flex items-center gap-2">
                <span className={`flex size-7 items-center justify-center rounded-full text-xs font-semibold ${i < current ? "bg-ok text-white" : i === current ? "bg-brand text-white" : "bg-line text-muted"}`}>{i < current ? "✓" : i + 1}</span>
                <span className={`hidden sm:block ${i === current ? "font-semibold" : "text-muted"}`}>{label}</span>
                {i < steps.length - 1 && <span className="h-px w-6 bg-line" />}
              </li>
            ))}
          </ol>
          <button onClick={askLogout} className="min-h-11 text-sm font-semibold text-ink-2 hover:text-ink">Log out</button>
        </div>
      </header>
      <main className="mx-auto max-w-[1100px] px-5 py-10">{children}</main>
      {logoutDialog}
    </div>
  );
}
