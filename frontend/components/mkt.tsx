"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Building2, ChevronDown, Menu, Users, X } from "lucide-react";
import { Logo } from "./logo";

export { Logo } from "./logo";



const solutions = [
  { href: "/solutions/agencies", label: "Agencies", Icon: Users, text: "For digital marketing agencies, web development agencies and consultants managing multiple clients." },
  { href: "/solutions/businesses", label: "Businesses", Icon: Building2, text: "For SMEs, enterprises, e-commerce brands and organisations managing their own digital presence." },
];

export function MktHeader() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    const down = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setMenu(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setMenu(false); };
    document.addEventListener("mousedown", down); document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", down); document.removeEventListener("keydown", key); };
  }, [menu]);
  const link = (href: string) => `rounded-lg px-3.5 py-2.5 text-[15px] ${path === href ? "bg-[#FFEDD5] font-semibold text-[#9A3412]" : "text-[#334155] hover:bg-[#FFF7ED]"}`;
  const inSolutions = path.startsWith("/solutions");

  return (
    <header className="sticky top-0 z-30 border-b border-[#EFE4D8] bg-white">
      <nav aria-label="Main" className="mx-auto flex max-w-[1320px] items-center justify-between gap-4 px-6 py-3">
        <Link href="/" aria-label="SiteRadar home"><Logo height={50} /></Link>
        <div className="hidden items-center gap-1 md:flex">
          <Link href="/" className={link("/")}>Home</Link>
          <div ref={ref} className="relative">
            <button onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-haspopup="true"
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2.5 text-[15px] ${inSolutions ? "bg-[#FFEDD5] font-semibold text-[#9A3412]" : "text-[#334155] hover:bg-[#FFF7ED]"}`}>Solutions<ChevronDown size={16} aria-hidden="true" className={menu ? "rotate-180" : ""} /></button>
            {menu && (
              <div className="absolute left-0 top-[calc(100%+8px)] z-30 flex w-[360px] flex-col gap-1 rounded-[14px] border border-[#EFE4D8] bg-white p-2 shadow-[0_20px_50px_rgba(15,23,42,0.15)]">
                {solutions.map(({ href, label, Icon, text }) => (
                  <Link key={href} href={href} onClick={() => setMenu(false)} className="flex gap-3 rounded-[10px] p-3 hover:bg-[#FFF7ED]">
                    <span className="flex size-10 flex-none items-center justify-center rounded-[10px] bg-[#FFEDD5] text-[#C2410C]"><Icon size={20} aria-hidden="true" /></span>
                    <span className="flex flex-col gap-0.5"><span className="text-[15px] font-bold text-[#0F172A]">{label}</span><span className="text-[13px] leading-snug text-[#475569]">{text}</span></span>
                  </Link>))}
              </div>)}
          </div>
          <Link href="/pricing" className={link("/pricing")}>Pricing</Link>
          <Link href="/contact" className={link("/contact")}>Contact</Link>
        </div>
        <div className="hidden items-center gap-2.5 md:flex">
          <Link href="/login" className="px-4 py-3 text-[15px] font-semibold text-[#0F172A]">Log in</Link>
          <Link href="/signup" className="rounded-[10px] bg-[#F97316] px-5 py-3 text-[15px] font-bold text-white hover:bg-[#EA580C]">Get started free</Link>
        </div>
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Menu" className="flex size-11 items-center justify-center rounded-lg hover:bg-[#FFF7ED] md:hidden">{open ? <X size={22} /> : <Menu size={22} />}</button>
      </nav>
      {open && (
        <div className="flex flex-col gap-1 border-t border-[#EFE4D8] px-6 py-3 md:hidden">
          {[["/", "Home"], ["/solutions/agencies", "Solutions: Agencies"], ["/solutions/businesses", "Solutions: Businesses"], ["/pricing", "Pricing"], ["/contact", "Contact"]].map(([h, l]) => (
            <Link key={h} href={h} onClick={() => setOpen(false)} className="flex min-h-11 items-center rounded-lg px-3 font-medium text-[#334155] hover:bg-[#FFF7ED]">{l}</Link>))}
          <Link href="/login" className="flex min-h-11 items-center px-3 font-semibold">Log in</Link>
          <Link href="/signup" className="flex min-h-12 items-center justify-center rounded-[10px] bg-[#F97316] font-bold text-white">Get started free</Link>
        </div>
      )}
    </header>
  );
}

export function MktFooter() {
  const col = "text-[#CBD5E1] hover:text-white";
  return (
    <footer className="bg-[#0F172A] text-[#CBD5E1]">
      <div className="mx-auto flex max-w-[1320px] flex-col gap-12 px-6 pb-8 pt-16">
        <div className="flex flex-wrap justify-between gap-10">
          <div className="flex max-w-[360px] flex-col gap-4">
            <Link href="/" aria-label="SiteRadar home"><Logo dark height={52} /></Link>
            <p className="text-[15px]">Website monitoring, domain and DNS health, analytics and monthly reports for the people who look after websites.</p>
          </div>
          <div className="flex flex-wrap gap-16">
            <div className="flex flex-col gap-2.5"><span className="text-sm font-bold text-white">Product</span>
              <Link href="/solutions/agencies" className={col}>For agencies</Link><Link href="/solutions/businesses" className={col}>For businesses</Link><Link href="/pricing" className={col}>Pricing</Link><Link href="/signup" className={col}>Get started free</Link></div>
            <div className="flex flex-col gap-2.5"><span className="text-sm font-bold text-white">Company</span><Link href="/contact" className={col}>Contact</Link><Link href="/" className={col}>Home</Link></div>
            <div className="flex flex-col gap-2.5"><span className="text-sm font-bold text-white">Account</span><Link href="/login" className={col}>Log in</Link><Link href="/signup" className={col}>Sign up</Link></div>
          </div>
        </div>
        <div className="flex flex-wrap justify-between gap-3 border-t border-[#1E293B] pt-6 text-sm text-[#94A3B8]">
          <span>© {new Date().getFullYear()} SiteRadar. All rights reserved.</span>
          <span>Powered by <b className="text-[#E2E8F0]">Upplause Consulting</b></span>
        </div>
      </div>
    </footer>
  );
}

/** Decorative radar rings drawn behind dark and orange sections. */
export function Rings({ className = "", color = "#F97316", opacity = 1 }: { className?: string; color?: string; opacity?: number }) {
  return (
    <svg viewBox="0 0 800 800" aria-hidden="true" className={`pointer-events-none absolute ${className}`} style={{ opacity }}>
      <g fill="none" stroke={color} strokeWidth="2"><circle cx="400" cy="400" r="120" strokeOpacity="0.22" /><circle cx="400" cy="400" r="220" strokeOpacity="0.16" /><circle cx="400" cy="400" r="320" strokeOpacity="0.11" /><circle cx="400" cy="400" r="400" strokeOpacity="0.07" /><path d="M400 400L640 160" strokeOpacity="0.25" /></g>
      <circle cx="560" cy="300" r="6" fill="#FBA23C" fillOpacity="0.7" /><circle cx="250" cy="520" r="5" fill="#F97316" fillOpacity="0.5" /><circle cx="470" cy="640" r="4" fill="#FBA23C" fillOpacity="0.45" />
    </svg>
  );
}

export function CtaBand({ title, text, primary, secondary, onPage = false }: { title: string; text: string; primary: { href: string; label: string }; secondary?: { href: string; label: string }; onPage?: boolean }) {
  return (
    <section className={`px-6 ${onPage ? "bg-[#FBF8F4] py-24" : "bg-white pb-24"}`}>
      <div className="relative mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-6 overflow-hidden rounded-3xl bg-[#F97316] px-8 py-14 md:px-12">
        <svg viewBox="0 0 400 400" aria-hidden="true" className="pointer-events-none absolute -right-[120px] -top-[110px] size-[420px]"><g fill="none" stroke="#FFFFFF" strokeWidth="3"><circle cx="200" cy="200" r="70" strokeOpacity="0.35" /><circle cx="200" cy="200" r="130" strokeOpacity="0.25" /><circle cx="200" cy="200" r="190" strokeOpacity="0.15" /></g></svg>
        <div className="relative flex max-w-[640px] flex-col gap-2">
          <h2 className="text-[clamp(28px,3.2vw,40px)] font-bold leading-[1.1] tracking-[-0.03em] text-white">{title}</h2>
          <p className="text-lg text-white/95">{text}</p>
        </div>
        <div className="relative flex flex-wrap gap-3">
          <Link href={primary.href} className="rounded-xl bg-[#0F172A] px-6 py-4 text-base font-bold text-white hover:bg-[#1E293B]">{primary.label}</Link>
          {secondary && <Link href={secondary.href} className="rounded-xl bg-[#FFF7ED] px-6 py-4 text-base font-bold text-[#0F172A] hover:bg-white">{secondary.label}</Link>}
        </div>
      </div>
    </section>
  );
}

export function Container({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-[1320px] px-6 ${className}`}>{children}</div>;
}

