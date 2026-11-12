"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, BellOff, ChevronDown, LogOut, Menu, Search, Undo2 } from "lucide-react";
import useSWR, { mutate } from "swr";
import { EmptyState, initials, tones, type Tone } from "./ui";
import { fetcher, type User } from "@/lib/api";
import { fmtAgo } from "@/lib/format";
import { ThemeToggle } from "../theme";
import { useLogoutConfirm } from "../confirm-logout";

function useDismiss(ref: React.RefObject<HTMLElement | null>, open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close(); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("mousedown", down); document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", down); document.removeEventListener("keydown", key); };
  }, [open, close, ref]);
}

const iconBtn = "relative flex size-11 items-center justify-center rounded-lg text-[#3F4857] hover:bg-[#F5F1FF]";
const panel = "absolute right-0 top-12 z-50 rounded-xl border border-[#E2E5EA] bg-white shadow-lg";

// ---- search -----------------------------------------------------------------------
const PAGES = [
  { label: "Overview", hint: "How the business is doing", href: "/admin" }, { label: "Customers", hint: "Every workspace", href: "/admin/customers" },
  { label: "Plans and pricing", hint: "Prices, limits and features", href: "/admin/plans" }, { label: "Payments", hint: "Every charge", href: "/admin/payments" },
  { label: "AI credits", hint: "Token budget, usage and credit packages", href: "/admin/ai" }, { label: "Platform health", hint: "Services, errors and banner", href: "/admin/health" }, { label: "Audit and messages", hint: "Admin actions and contact form", href: "/admin/audit" },
];

function SearchDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const term = q.trim();
  const { data } = useSWR<{ results: { id: number; name: string; email: string; plan: string }[] }>(term.length >= 2 ? `/api/admin/search?q=${encodeURIComponent(term)}` : null, fetcher);
  const hits = [
    ...(data?.results ?? []).map((r) => ({ label: r.name, hint: `${r.email} · ${r.plan}`, href: `/admin/customers/${r.id}`, group: "Customers" })),
    ...PAGES.filter((p) => !term || `${p.label} ${p.hint}`.toLowerCase().includes(term.toLowerCase())).map((p) => ({ ...p, group: "Pages" })),
  ].slice(0, 10);
  const go = (href: string) => { onClose(); router.push(href); };
  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(i + 1, hits.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && hits[idx]) go(hits[idx].href);
    else if (e.key === "Escape") onClose();
  }
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 px-4 pt-[12vh]" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label="Search" className="w-full max-w-xl overflow-hidden rounded-xl border border-[#E2E5EA] bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-[#E2E5EA] px-4">
          <Search size={20} className="shrink-0 text-[#5B6472]" aria-hidden="true" />
          <input autoFocus value={q} onChange={(e) => { setQ(e.target.value); setIdx(0); }} onKeyDown={onKey} aria-label="Search customers, emails and websites" placeholder="Search customers, emails, websites"
            className="min-h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[#5B6472] focus-visible:!outline-none" />
          <kbd className="hidden rounded border border-[#E2E5EA] px-1.5 py-0.5 text-xs text-[#5B6472] sm:block">Esc</kbd>
        </div>
        <ul role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
          {hits.length === 0 && <li><EmptyState compact Icon={Search} title="Nothing found" text={`No customer, email or website matches "${q}".`} /></li>}
          {hits.map((h, i) => (
            <li key={h.group + h.href} role="option" aria-selected={i === idx}>
              <button onClick={() => go(h.href)} onMouseEnter={() => setIdx(i)} className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-lg px-3 text-left ${i === idx ? "bg-[#F5F1FF]" : ""}`}>
                <span className="flex min-w-0 flex-col"><span className="truncate text-sm font-medium">{h.label}</span><span className="truncate text-xs text-[#5B6472]">{h.hint}</span></span>
                <span className="shrink-0 text-xs text-[#5B6472]">{h.group}</span></button>
            </li>))}
        </ul>
      </div>
    </div>
  );
}

// ---- notifications -----------------------------------------------------------------
interface Item { ts?: number; tag: string; tone: Tone; title: string; sub: string; href: string }
const SEEN = "sitewatch.admin.notifications.seen";

function Notifications() {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(0);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- reading what this browser last saw, after mount
  useEffect(() => { try { setSeen(Number(localStorage.getItem(SEEN)) || 0); } catch { /* optional */ } }, []);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);
  const { data } = useSWR<{ attention: Item[]; events: (Item & { ts: number })[] }>("/api/admin/notifications", fetcher, { refreshInterval: 60000 });
  const fresh = (data?.events ?? []).filter((e) => e.ts > seen);
  const count = (data?.attention.length ?? 0) + fresh.length;

  function toggle() {
    if (open) { const now = Date.now() / 1000; setSeen(now); try { localStorage.setItem(SEEN, String(now)); } catch { /* optional */ } }
    setOpen((o) => !o);
  }
  const row = (n: Item, key: string, unread: boolean) => (
    <li key={key}><Link href={n.href} onClick={close} className={`flex gap-3 border-b border-[#EDEFF3] px-4 py-3 hover:bg-[#FBFAFF] ${unread ? "bg-[#F5F1FF]/60" : ""}`}>
      <span className={`mt-0.5 h-fit rounded-full px-2 py-[2px] text-[11px] font-semibold ${tones[n.tone]}`}>{n.tag}</span>
      <span className="flex min-w-0 flex-col gap-0.5"><span className="text-sm font-medium">{n.title}</span><span className="text-xs leading-snug text-[#5B6472]">{n.sub}{n.ts ? ` · ${fmtAgo(n.ts)}` : ""}</span></span></Link></li>
  );
  return (
    <div ref={ref} className="relative">
      <button onClick={toggle} aria-haspopup="true" aria-expanded={open} aria-label={count ? `Notifications, ${count} need attention` : "Notifications"} className={iconBtn}>
        <Bell size={20} aria-hidden="true" />
        {count > 0 && <span className="absolute right-2 top-2 flex h-4 min-w-4 items-center justify-center rounded-lg bg-[#B3261E] px-1 text-[10px] font-semibold text-white">{count}</span>}
      </button>
      {open && (
        <div className={`${panel} w-[min(92vw,400px)]`}>
          <div className="flex items-center justify-between border-b border-[#E2E5EA] px-4 py-3"><h2 className="text-sm font-semibold">Notifications</h2><span className="text-xs text-[#5B6472]">{count ? `${count} new` : "All caught up"}</span></div>
          <ul className="max-h-[60vh] overflow-y-auto">
            {!data && <li className="px-4 py-6 text-sm text-[#5B6472]">Loading…</li>}
            {data && data.attention.length === 0 && data.events.length === 0 && <li><EmptyState compact Icon={BellOff} title="No notifications" text="Signups, failed payments and messages will show up here." /></li>}
            {data?.attention.length ? <li className="bg-[#F8F9FB] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#5B6472]">Needs attention</li> : null}
            {data?.attention.map((a, i) => row(a, `a${i}`, false))}
            {data?.events.length ? <li className="bg-[#F8F9FB] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#5B6472]">This week</li> : null}
            {data?.events.map((e, i) => row(e, `e${i}`, e.ts > seen))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---- profile -------------------------------------------------------------------------
function Profile({ user, onLogout }: { user: User; onLogout: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);
  const name = `${user.first_name} ${user.last_name}`.trim() || user.email;
  const item = "flex min-h-12 w-full items-center gap-3 rounded-lg px-3 text-left hover:bg-[#F5F1FF]";
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-label="Account menu" className="flex min-h-11 items-center gap-2 rounded-lg px-1.5 hover:bg-[#F5F1FF]">
        <span className="flex size-8 items-center justify-center rounded-full bg-[#2A2150] text-xs font-semibold text-white">{initials(name)}</span>
        <span className="hidden max-w-32 truncate text-sm font-medium sm:block">{name}</span><ChevronDown size={16} className={`hidden text-[#5B6472] transition-transform sm:block ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open && (
        <div role="menu" className={`${panel} w-[272px] overflow-hidden`}>
          <div className="flex items-center gap-3 bg-[#F5F1FF] px-4 py-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#2A2150] text-sm font-semibold text-white">{initials(name)}</span>
            <span className="min-w-0"><span className="block truncate text-sm font-semibold">{name}</span><span className="block truncate text-[13px] text-[#5B6472]">{user.email}</span>
              <span className="mt-1 inline-block rounded-full bg-[#EFEAFF] px-2 py-0.5 text-[11px] font-semibold text-[#4A33B0] ring-1 ring-[#D9CFFF]">Super admin</span></span>
          </div>
          <div className="flex flex-col gap-0.5 p-1.5">
            <Link role="menuitem" href="/overview" onClick={close} className={item}>
              <span className="flex size-8 items-center justify-center rounded-lg bg-[#F3F4F6] text-[#3F4857]"><Undo2 size={16} aria-hidden="true" /></span>
              <span className="flex flex-col"><span className="text-sm font-medium">Exit admin</span><span className="text-xs text-[#5B6472]">Back to my workspace</span></span>
            </Link>
          </div>
          <div className="border-t border-[#EDEFF3] p-1.5">
            <button role="menuitem" onClick={onLogout} className={`${item} text-[#B3261E] hover:!bg-[#FBE7E5]`}>
              <span className="flex size-8 items-center justify-center rounded-lg bg-[#FBE7E5]"><LogOut size={16} aria-hidden="true" /></span>
              <span className="text-sm font-medium">Log out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- bar -------------------------------------------------------------------------------
export function AdminTopbar({ user, env, onMenu }: { user: User; env: string; onMenu: () => void }) {
  const router = useRouter();
  const [searching, setSearching] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setSearching(true); } };
    document.addEventListener("keydown", onKey); return () => document.removeEventListener("keydown", onKey);
  }, []);
  const { ask: askLogout, dialog: logoutDialog } = useLogoutConfirm(async () => { await mutate("/api/auth/me"); router.replace("/login"); });
  return (
    <>
      <header className="sticky top-0 z-20 flex min-h-14 items-center justify-between gap-3 border-b border-[#E2E5EA] bg-white px-3 py-1.5 lg:px-6">
        <div className="flex items-center gap-3">
          <button onClick={onMenu} aria-label="Open menu" className="flex size-11 items-center justify-center rounded-lg hover:bg-[#F5F1FF] lg:hidden"><Menu size={20} /></button>
          <span className="inline-flex min-h-8 items-center gap-2 rounded-full bg-[#EFEAFF] px-3 text-[13px] font-semibold text-[#4A33B0]"><span className="size-2 rounded-full bg-[#6B4FE0]" />Super admin · {env}</span>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button onClick={() => setSearching(true)} aria-label="Search (Ctrl K)" title="Search (Ctrl K)" className={iconBtn}><Search size={20} aria-hidden="true" /></button>
          <Notifications />
          <Profile user={user} onLogout={askLogout} />
        </div>
      </header>
      {searching && <SearchDialog onClose={() => setSearching(false)} />}
      {logoutDialog}
    </>
  );
}
