"use client";

import { useToast } from "@/components/toast";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AuthShell, FormError } from "@/components/auth-shell";
import { btn, input } from "@/components/ui";
import { send, type Me } from "@/lib/api";
import { homeFor } from "@/lib/me";

function Form() {
  const router = useRouter();
  const email = useSearchParams().get("email") ?? "";
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(45);
  const toast = useToast();

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const me = await send<Me>("POST", "/api/auth/verify", { email, code });
      router.replace(homeFor(me));
    } catch (err) {
      setError(err instanceof Error ? err.message : "That code did not work.");
      setBusy(false);
    }
  }

  async function resend() {
    setError(null);
    try { await send("POST", "/api/auth/resend", { email }); toast.success("A new code is on its way."); setWait(60); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not send a new code."); }
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <h2 className="text-[28px] font-semibold">Check your email</h2>
        <p className="text-[15px] leading-relaxed text-muted">We sent a 6-digit code to <b className="text-ink">{email}</b>. Enter it below to verify your account.</p>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-3.5">
        <label htmlFor="code" className="sr-only">6-digit code</label>
        <input id="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} autoFocus
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="000000"
          className={`${input} min-h-16 text-center font-mono text-[32px] tracking-[0.5em]`} />
        <FormError message={error} />
        <button disabled={busy || code.length !== 6} className={`${btn.primary} min-h-12 text-[15px]`}>{busy ? "Verifying…" : "Verify and continue"}</button>
      </form>
      <div className="flex flex-col gap-2 text-sm text-muted">
        {wait > 0 ? <span>Did not get it? Resend in 0:{String(wait).padStart(2, "0")}</span>
          : <button onClick={resend} className="w-fit font-semibold text-brand">Send a new code</button>}
        <span>Wrong address? <Link href="/signup" className="font-semibold text-brand">Change email</Link></span>
      </div>
    </>
  );
}

export default function VerifyPage() {
  return <AuthShell variant="verify"><Suspense><Form /></Suspense></AuthShell>;
}
