"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { send } from "@/lib/api";
import { btn, Icon, input } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await send("POST", "/api/auth/login", { username: form.get("username"), password: form.get("password") });
      router.replace("/websites");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-wrap">
      <div className="flex min-w-0 flex-[1_1_480px] flex-col justify-between gap-12 bg-nav px-8 py-12 text-nav-text lg:px-16 lg:py-14">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-[10px] bg-[#2f6bff]"><Icon.pulse /></span>
          <span className="text-[22px] font-semibold text-white">SiteWatch</span>
        </div>
        <div className="flex max-w-[520px] flex-col gap-7">
          <h1 className="text-4xl font-semibold leading-[1.12] text-white lg:text-[44px]">Every site you look after, in one place.</h1>
          <p className="text-[17px] leading-relaxed text-[#aeb7c6]">Uptime, traffic, audits and subscription costs for all your websites, with a report ready every month.</p>
          <ul className="flex flex-col gap-3.5 text-[15px]">
            {["Uptime, response time and SSL checks every 5 minutes", "Daily audits for SEO, speed, security and accessibility", "Domains, hosting and SaaS renewals with their invoices"].map((t) => (
              <li key={t} className="flex items-center gap-3"><span className="size-2 rounded-full bg-[#4fd08f]" />{t}</li>
            ))}
          </ul>
        </div>
        <span className="text-[13px] text-nav-muted">Upplause Consulting</span>
      </div>

      <div className="flex min-w-0 flex-[1_1_480px] items-center justify-center px-8 py-14">
        <div className="flex w-full max-w-[400px] flex-col gap-7">
          <div className="flex flex-col gap-2">
            <h2 className="text-[28px] font-semibold">Sign in</h2>
            <p className="text-[15px] text-muted">Use the team login to open the dashboard.</p>
          </div>
          <form onSubmit={submit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="username" className="text-sm font-medium">Username</label>
              <input id="username" name="username" autoComplete="username" required className={input} />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <input id="password" name="password" type="password" autoComplete="current-password" required className={input} />
            </div>
            {error && <p role="alert" className="rounded-lg bg-bad-soft px-3.5 py-2.5 text-sm text-bad">{error}</p>}
            <button type="submit" disabled={busy} className={`${btn.primary} min-h-12 text-[15px]`}>{busy ? "Signing in…" : "Sign in"}</button>
          </form>
          <p className="text-[13px] leading-relaxed text-muted">Trouble signing in? Ask the account owner to reset the shared password.</p>
        </div>
      </div>
    </div>
  );
}
