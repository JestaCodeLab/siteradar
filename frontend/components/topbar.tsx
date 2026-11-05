"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { fetcher, send, type ActivityEvent, type SitesResponse, type SubscriptionsResponse } from "@/lib/api";
import { fmtAgo } from "@/lib/format";
import { useMe } from "@/lib/me";
import { Icon } from "./ui";

function useDismiss(ref: React.RefObject<HTMLElement | null>, open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close(); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", down); document.removeEventListener("keydown", key); };
  }, [open, close, ref]);
}

const iconBtn = "relative flex size-11 items-center justify-center rounded-lg text-ink-2 hover:bg-soft";
const panel = "absolute right-0 top-12 z-50 rounded-xl border border-line bg-surface shadow-lg";

// ---- search -----------------------------------------------------------------
interface Hit { label: string; hint: string; href: string; group: string }

const PAGES: Hit[] = [
  { label: "Overview", hint: "All websites at a glance", href: "/overview", group: "Pages" },
  { label: "Add website", hint: "Start monitoring a new site", href: "/websites/new", group: "Pages" },
  { label: "All subscriptions", hint: "Domains, hosting and tools", href: "/subscriptions", group: "Pages" },
  { label: "Add subscription", hint: "Upload an invoice", href: "/subscriptions/new", group: "Pages" },
  { label: "Monthly reports", hint: "Subscription spend by month", href: "/subscriptions/reports", group: "Pages" },
  { label: "Activity logs", hint: "Incidents, alerts and changes", href: "/activity", group: "Pages" },
  { label: "Settings", hint: "Company, profile and alerts", href: "/settings", group: "Pages" },
  { label: "Team", hint: "Members and invitations", href: "/settings?tab=team", group: "Pages" },
  { label: "Billing", hint: "Plan, usage and invoices", href: "/settings?tab=billing", group: "Pages" },
];

function SearchDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { data: sites } = useSWR<SitesResponse>("/api/sites", fetcher);
  const { data: subs } = useSWR<SubscriptionsResponse>("/api/subscriptions", fetcher);
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);

  const all: Hit[] = [
    ...(sites?.sites.map((s) => ({ label: s.name, hint: s.host, href: `/websites/${s.id}`, group: "Websites" })) ?? []),
    ...(subs?.subscriptions.map((s) => ({ label: s.name, hint: [s.site_name, s.provider].filter(Boolean).join(" · "), href: `/subscriptions/${s.id}`, group: "Subscriptions" })) ?? []),
    ...PAGES,
  ];
  const needle = q.trim().toLowerCase();
  const hits = (needle ? all.filter((h) => `${h.label} ${h.hint}`.toLowerCase().includes(needle)) : all.filter((h) => h.group !== "Subscriptions")).slice(0, 10);

  function go(h: Hit) { onClose(); router.push(h.href); }
  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(i + 1, hits.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && hits[idx]) go(hits[idx]);
    else if (e.key === "Escape") onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 px-4 pt-[12vh]" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label="Search" className="w-full max-w-xl overflow-hidden rounded-xl border border-line bg-surface shadow-2xl">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Icon.search className="shrink-0 text-muted" />
          <input autoFocus value={q} onChange={(e) => { setQ(e.target.value); setIdx(0); }} onKeyDown={onKey}
            aria-label="Search websites, subscriptions and pages" placeholder="Search websites, subscriptions and pages"
            className="min-h-14 flex-1 bg-transparent text-[15px] outline-none focus-visible:!outline-none placeholder:text-muted" />
          <kbd className="hidden rounded border border-line px-1.5 py-0.5 text-xs text-muted sm:block">Esc</kbd>
        </div>
        <ul role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
          {hits.length === 0 && <li className="px-3 py-8 text-center text-sm text-muted">Nothing found for “{q}”.</li>}
          {hits.map((h, i) => (
            <li key={h.group + h.href} role="option" aria-selected={i === idx}>
              <button onClick={() => go(h)} onMouseEnter={() => setIdx(i)}
                className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 text-left ${i === idx ? "bg-brand-soft" : ""}`}>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">{h.label}</span>
                  {h.hint && <span className="truncate text-xs text-muted">{h.hint}</span>}
                </span>
                <span className="shrink-0 text-xs text-muted">{h.group}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ---- notifications ------------------------------------------------------------
const SEEN_KEY = "sitewatch.notifications.seen";
const dot: Record<ActivityEvent["level"], string> = { bad: "bg-bad", warn: "bg-bar-warn", ok: "bg-ok", info: "bg-muted" };

function Notifications() {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState<number>(() => {
    try { return typeof window === "undefined" ? 0 : Number(localStorage.getItem(SEEN_KEY)) || 0; } catch { return 0; }
  });
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);
  const { data } = useSWR<{ events: ActivityEvent[] }>("/api/activity?limit=30", fetcher, { refreshInterval: 60000 });
  const items = (data?.events ?? []).filter((e) => e.level !== "info").slice(0, 8);

  const unread = items.filter((e) => e.ts > seen).length;

  function toggle() {
    if (!open) {
      // keep `seen` as it was so new items stay highlighted while the panel is open
      try { localStorage.setItem(SEEN_KEY, String(Date.now() / 1000)); } catch { /* ignore */ }
    } else {
      setSeen(Date.now() / 1000);
    }
    setOpen((o) => !o);
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={toggle} aria-haspopup="true" aria-expanded={open} aria-label={unread ? `Notifications, ${unread} new` : "Notifications"} className={iconBtn}>
        <Icon.bell />
        {unread > 0 && <span className="absolute right-2 top-2 flex min-w-4 items-center justify-center rounded-full bg-bad px-1 text-[10px] font-semibold leading-4 text-white">{unread}</span>}
      </button>
      {open && (
        <div className={`${panel} w-[min(92vw,380px)]`}>
          <div className="flex items-center justify-between border-b border-line px-4 py-3"><h2 className="text-sm font-semibold">Notifications</h2></div>
          <ul className="max-h-[60vh] overflow-y-auto">
            {items.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted">Nothing needs your attention.</li>}
            {items.map((e) => (
              <li key={e.kind + e.ts + e.title} className={`flex gap-3 border-b border-line-soft px-4 py-3 ${e.ts > seen ? "bg-brand-soft/40" : ""}`}>
                <span className={`mt-1.5 size-2 shrink-0 rounded-full ${dot[e.level]}`} />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm font-medium">{e.title}</span>
                  {e.detail && <span className="truncate text-xs text-muted">{e.detail}</span>}
                  <span className="text-xs text-muted">{fmtAgo(e.ts)}</span>
                </span>
              </li>
            ))}
          </ul>
          <Link href="/activity" onClick={close} className="flex min-h-11 items-center justify-center text-sm font-semibold text-brand">View all activity</Link>
        </div>
      )}
    </div>
  );
}

// ---- profile ------------------------------------------------------------------
function Profile() {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);
  const { me, user, isAdmin, mutate } = useMe();
  const name = user ? `${user.first_name} ${user.last_name}`.trim() : "Account";
  const initials = name.split(/[\s._-]+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase() || "T";

  async function logout() {
    await send("POST", "/api/auth/logout").catch(() => {});
    await mutate();
    router.replace("/login");
  }

  const item = "flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm hover:bg-soft";
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-label="Account menu"
        className="flex min-h-11 items-center gap-2 rounded-lg px-1.5 hover:bg-soft">
        <span className="flex size-8 items-center justify-center rounded-full bg-nav text-xs font-semibold text-white">{initials}</span>
        <span className="hidden max-w-32 truncate text-sm font-medium sm:block">{name}</span>
        <Icon.chevronDown className="hidden text-muted sm:block" />
      </button>
      {open && (
        <div role="menu" className={`${panel} w-60 p-1.5`}>
          <div className="border-b border-line-soft px-3 pb-2.5 pt-2">
            <p className="text-xs text-muted">Signed in as</p>
            <p className="truncate text-sm font-semibold">{name}</p>
            <p className="truncate text-xs text-muted">{user?.email}</p>
          </div>
          {(me?.workspaces.length ?? 0) > 1 && (
            <div className="border-b border-line-soft py-1.5">
              <p className="px-3 pb-1 pt-1 text-xs text-muted">Switch workspace</p>
              {me?.workspaces.map((w) => (
                <button key={w.id} role="menuitem" onClick={async () => { await send("POST", "/api/auth/switch", { workspace_id: w.id }); await mutate(); close(); router.push("/overview"); }}
                  className={`${item} ${w.id === me.workspace?.id ? "font-semibold" : ""}`}>{w.name}</button>
              ))}
            </div>
          )}
          <div className="pt-1.5">
            <Link role="menuitem" href="/settings" onClick={close} className={item}><Icon.user />Profile settings</Link>
            {isAdmin && <Link role="menuitem" href="/settings?tab=billing" onClick={close} className={item}><Icon.card />Billing</Link>}
            <button role="menuitem" onClick={logout} className={`${item} text-bad`}><Icon.logout />Log out</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- bar ----------------------------------------------------------------------
export function Topbar({ onMenu }: { onMenu: () => void }) {
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setSearching(true); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <header className="sticky top-[var(--support-h,0px)] z-20 flex h-14 items-center justify-between gap-2 border-b border-line bg-surface px-3 lg:px-6">
        <button onClick={onMenu} aria-label="Open menu" className={`${iconBtn} lg:hidden`}><Icon.menu /></button>
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          <button onClick={() => setSearching(true)} aria-label="Search (Ctrl K)" title="Search (Ctrl K)" className={iconBtn}><Icon.search /></button>
          <Notifications />
          <Profile />
        </div>
      </header>
      {searching && <SearchDialog onClose={() => setSearching(false)} />}
    </>
  );
}
