"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthShell, FormError } from "@/components/auth-shell";
import { btn, Field, input } from "@/components/ui";
import { send } from "@/lib/api";

const codes = [["+233", "GH +233"], ["+234", "NG +234"], ["+254", "KE +254"], ["+27", "ZA +27"], ["+44", "UK +44"], ["+1", "US +1"]];

function Form() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const local = String(f.get("phone") ?? "").replace(/\D/g, "").replace(/^0/, "");
    setBusy(true); setError(null);
    try {
      await send("POST", "/api/auth/register", {
        first_name: f.get("first_name"), last_name: f.get("last_name"), email: f.get("email"),
        phone: `${f.get("code")}${local}`, password: f.get("password"),
      });
      try { const plan = params.get("plan"); if (plan) sessionStorage.setItem("sitewatch.plan", JSON.stringify({ plan, cycle: params.get("cycle") ?? "monthly" })); } catch { /* optional */ }
      router.push(`/verify?email=${encodeURIComponent(String(f.get("email")))}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create your account.");
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-2"><h2 className="text-[28px] font-semibold">Create your account</h2><p className="text-[15px] text-muted">Start on the Free plan. No card needed.</p></div>
      <form onSubmit={submit} className="flex flex-col gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="First name" htmlFor="first_name"><input id="first_name" name="first_name" autoComplete="given-name" required className={input} /></Field>
          <Field label="Last name" htmlFor="last_name"><input id="last_name" name="last_name" autoComplete="family-name" required className={input} /></Field>
        </div>
        <Field label="Work email" htmlFor="email"><input id="email" name="email" type="email" autoComplete="email" required className={input} /></Field>
        <Field label="Phone number" htmlFor="phone">
          <div className="flex gap-2">
            <select name="code" aria-label="Country code" className={`${input} !w-32 shrink-0`}>{codes.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel-national" required placeholder="24 123 4567" className={input} />
          </div>
          <span className="text-[13px] text-muted">Used for SMS alerts. You can change it later.</span>
        </Field>
        <Field label="Password" htmlFor="password">
          <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required className={input} />
          <span className="text-[13px] text-muted">At least 8 characters. A longer phrase is stronger.</span>
        </Field>
        <label className="flex gap-3 text-sm leading-relaxed"><input type="checkbox" required className="mt-1 size-4 shrink-0" />
          <span>I agree to the <Link href="/contact" className="font-semibold text-brand">Terms</Link> and <Link href="/contact" className="font-semibold text-brand">Privacy Policy</Link>.</span></label>
        <FormError message={error} />
        <button type="submit" disabled={busy} className={`${btn.primary} min-h-12 text-[15px]`}>{busy ? "Creating account…" : "Create account"}</button>
      </form>
      <p className="text-sm text-muted">Already have an account? <Link href="/login" className="font-semibold text-brand">Log in</Link></p>
    </>
  );
}

export default function SignupPage() {
  return (
    <AuthShell variant="signup">
      <Suspense><Form /></Suspense>
    </AuthShell>
  );
}
