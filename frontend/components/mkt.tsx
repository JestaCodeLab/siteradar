"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon } from "./ui";

export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className={`flex size-[34px] items-center justify-center rounded-[9px] ${dark ? "bg-[#2f6bff]" : "bg-brand"}`}><Icon.pulse /></span>
      <span className={`text-[19px] font-semibold ${dark ? "text-white" : ""}`}>SiteRadar</span>
    </span>
  );
}

const links = [
  { href: "/", label: "Home" }, { href: "/solutions", label: "Solutions" },
  { href: "/pricing", label: "Pricing" }, { href: "/contact", label: "Contact" },
];

export function MktHeader() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface">
      <div className="mx-auto flex min-h-[72px] max-w-[1200px] items-center justify-between gap-4 px-5 lg:px-10">
        <Link href="/" aria-label="SiteRadar home"><Logo /></Link>
        <nav aria-label="Main" className="hidden gap-1 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} aria-current={path === l.href ? "page" : undefined}
              className={`flex min-h-11 items-center rounded-lg px-4 text-[15px] ${path === l.href ? "bg-brand-soft font-semibold text-brand-ink" : "font-medium text-ink-2 hover:bg-soft"}`}>{l.label}</Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Link href="/login" className="flex min-h-11 items-center px-4 text-[15px] font-semibold">Log in</Link>
          <Link href="/signup" className="flex min-h-11 items-center rounded-lg bg-brand px-5 text-[15px] font-semibold text-white hover:bg-brand-ink">Get started free</Link>
        </div>
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Menu" className="flex size-11 items-center justify-center rounded-lg hover:bg-soft md:hidden"><Icon.menu /></button>
      </div>
      {open && (
        <div className="flex flex-col gap-1 border-t border-line px-5 py-3 md:hidden">
          {links.map((l) => <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="flex min-h-11 items-center rounded-lg px-3 font-medium hover:bg-soft">{l.label}</Link>)}
          <Link href="/login" className="flex min-h-11 items-center px-3 font-semibold">Log in</Link>
          <Link href="/signup" className="flex min-h-11 items-center justify-center rounded-lg bg-brand font-semibold text-white">Get started free</Link>
        </div>
      )}
    </header>
  );
}

export function MktFooter() {
  const col = "flex min-h-9 items-center text-[15px] hover:text-white";
  return (
    <footer className="bg-nav px-5 pb-7 pt-16 text-nav-text lg:px-10">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-12">
        <div className="flex flex-wrap justify-between gap-x-16 gap-y-12">
          <div className="flex max-w-[360px] flex-1 basis-72 flex-col gap-4">
            <Logo dark />
            <p className="text-[15px] leading-relaxed">Website monitoring, domain and DNS health, analytics and monthly reports for the people who look after websites.</p>
          </div>
          <div className="flex flex-wrap gap-x-[72px] gap-y-10">
            <div className="flex flex-col"><span className="mb-2 text-sm font-semibold text-white">Product</span>
              <Link href="/solutions" className={col}>Solutions</Link><Link href="/pricing" className={col}>Pricing</Link><Link href="/signup" className={col}>Get started free</Link></div>
            <div className="flex flex-col"><span className="mb-2 text-sm font-semibold text-white">Company</span>
              <Link href="/contact" className={col}>Contact</Link><Link href="/" className={col}>Home</Link></div>
            <div className="flex flex-col"><span className="mb-2 text-sm font-semibold text-white">Account</span>
              <Link href="/login" className={col}>Log in</Link><Link href="/signup" className={col}>Sign up</Link></div>
          </div>
        </div>
        <div className="flex flex-wrap justify-between gap-x-6 gap-y-2 border-t border-[#222b3d] pt-6 text-sm text-nav-muted">
          <span>© {new Date().getFullYear()} SiteRadar. All rights reserved.</span>
          <span>Powered by <span className="font-medium text-nav-text">Upplause Consulting</span></span>
        </div>
      </div>
    </footer>
  );
}

export function Section({ children, tone = "plain", className = "" }: { children: React.ReactNode; tone?: "plain" | "soft" | "dark"; className?: string }) {
  const bg = { plain: "bg-surface", soft: "bg-bg", dark: "bg-nav text-nav-text" }[tone];
  return <section className={`${bg} px-5 py-16 lg:px-10 lg:py-24 ${className}`}><div className="mx-auto max-w-[1200px]">{children}</div></section>;
}

export const ctaPrimary = "inline-flex min-h-12 items-center justify-center rounded-lg bg-brand px-6 text-base font-semibold text-white hover:bg-brand-ink";
export const ctaSecondary = "inline-flex min-h-12 items-center justify-center rounded-lg border border-[#c9cfd8] bg-surface px-6 text-base font-semibold hover:bg-soft";

export function CtaBand({ title, text, secondary }: { title: string; text: string; secondary?: { href: string; label: string } }) {
  return (
    <Section tone="dark">
      <div className="mx-auto flex max-w-[720px] flex-col items-center gap-5 text-center">
        <h2 className="text-[34px] font-semibold leading-tight text-white">{title}</h2>
        <p className="text-[17px] leading-relaxed">{text}</p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Link href="/signup" className={ctaPrimary}>Get started free</Link>
          {secondary && <Link href={secondary.href} className="inline-flex min-h-12 items-center justify-center rounded-lg border border-[#3a4560] px-6 text-base font-semibold text-white hover:bg-nav-active">{secondary.label}</Link>}
        </div>
      </div>
    </Section>
  );
}
