"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { fetcher, type Me } from "@/lib/api";
import { useMe } from "@/lib/me";

function Verify() {
  const router = useRouter();
  const params = useSearchParams();
  const ref = params.get("reference") ?? params.get("trxref") ?? "";
  const { mutate } = useMe();
  const [state, setState] = useState<"checking" | "ok" | "failed">("checking");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let tries = 0;
    async function check() {
      try {
        const r = await fetcher<{ status: string }>(`/api/billing/verify?reference=${encodeURIComponent(ref)}`);
        if (r.status === "success") {
          setState("ok"); await mutate();
          let onboarding = false; try { onboarding = sessionStorage.getItem("sitewatch.onboarding") === "1"; } catch { /* optional */ }
          setTimeout(() => router.replace(onboarding ? "/onboarding/done" : "/settings?tab=billing"), 1200);
        } else if (r.status === "pending" && tries++ < 5) setTimeout(check, 2500);
        else { setState("failed"); setMsg("The payment was not completed."); }
      } catch (e) { setState("failed"); setMsg(e instanceof Error ? e.message : "We could not check the payment."); }
    }
    void fetcher<Me>("/api/auth/me").then(check);
  }, [ref, mutate, router]);

  return (
    <div className="mx-auto mt-16 flex max-w-md flex-col items-center gap-4 text-center">
      {state === "checking" && <><h1 className="text-2xl font-semibold">Confirming your payment…</h1><p className="text-muted">This takes a few seconds. Please do not close this page.</p></>}
      {state === "ok" && <><h1 className="text-2xl font-semibold">Payment received</h1><p className="text-muted">Your plan is active. Taking you back…</p></>}
      {state === "failed" && <><h1 className="text-2xl font-semibold">Payment not confirmed</h1><p className="text-muted">{msg} If you were charged, it will appear on your account shortly, or contact us.</p>
        <Link href="/settings?tab=billing" className="inline-flex min-h-11 items-center rounded-lg bg-brand px-5 font-semibold text-white">Back to billing</Link></>}
    </div>
  );
}

export default function BillingCallback() { return <Suspense><Verify /></Suspense>; }
