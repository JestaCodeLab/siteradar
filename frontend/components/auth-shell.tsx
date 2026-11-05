import Link from "next/link";
import { Logo } from "./mkt";

export function AuthShell({ headline, bullets, children }: { headline: string; bullets?: string[]; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-wrap">
      <div className="hidden min-w-0 flex-[1_1_480px] flex-col justify-between gap-12 bg-nav px-8 py-12 text-nav-text lg:flex lg:px-16 lg:py-14">
        <Link href="/" aria-label="SiteWatch home"><Logo dark /></Link>
        <div className="flex max-w-[520px] flex-col gap-7">
          <h1 className="text-4xl font-semibold leading-[1.12] text-white lg:text-[44px]">{headline}</h1>
          {bullets && <ul className="flex flex-col gap-3.5 text-[15px]">{bullets.map((t) => <li key={t} className="flex items-center gap-3"><span className="size-2 rounded-full bg-[#4fd08f]" />{t}</li>)}</ul>}
        </div>
        <span className="text-[13px] text-nav-muted">Powered by Upplause Consulting</span>
      </div>
      <div className="flex min-w-0 flex-[1_1_480px] flex-col px-6 py-8 sm:px-8">
        <Link href="/" aria-label="SiteWatch home" className="mb-8 w-fit lg:hidden"><Logo /></Link>
        <div className="flex flex-1 items-center justify-center py-6"><div className="flex w-full max-w-[420px] flex-col gap-7">{children}</div></div>
      </div>
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  return message ? <p role="alert" className="rounded-lg bg-bad-soft px-3.5 py-2.5 text-sm text-bad">{message}</p> : null;
}
