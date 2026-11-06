"use client";

import { ghanaPhone } from "@/lib/format";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthShell, authButton, authInput, authLabel, FormError } from "@/components/auth-shell";
import { send } from "@/lib/api";

function Form() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const phone = ghanaPhone(String(f.get("phone") ?? ""));
    if (!phone) { setError("Enter a Ghana phone number, for example 024 123 4567."); return; }
    setBusy(true); setError(null);
    try {
      await send("POST", "/api/auth/register", { first_name: f.get("first_name"), last_name: f.get("last_name"), email: f.get("email"), phone, password: f.get("password") });
      try { const plan = params.get("plan"); if (plan) sessionStorage.setItem("sitewatch.plan", JSON.stringify({ plan, cycle: params.get("cycle") ?? "monthly" })); } catch { /* optional */ }
      router.push(`/verify?email=${encodeURIComponent(String(f.get("email")))}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create your account.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} aria-label="Create your account" className="flex flex-col gap-[18px]">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-[32px] font-bold tracking-[-0.03em]">Create your free account</h2>
        <p className="text-[#475569]">Already have an account? <Link href="/login" className="font-bold text-[#C2410C] hover:text-[#7C2D12]">Log in</Link></p>
      </div>
      <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        <div className="flex flex-col gap-1.5"><label htmlFor="first_name" className={authLabel}>First name</label><input id="first_name" name="first_name" autoComplete="given-name" required className={authInput} /></div>
        <div className="flex flex-col gap-1.5"><label htmlFor="last_name" className={authLabel}>Last name</label><input id="last_name" name="last_name" autoComplete="family-name" required className={authInput} /></div>
      </div>
      <div className="flex flex-col gap-1.5"><label htmlFor="email" className={authLabel}>Email</label><input id="email" name="email" type="email" autoComplete="email" required placeholder="you@company.com" className={authInput} /></div>
      <div className="flex flex-col gap-1.5"><label htmlFor="phone" className={authLabel}>Phone</label><input id="phone" name="phone" type="tel" autoComplete="tel" required placeholder="+233 20 000 0000" className={authInput} /></div>
      <div className="flex flex-col gap-1.5"><label htmlFor="password" className={authLabel}>Password</label><input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required className={authInput} /></div>
      <label className="flex cursor-pointer items-start gap-2.5 text-sm text-[#334155]"><input type="checkbox" required className="mt-px size-[18px] flex-none accent-[#F97316]" />
        <span>I agree to the <Link href="/contact" className="font-semibold text-[#C2410C] hover:text-[#7C2D12]">Terms of Service</Link> and <Link href="/contact" className="font-semibold text-[#C2410C] hover:text-[#7C2D12]">Privacy Policy</Link>.</span></label>
      <FormError message={error} />
      <button type="submit" disabled={busy} className={authButton}>{busy ? "Creating account…" : "Create free account"}</button>
    </form>
  );
}

export default function SignupPage() {
  return <AuthShell variant="signup" width={480}><Suspense><Form /></Suspense></AuthShell>;
}
