import Link from "next/link";
import { Check } from "lucide-react";
import { POWERED_BY } from "@/lib/brand";
import { Logo } from "./logo";

const CHECKS = {
  signup: { title: "Put your first website on the radar in minutes.", points: ["The Free plan is free for ever. No card needed.", "Uptime, SSL, domain, DNS and email checks start straight away.", "Alerts only after two failed checks, so no false alarms.", "A clear report in your inbox on the 1st of every month."] },
  verify: { title: "One quick step to keep your account safe.", text: "We email a 6-digit code to confirm that the address is yours.", points: ["The code expires in 15 minutes", "Check your spam folder if it does not arrive", "You can ask for a new code any time"] },
  forgot: { title: "Locked out? It happens.", text: "Enter your email and we will send a 6-digit code to set a new password.", points: ["The code expires in 15 minutes", "Your websites keep being monitored meanwhile", "You can ask for a new code any time"] },
  invite: { title: "You have been invited to join a team.", text: "Set a password and you will see the websites your team looks after.", points: ["See uptime, speed and reports", "Get alerts for the sites you choose", "Your access is set by the team admin"] },
} as const;

export type AuthVariant = "login" | keyof typeof CHECKS;

function Panel({ variant }: { variant: AuthVariant }) {
  return (
    <aside className="relative hidden min-w-0 flex-[1_1_480px] flex-col justify-between gap-12 overflow-hidden bg-[#0F172A] p-12 text-white lg:flex">
      <svg viewBox="0 0 800 800" aria-hidden="true" className="pointer-events-none absolute -bottom-[380px] -right-[380px] size-[900px]">
        <g fill="none" stroke="#F97316" strokeWidth="2"><circle cx="400" cy="400" r="130" strokeOpacity="0.24" /><circle cx="400" cy="400" r="230" strokeOpacity="0.16" /><circle cx="400" cy="400" r="330" strokeOpacity="0.1" /><path d="M400 400L230 230" strokeOpacity="0.3" /></g>
        <circle cx="230" cy="230" r="8" fill="#FBA23C" fillOpacity="0.75" />
      </svg>
      <Link href="/" aria-label="SiteRadar home" className="relative w-fit"><Logo dark height={64} /></Link>

      <div className="relative flex max-w-[480px] flex-col gap-5">
        {variant === "login" ? (
          <>
            <h1 className="text-[clamp(32px,3.6vw,46px)] font-bold leading-[1.08] tracking-[-0.03em]">Welcome back. Your radar has been watching.</h1>
            <p className="text-lg text-[#CBD5E1]">Log in to see uptime, expiry dates, audit results and visitors for every website you look after.</p>
            <div role="img" aria-label="Summary: 8 of 8 sites up, 1 SSL certificate expiring in 28 days" className="flex flex-col gap-2.5 rounded-2xl border border-[#334155] bg-[#1E293B] p-[18px]">
              <div className="flex items-center justify-between"><span className="text-sm text-[#CBD5E1]">Sites up</span><span className="font-mono text-xl font-semibold">8 <span className="text-sm text-[#94A3B8]">of 8</span></span></div>
              <div className="flex h-[18px] gap-[3px]">{Array.from({ length: 8 }, (_, i) => <span key={i} className="flex-1 rounded-[3px] bg-[#16A34A]" />)}</div>
              <div className="text-sm text-[#FDBA74]"><span className="font-mono font-semibold">28 d</span> · SSL expiry on shop.example.com</div>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-[clamp(32px,3.6vw,46px)] font-bold leading-[1.08] tracking-[-0.03em]">{CHECKS[variant].title}</h1>
            {"text" in CHECKS[variant] && <p className="text-lg text-[#CBD5E1]">{(CHECKS[variant] as { text: string }).text}</p>}
            <ul className="flex flex-col gap-3.5 text-[17px] text-[#E2E8F0]">
              {CHECKS[variant].points.map((t) => <li key={t} className="flex gap-3"><Check size={22} strokeWidth={2.4} className="mt-0.5 flex-none text-[#FDBA74]" aria-hidden="true" />{t}</li>)}
            </ul>
          </>
        )}
      </div>

      <p className="relative text-sm text-[#94A3B8]">© {new Date().getFullYear()} SiteRadar · Powered by <a href={POWERED_BY.url} target="_blank" rel="noopener noreferrer" className="font-medium text-[#E2E8F0] hover:text-white">{POWERED_BY.name}</a></p>
    </aside>
  );
}

/** Sign-in pages: the dark brand panel on the left, the form on the right. */
export function AuthShell({ variant, width = 420, children }: { variant: AuthVariant; width?: number; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-wrap bg-[#FBF8F4] text-[#0F172A]">
      <Panel variant={variant} />
      <main className="flex min-w-0 flex-[1_1_480px] flex-col items-center justify-center gap-8 px-6 py-12">
        <Link href="/" aria-label="SiteRadar home" className="w-fit lg:hidden"><Logo height={48} /></Link>
        <div className="flex w-full flex-col gap-5" style={{ maxWidth: width }}>{children}</div>
      </main>
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  return message ? <p role="alert" className="rounded-lg bg-[#FEE2E2] px-3.5 py-2.5 text-sm text-[#991B1B]">{message}</p> : null;
}

/** Field styling used by the sign-in and sign-up forms. */
export const authInput = "w-full rounded-[10px] border border-[#CBD5E1] bg-white px-3.5 py-[13px] text-base text-[#0F172A] placeholder:text-[#94A3B8] focus-visible:!outline-[#F97316]";
export const authLabel = "text-sm font-semibold";
export const authButton = "rounded-xl bg-[#F97316] py-[15px] text-base font-bold text-white hover:bg-[#EA580C] disabled:opacity-60";
