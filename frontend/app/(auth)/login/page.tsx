"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell, FormError } from "@/components/auth-shell";
import { btn, Field, input } from "@/components/ui";
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
      const me = await send<Me>("POST", "/api/auth/login", { email: f.get("email"), password: f.get("password") });
      router.replace(homeFor(me));
    } catch (err) {
      if (err instanceof ApiError && err.code === "unverified") { router.push(`/verify?email=${encodeURIComponent(String(f.get("email")))}`); return; }
      setError(err instanceof Error ? err.message : "Could not sign in.");
      setBusy(false);
    }
  }

  return (
    <AuthShell headline="Every site you look after, in one place." bullets={["Uptime, response time and SSL checks around the clock", "Daily audits for SEO, speed, security and accessibility", "A clear report for every website, every month"]}>
      <div className="flex flex-col gap-2"><h2 className="text-[28px] font-semibold">Log in</h2><p className="text-[15px] text-muted">Welcome back. Enter your details to open your dashboard.</p></div>
      <form onSubmit={submit} className="flex flex-col gap-5">
        <Field label="Email" htmlFor="email"><input id="email" name="email" type="email" autoComplete="email" required className={input} /></Field>
        <Field label="Password" htmlFor="password"><input id="password" name="password" type="password" autoComplete="current-password" required className={input} /></Field>
        <Link href="/forgot" className="w-fit text-sm font-semibold text-brand">Forgot your password?</Link>
        <FormError message={error} />
        <button type="submit" disabled={busy} className={`${btn.primary} min-h-12 text-[15px]`}>{busy ? "Logging in…" : "Log in"}</button>
      </form>
      <p className="text-sm text-muted">New to SiteRadar? <Link href="/signup" className="font-semibold text-brand">Create an account</Link></p>
    </AuthShell>
  );
}
