"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell, authButton, authInput, authLabel, FormError } from "@/components/auth-shell";
import { ApiError, send, type Me } from "@/lib/api";
import { homeFor } from "@/lib/me";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true); setError(null);
    try {
      const me = await send<Me>("POST", "/api/auth/login", { email: f.get("email"), password: f.get("password"), remember: f.get("remember") === "on" });
      router.replace(homeFor(me));
    } catch (err) {
      if (err instanceof ApiError && err.code === "unverified") { router.push(`/verify?email=${encodeURIComponent(String(f.get("email")))}`); return; }
      setError(err instanceof Error ? err.message : "Could not sign in.");
      setBusy(false);
    }
  }

  return (
    <AuthShell variant="login">
      <form onSubmit={submit} aria-label="Log in" className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-[32px] font-bold tracking-[-0.03em]">Log in</h2>
          <p className="text-[#475569]">New to SiteRadar? <Link href="/signup" className="font-bold text-[#C2410C] hover:text-[#7C2D12]">Create an account</Link></p>
        </div>
        <div className="flex flex-col gap-1.5"><label htmlFor="email" className={authLabel}>Email</label><input id="email" name="email" type="email" autoComplete="email" required placeholder="you@company.com" className={authInput} /></div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between"><label htmlFor="password" className={authLabel}>Password</label><Link href="/forgot" className="text-sm font-semibold text-[#C2410C] hover:text-[#7C2D12]">Forgot password?</Link></div>
          <input id="password" name="password" type="password" autoComplete="current-password" required className={authInput} />
        </div>
        <label className="flex cursor-pointer items-center gap-2.5 text-[15px] text-[#334155]"><input type="checkbox" name="remember" defaultChecked className="size-[18px] accent-[#F97316]" />Keep me logged in on this device</label>
        <FormError message={error} />
        <button type="submit" disabled={busy} className={authButton}>{busy ? "Logging in…" : "Log in"}</button>
        <p className="text-center text-sm text-[#475569]">Trouble logging in? <Link href="/contact" className="font-semibold text-[#C2410C] hover:text-[#7C2D12]">Contact us</Link></p>
      </form>
    </AuthShell>
  );
}
