import Link from "next/link";
import { POWERED_BY } from "@/lib/brand";
import { Logo } from "./logo";

/** What the dark left column says on each screen. */
export const ASIDE = {
  login: { headline: "Welcome back. Your websites are in good hands.", text: "Log in to see what happened while you were away.", points: ["Every site, one dashboard", "Alerts by SMS, email and chat", "Monthly reports for your clients"] },
  signup: { headline: "Start watching your websites in minutes.", text: "Create your account, add a website and get your first check straight away.", points: ["Free plan, no card needed", "Upgrade or cancel any time", "Set up in about 5 minutes"] },
  verify: { headline: "One quick step to keep your account safe.", text: "We email a 6-digit code to confirm that the address is yours.", points: ["The code expires in 15 minutes", "Check your spam folder if it does not arrive", "You can ask for a new code any time"] },
  forgot: { headline: "Locked out? It happens.", text: "Enter your email and we will send a 6-digit code to set a new password.", points: ["The code expires in 15 minutes", "Your websites keep being monitored meanwhile", "You can ask for a new code any time"] },
  invite: { headline: "You have been invited to join a team.", text: "Set a password and you will see the websites your team looks after.", points: ["See uptime, speed and reports", "Get alerts for the sites you choose", "Your access is set by the team admin"] },
} as const;

export function AuthShell({ variant, children }: { variant: keyof typeof ASIDE; children: React.ReactNode }) {
  const a = ASIDE[variant];
  return (
    <div className="flex min-h-screen flex-wrap">
      <div className="relative hidden min-w-0 flex-[1_1_480px] flex-col justify-between gap-10 overflow-hidden bg-[#0F172A] px-8 py-12 text-[#CBD5E1] lg:flex lg:px-14">
        <svg viewBox="0 0 800 800" aria-hidden="true" className="pointer-events-none absolute -bottom-[260px] -right-[260px] size-[760px]">
          <g fill="none" stroke="#F97316" strokeWidth="2"><circle cx="400" cy="400" r="120" strokeOpacity="0.22" /><circle cx="400" cy="400" r="220" strokeOpacity="0.16" /><circle cx="400" cy="400" r="320" strokeOpacity="0.11" /><circle cx="400" cy="400" r="400" strokeOpacity="0.07" /><path d="M400 400L640 160" strokeOpacity="0.25" /></g>
          <circle cx="560" cy="300" r="6" fill="#FBA23C" fillOpacity="0.7" /><circle cx="250" cy="520" r="5" fill="#F97316" fillOpacity="0.5" />
        </svg>
        <Link href="/" aria-label="SiteRadar home" className="relative w-fit"><Logo dark height={52} /></Link>
        <div className="relative flex max-w-[480px] flex-col gap-6">
          <h1 className="text-[38px] font-bold leading-[1.1] tracking-[-0.03em] text-white">{a.headline}</h1>
          <p className="text-[17px] leading-relaxed text-[#CBD5E1]">{a.text}</p>
          <ul className="flex flex-col gap-3.5 text-[15px]">{a.points.map((t) => <li key={t} className="flex items-center gap-3"><span className="size-2 flex-none rounded-full bg-[#F97316]" />{t}</li>)}</ul>
        </div>
        <span className="relative text-[13px] text-[#94A3B8]">Powered by <a href={POWERED_BY.url} target="_blank" rel="noopener noreferrer" className="font-medium text-[#E2E8F0] hover:text-white">{POWERED_BY.name}</a></span>
      </div>
      <div className="flex min-w-0 flex-[1_1_480px] flex-col px-6 py-8 sm:px-8">
        <Link href="/" aria-label="SiteRadar home" className="mb-8 w-fit lg:hidden"><Logo /></Link>
        <div className="flex flex-1 items-center justify-center py-6"><div className="flex w-full max-w-[420px] flex-col gap-7">{children}</div></div>
      </div>
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  return message ? <p role="alert" className="rounded-lg bg-bad-soft px-3.5 py-2.5 text-sm text-bad">{message}</p> : null;
}
