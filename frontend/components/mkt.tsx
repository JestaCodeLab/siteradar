"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Building2, ChevronDown, LayoutGrid, LogOut, Menu, Settings, Users, X } from "lucide-react";
import { Logo } from "./logo";
import { homeFor, useMe } from "@/lib/me";
import { useLogoutConfirm } from "./confirm-logout";
import { ThemeToggle, useDark } from "./theme";
import { FeaturesMobile, FeaturesPanel, SolutionsPanel } from "./features-menu";
import { FEATURES, featureHref } from "@/lib/features";

export { Logo } from "./logo";



const solutions = [
  { href: "/agencies", label: "Agencies", Icon: Users, text: "For digital marketing agencies, web development agencies and consultants managing multiple clients." },
  { href: "/businesses", label: "Businesses", Icon: Building2, text: "For SMEs, enterprises, e-commerce brands and organisations managing their own digital presence." },
];

/** For signed-in visitors: replaces Log in and Get started with a menu back to their dashboard. */
function MktAccount() {
  const { me, user, mutate } = useMe();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", down); document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", down); document.removeEventListener("keydown", key); };
  }, [open]);
  const { ask: askLogout, dialog: logoutDialog } = useLogoutConfirm(async () => { await mutate(); });
  if (!user || !me) return null;
  const name = `${user.first_name} ${user.last_name}`.trim() || "Account";
  const initials = name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  const home = homeFor(me);
  const row = "flex min-h-11 items-center gap-3 rounded-lg px-3 text-[15px] text-[#0F172A] hover:bg-[#FFF7ED]";
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-label="Account menu" className="flex min-h-11 items-center gap-2 rounded-xl px-1.5 hover:bg-[#FFF7ED]">
        <span className="flex size-9 items-center justify-center rounded-full bg-[#0F172A] text-xs font-bold text-white">{initials}</span>
        <span className="hidden max-w-32 truncate text-[15px] font-semibold lg:block">{user.first_name}</span>
        <ChevronDown size={16} aria-hidden="true" className="text-[#475569]" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-[calc(100%+8px)] z-40 w-[260px] rounded-[14px] border border-[#EFE4D8] bg-white p-2 shadow-[0_20px_50px_rgba(15,23,42,0.15)]">
          <div className="border-b border-[#EFE4D8] px-3 pb-3 pt-2"><p className="truncate text-sm font-bold">{name}</p><p className="truncate text-[13px] text-[#475569]">{user.email}</p></div>
          <div className="flex flex-col gap-0.5 pt-2">
            <Link role="menuitem" href={home} onClick={() => setOpen(false)} className={row}><LayoutGrid size={18} aria-hidden="true" className="text-[#C2410C]" />{home === "/overview" ? "Go to dashboard" : "Continue setup"}</Link>
            {home === "/overview" && <Link role="menuitem" href="/settings" onClick={() => setOpen(false)} className={row}><Settings size={18} aria-hidden="true" className="text-[#C2410C]" />Settings</Link>}
            <button role="menuitem" onClick={() => { setOpen(false); askLogout(); }} className={`${row} w-full text-left !text-[#B3261E] hover:!bg-[#FEE2E2]`}><LogOut size={18} aria-hidden="true" />Log out</button>
          </div>
        </div>
      )}
      {logoutDialog}
    </div>
  );
}

