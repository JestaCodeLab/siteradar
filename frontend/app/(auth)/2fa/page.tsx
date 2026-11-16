"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { mutate } from "swr";
import { AuthShell, authButton, authInput, authLabel, FormError } from "@/components/auth-shell";
import { send, type Me } from "@/lib/api";
import { homeFor, useMe } from "@/lib/me";

/** The second step of a super admin's sign-in: the six digits from an authenticator app. The first time, the app is set up here. */
export default function TwoFactorPage() {
  const router = useRouter();
  const { me, isLoading } = useMe();
  const [setup, setSetup] = useState<{ secret: string; uri: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = me?.mfa_pending ?? null;

  useEffect(() => {
    if (isLoading || !me) return;
    if (!me.authenticated) router.replace("/login");
    else if (!me.mfa_pending) router.replace(homeFor(me));
  }, [me, isLoading, router]);

  async function begin() {
    setBusy(true); setError(null);
    try { setSetup(await send<{ secret: string; uri: string }>("POST", "/api/auth/2fa/setup")); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not start the setup."); }
    setBusy(false);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get("code") ?? "");
    setBusy(true); setError(null);
    try {
      const next = await send<Me>("POST", pending === "setup" ? "/api/auth/2fa/enable" : "/api/auth/2fa/verify", { code });
      await mutate("/api/auth/me", next, false);
      router.replace(homeFor(next));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not check the code.");
      setBusy(false);
    }
  }

  if (!pending) return <main className="flex min-h-screen items-center justify-center text-[#475569]" role="status">Loading…</main>;
  const asking = pending === "verify" || !!setup;

  return (
    <AuthShell variant="login">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-[32px] font-bold tracking-[-0.03em]">{pending === "setup" ? "Set up two-factor sign-in" : "Enter your code"}</h2>
          <p className="text-[#475569]">
            {pending === "setup" ? "Admin accounts need a second step. Use an authenticator app such as Google Authenticator, 1Password or Authy." : "Open your authenticator app and type the 6-digit code for SiteRadar."}
          </p>
        </div>
        {pending === "setup" && !setup && <button type="button" onClick={begin} disabled={busy} className={authButton}>{busy ? "Starting…" : "Start setup"}</button>}
        {setup && (
          <div className="flex flex-col gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-sm text-[#475569]">
            <p>1. In your app, add an account and choose <b>enter a setup key</b>. On a phone you can also <a className="font-semibold text-[#C2410C]" href={setup.uri}>open it in your app</a>.</p>
            <p className="break-all rounded-lg bg-white p-3 font-mono text-base tracking-wider text-[#0F172A]" aria-label="Setup key">{setup.secret}</p>
            <p>2. Type the 6-digit code the app shows to finish.</p>
          </div>
        )}
        {asking && (
          <form onSubmit={submit} aria-label="Two-factor code" className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="code" className={authLabel}>6-digit code</label>
              <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} required autoFocus placeholder="123 456" className={authInput} />
            </div>
            <FormError message={error} />
            <button type="submit" disabled={busy} className={authButton}>{busy ? "Checking…" : pending === "setup" ? "Turn on and continue" : "Continue"}</button>
          </form>
        )}
        {!asking && <FormError message={error} />}
        <button type="button" className="text-sm font-semibold text-[#C2410C] hover:text-[#7C2D12]" onClick={() => send("POST", "/api/auth/logout").finally(() => { window.location.href = "/login"; })}>Use a different account</button>
      </div>
    </AuthShell>
  );
}
