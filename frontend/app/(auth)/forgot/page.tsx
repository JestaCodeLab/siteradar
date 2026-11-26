"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthShell, FormError } from "@/components/auth-shell";
import { btn, Field, input } from "@/components/ui";
import { send } from "@/lib/api";

function Form() {
  const router = useRouter();
  const params = useSearchParams();
  // set when an email address was just confirmed from a browser that did not choose the password: a reset code is already on its way
  const verified = params.get("verified") === "1";
  const [step, setStep] = useState<"email" | "reset">(verified ? "reset" : "email");
  const [email, setEmail] = useState(verified ? params.get("email") ?? "" : "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function ask(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(null);
    try { await send("POST", "/api/auth/forgot", { email }); setStep("reset"); }
    catch (err) { setError(err instanceof Error ? err.message : "Something went wrong."); }
    setBusy(false);
  }
  async function reset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget); setBusy(true); setError(null);
    try { await send("POST", "/api/auth/reset", { email, code: f.get("code"), password: f.get("password") }); router.replace("/login"); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not reset your password."); setBusy(false); }
  }

  return (
    <>
      {step === "email" ? (
        <>
          <div className="flex flex-col gap-2"><h2 className="text-[28px] font-semibold">Reset your password</h2><p className="text-[15px] text-muted">Enter your email and we will send you a 6-digit code.</p></div>
          <form onSubmit={ask} className="flex flex-col gap-3.5">
            <Field label="Email" htmlFor="email"><input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={input} /></Field>
            <FormError message={error} />
            <button disabled={busy} className={`${btn.primary} min-h-12 text-[15px]`}>{busy ? "Sending…" : "Send code"}</button>
          </form>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-2"><h2 className="text-[28px] font-semibold">Choose a new password</h2><p className="text-[15px] text-muted">{verified ? `Your email address is confirmed. To keep your account safe, choose your password again: we sent a new code to ${email}.` : `If an account exists for ${email}, a code is on its way.`}</p></div>
          <form onSubmit={reset} className="flex flex-col gap-3.5">
            <Field label="6-digit code" htmlFor="code"><input id="code" name="code" inputMode="numeric" maxLength={6} required className={`${input} font-mono tracking-widest`} /></Field>
            <Field label="New password" htmlFor="password" hint="at least 8 characters"><input id="password" name="password" type="password" minLength={8} required autoComplete="new-password" className={input} /></Field>
            <FormError message={error} />
            <button disabled={busy} className={`${btn.primary} min-h-12 text-[15px]`}>{busy ? "Saving…" : "Save new password"}</button>
          </form>
        </>
      )}
      <p className="text-sm text-muted"><Link href="/login" className="font-semibold text-brand">Back to log in</Link></p>
    </>
  );
}

export default function ForgotPage() {
  return <AuthShell variant="forgot"><Suspense><Form /></Suspense></AuthShell>;
}