/** A navbar button with a wide dropdown panel. It opens on hover or click, and closes on Escape, a click outside, or shortly after the pointer leaves. */
function NavMenu({ id, label, active, open, onOpen, onClose, maxWidth, children }: {
  id: string; label: string; active: boolean; open: boolean; onOpen: () => void; onClose: () => void; maxWidth: string; children: React.ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isOpen = useRef(open);
  useEffect(() => { isOpen.current = open; }, [open]);
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) onClose(); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", down); document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", down); document.removeEventListener("keydown", key); };
  }, [open, onClose]);
  const hold = () => { if (timer.current) clearTimeout(timer.current); };
  return (
    <div ref={box} onMouseEnter={() => { hold(); onOpen(); }} onMouseLeave={() => { hold(); timer.current = setTimeout(() => { if (isOpen.current) onClose(); }, 160); }}>
      <button onClick={() => (open ? onClose() : onOpen())} aria-expanded={open} aria-haspopup="true" aria-controls={id}
        className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2.5 text-[15px] font-normal ${active || open ? "bg-[#FFEDD5] font-normal text-[#9A3412]" : "text-[#334155] hover:bg-[#FFF7ED]"}`}>
        {label}<ChevronDown size={16} aria-hidden="true" className={open ? "rotate-180" : ""} />
      </button>
      {open && <div className={`absolute inset-x-5 top-full z-30 mx-auto pt-2 md:inset-x-6 ${maxWidth}`}>{children}</div>}
    </div>
  );
}

export function MktHeader() {
  const { user } = useMe();
  const dark = useDark();
  const path = usePathname();
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === path;          // the phone menu is opened on one page; moving to another page closes it
  const setOpen = (v: boolean | ((o: boolean) => boolean)) => setOpenFor((cur) => ((typeof v === "function" ? v(cur === path) : v) ? path : null));
  const [menu, setMenu] = useState<"features" | "solutions" | null>(null);
  const closeMenu = useCallback(() => setMenu(null), []);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenFor(null); };
    document.addEventListener("keydown", key);
    return () => { document.body.style.overflow = prev; document.removeEventListener("keydown", key); };
  }, [open]);
  const link = (href: string) => `rounded-lg px-3.5 py-2.5 text-[15px] font-normal ${path === href ? "bg-[#FFEDD5] font-normal text-[#9A3412]" : "text-[#334155] hover:bg-[#FFF7ED]"}`;
  const inSolutions = path.startsWith("/agencies") || path.startsWith("/businesses");
  const inFeatures = path.startsWith("/features");

  return (
    <header className="sticky top-0 z-30 border-b border-[#EFE4D8] bg-white">
      <nav aria-label="Main" className="relative mx-auto flex max-w-[1320px] items-center justify-between gap-4 px-5 py-3 md:px-6">
        <Link href="/" aria-label="SiteRadar home"><Logo dark={dark} height={50} className="hidden md:block" /><Logo dark={dark} height={40} className="md:hidden" /></Link>
        <div className="hidden items-center gap-1 md:flex">
          <NavMenu id="features-menu" label="Features" active={inFeatures} open={menu === "features"} onOpen={() => setMenu("features")} onClose={closeMenu} maxWidth="max-w-[1120px]">
            <FeaturesPanel onNavigate={closeMenu} />
          </NavMenu>
          <NavMenu id="solutions-menu" label="Solutions" active={inSolutions} open={menu === "solutions"} onOpen={() => setMenu("solutions")} onClose={closeMenu} maxWidth="max-w-[860px]">
            <SolutionsPanel onNavigate={closeMenu} />
          </NavMenu>
          <Link href="/pricing" className={link("/pricing")}>Pricing</Link>
          <Link href="/contact" className={link("/contact")}>Contact</Link>
        </div>
        <div className="hidden items-center gap-2.5 md:flex">
          <ThemeToggle marketing />
          {user ? <MktAccount /> : <>
            <Link href="/login" className="px-4 py-3 text-[15px] font-semibold text-[#0F172A]">Log in</Link>
            <Link href="/signup" className="rounded-[10px] bg-[#F97316] px-5 py-3 text-[15px] font-bold text-white hover:bg-[#EA580C]">Get started</Link>
          </>}
        </div>
        <div className="flex items-center gap-1.5 md:hidden">
          <ThemeToggle marketing />
          <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Open menu" className="flex size-11 items-center justify-center rounded-[10px] border border-[#EFE4D8] hover:bg-[#FFF7ED]"><Menu size={22} aria-hidden="true" /></button>
        </div>
      </nav>
      {open && (
        <div role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-50 flex flex-col bg-white md:hidden">
          <div className="flex items-center justify-between border-b border-[#EFE4D8] px-5 py-3">
            <Link href="/" aria-label="SiteRadar home" onClick={() => setOpen(false)}><Logo dark={dark} height={40} /></Link>
            <button onClick={() => setOpen(false)} aria-label="Close menu" className="flex size-11 items-center justify-center rounded-[10px] bg-[#0F172A] text-white ring-1 ring-[#334155]"><X size={22} aria-hidden="true" /></button>
          </div>
          <nav aria-label="Main" className="flex flex-1 flex-col overflow-y-auto px-5 py-3">
            <FeaturesMobile onNavigate={() => setOpen(false)} />
            <div className="flex flex-col gap-1.5 border-b border-[#F1E8DD] pb-2 pt-4">
              <span className="text-xl font-bold">Solutions</span>
              {solutions.map(({ href, label, Icon, text }) => (
                <Link key={href} href={href} onClick={() => setOpen(false)} className="flex gap-3 rounded-xl bg-[#FFF7ED] p-2.5">
                  <span className="flex size-9 flex-none items-center justify-center rounded-[10px] bg-[#FFEDD5] text-[#C2410C]"><Icon size={18} aria-hidden="true" /></span>
                  <span className="flex flex-col"><span className="font-bold">{label}</span><span className="text-[13px] leading-snug text-[#475569]">{text}</span></span>
                </Link>))}
            </div>
            <Link href="/pricing" onClick={() => setOpen(false)} className="border-b border-[#F1E8DD] py-4 text-xl font-bold">Pricing</Link>
            <Link href="/contact" onClick={() => setOpen(false)} className="border-b border-[#F1E8DD] py-4 text-xl font-bold">Contact</Link>
          </nav>
          <div className="flex flex-col gap-2.5 border-t border-[#EFE4D8] p-5">
            {user ? (
              <Link href="/overview" onClick={() => setOpen(false)} className="rounded-xl bg-[#F97316] py-[15px] text-center text-base font-bold text-white">Go to dashboard</Link>
            ) : <>
              <Link href="/signup" onClick={() => setOpen(false)} className="rounded-xl bg-[#F97316] py-[15px] text-center text-base font-bold text-white">Get started</Link>
              <Link href="/login" onClick={() => setOpen(false)} className="rounded-xl border-[1.5px] border-[#0F172A] py-[15px] text-center text-base font-semibold">Log in</Link>
            </>}
          </div>
        </div>
      )}
    </header>
  );
}

/** The company's social pages, set in the environment so they can change without touching the code. An icon with no address is left out. */
const SOCIAL = [
  { name: "Facebook", url: process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK, icon: <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /> },
  { name: "Instagram", url: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM, icon: <><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></> },
].filter((x) => x.url);

export function MktFooter() {
  const col = "text-[#CBD5E1] hover:text-white";
  return (
    <footer className="bg-[#0F172A] text-[#CBD5E1]">
      <div className="mx-auto flex max-w-[1320px] flex-col gap-[22px] px-5 pb-7 pt-9 md:gap-12 md:px-6 md:pb-8 md:pt-16">
        <div className="flex flex-wrap justify-between gap-10">
          <div className="flex max-w-[360px] flex-col gap-4">
            <Link href="/" aria-label="SiteRadar home"><Logo dark height={40} className="md:hidden" /><Logo dark height={52} className="hidden md:block" /></Link>
            <p className="hidden text-[15px] md:block">Website monitoring, domain and DNS health, analytics and monthly reports for the people who look after websites.</p>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[15px] md:hidden">
            {[["/agencies", "For agencies"], ["/businesses", "For businesses"], ["/pricing", "Pricing"], ["/contact", "Contact"], ["/login", "Log in"], ["/signup", "Sign up"], ["/terms-of-service", "Terms of Service"], ["/privacy", "Privacy Policy"]].map(([h, l]) => <Link key={h} href={h} className={`${col} py-1.5`}>{l}</Link>)}
          </div>
          <div className="hidden flex-wrap gap-x-16 gap-y-10 md:flex">
            <div className="flex flex-col gap-2.5"><span className="text-sm font-bold text-white">Features</span>
              <div className="grid grid-flow-col grid-rows-7 gap-x-10 gap-y-2.5">{FEATURES.map((f) => <Link key={f.slug} href={featureHref(f)} className={col}>{f.name}</Link>)}</div></div>
            <div className="flex flex-col gap-2.5"><span className="text-sm font-bold text-white">Product</span>
              <Link href="/agencies" className={col}>For agencies</Link><Link href="/businesses" className={col}>For businesses</Link><Link href="/pricing" className={col}>Pricing</Link><Link href="/signup" className={col}>Get started</Link></div>
            <div className="flex flex-col gap-2.5"><span className="text-sm font-bold text-white">Company</span><Link href="/contact" className={col}>Contact</Link><Link href="/" className={col}>Home</Link><Link href="/terms-of-service" className={col}>Terms of Service</Link><Link href="/privacy" className={col}>Privacy Policy</Link></div>
            <div className="flex flex-col gap-2.5"><span className="text-sm font-bold text-white">Account</span><Link href="/login" className={col}>Log in</Link><Link href="/signup" className={col}>Sign up</Link></div>
          </div>
        </div>
        <div className="flex flex-col gap-3 border-t border-[#1E293B] pt-4 text-[13px] text-[#94A3B8] md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-3 md:pt-6 md:text-sm">
          <span>© {new Date().getFullYear()} SiteRadar. All rights reserved.</span>
          {SOCIAL.length > 0 && (
            <div className="flex items-center gap-2">
              {SOCIAL.map((x) => (
                <a key={x.name} href={x.url} target="_blank" rel="noopener noreferrer" aria-label={`SiteRadar on ${x.name}`}
                  className="flex size-8 items-center justify-center rounded-full border border-[#334155] text-[#CBD5E1] hover:border-[#F97316] hover:text-white">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{x.icon}</svg>
                </a>))}
            </div>
          )}
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
    <section className={`px-5 md:px-6 ${onPage ? "bg-[#FBF8F4] py-12 md:py-24" : "bg-white pb-12 md:pb-24"}`}>
      <div className="relative mx-auto flex max-w-[1320px] flex-col gap-3.5 overflow-hidden rounded-[20px] bg-[#F97316] px-[22px] py-7 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-6 md:rounded-3xl md:px-12 md:py-14">
        <svg viewBox="0 0 400 400" aria-hidden="true" className="pointer-events-none absolute -right-[120px] -top-[110px] hidden size-[420px] md:block"><g fill="none" stroke="#FFFFFF" strokeWidth="3"><circle cx="200" cy="200" r="70" strokeOpacity="0.35" /><circle cx="200" cy="200" r="130" strokeOpacity="0.25" /><circle cx="200" cy="200" r="190" strokeOpacity="0.15" /></g></svg>
        <div className="relative flex max-w-[640px] flex-col gap-2">
          <h2 className="text-2xl font-bold leading-[1.15] tracking-[-0.03em] text-white md:text-[clamp(28px,3.2vw,40px)] md:leading-[1.1]">{title}</h2>
          <p className="hidden text-lg text-white/95 md:block">{text}</p>
        </div>
        <div className="relative flex flex-col gap-3 md:flex-row md:flex-wrap">
          <Link href={primary.href} className="rounded-xl bg-[#0F172A] px-6 py-[15px] text-center text-base font-bold text-white hover:bg-[#1E293B] md:py-4">{primary.label}</Link>
          {secondary && <Link href={secondary.href} className="hidden rounded-xl bg-[#FFF7ED] px-6 py-4 text-base font-bold md:block text-[#0F172A] hover:bg-white">{secondary.label}</Link>}
        </div>
      </div>
    </section>
  );
}

export function Container({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-[1320px] px-6 ${className}`}>{children}</div>;
}

