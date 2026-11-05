"use client";

import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown, Clock, CreditCard, Globe, LayoutGrid, Receipt, Settings, Users } from "lucide-react";
import { send } from "@/lib/api";
import { useMe } from "@/lib/me";
import { Icon } from "./ui";

const row = "flex min-h-11 items-center gap-2.5 rounded-lg px-2.5 text-sm";
const on = "bg-nav-active text-white";

function Item({ href, label, Icon: Glyph, badge, current, strong, onClose }: {
  href: string; label: string; Icon: React.ComponentType<{ size?: number; "aria-hidden"?: boolean }>; badge?: number; current: boolean; strong?: boolean; onClose: () => void;
}) {
  return (
    <Link href={href} onClick={onClose} aria-current={current ? "page" : undefined}
      className={`${row} ${current ? `${on} font-semibold` : strong ? "font-semibold text-white hover:bg-nav-active/40" : "font-medium text-nav-text hover:bg-nav-active/40"}`}>
      <Glyph size={18} aria-hidden />
      <span className="flex-1">{label}</span>
      {badge !== undefined && <span className={`text-xs ${current ? "text-nav-text" : "text-nav-muted"}`}>{badge}</span>}
    </Link>
  );
}

function WorkspaceSwitcher({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { me, ws, mutate } = useMe();
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close(); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("mousedown", down); document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", down); document.removeEventListener("keydown", key); };
  }, [open, close]);
  if (!ws) return null;
  const initials = ws.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open} aria-label="Switch workspace"
        className="flex min-h-14 w-full items-center gap-2.5 rounded-[10px] border border-[#222b3d] bg-[#151c2c] px-2.5 py-2 text-left">
        {ws.logo_url ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={ws.logo_url} alt="" className="size-8 shrink-0 rounded-lg bg-white object-contain" />
          : <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#26324a] text-xs font-semibold text-white">{initials}</span>}
        <span className="min-w-0 flex-1"><span className="block truncate font-semibold text-white">{ws.name}</span><span className="block text-xs text-[#8fb0ff]">{ws.plan.name} plan</span></span>
        <ChevronsUpDown size={16} aria-hidden="true" />
      </button>
      {open && (
        <ul role="listbox" aria-label="Workspaces" className="absolute left-0 right-0 top-[calc(100%+6px)] z-10 overflow-hidden rounded-xl border border-[#222b3d] bg-[#151c2c] p-1.5 shadow-xl">
          {me?.workspaces.map((w) => (
            <li key={w.id} role="option" aria-selected={w.id === ws.id}>
              <button onClick={async () => { close(); onClose(); if (w.id !== ws.id) { await send("POST", "/api/auth/switch", { workspace_id: w.id }); await mutate(); router.push("/overview"); } }}
                className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm text-white hover:bg-nav-active">
                <span className="flex-1 truncate">{w.name}</span>{w.id === ws.id && <Check size={16} aria-hidden="true" />}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Nav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const path = usePathname();
  const tab = useSearchParams().get("tab") ?? "company";
  const { ws, isAdmin } = useMe();
  const is = (href: string) => path === href || path.startsWith(href + "/");
  const settings = path === "/settings";

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={onClose} aria-hidden="true" />}
      <aside aria-label="Sidebar"
        className={`fixed bottom-0 left-0 top-[var(--support-h,0px)] z-50 flex w-64 flex-col gap-5 overflow-y-auto bg-nav px-3.5 py-5 text-sm text-nav-text transition-transform duration-200 lg:z-30 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <Link href="/overview" onClick={onClose} className="flex items-center gap-2.5 px-2">
          <span className="flex size-[34px] items-center justify-center rounded-[9px] bg-[#2f6bff]"><Icon.pulse /></span>
          <span className="text-[17px] font-semibold text-white">SiteWatch</span>
        </Link>

        <WorkspaceSwitcher onClose={onClose} />

        <nav aria-label="Main" className="flex flex-1 flex-col gap-1">
          <Item href="/overview" label="Overview" Icon={LayoutGrid} current={path === "/overview"} strong onClose={onClose} />
          <Item href="/websites" label="Websites" Icon={Globe} badge={ws?.usage.sites} current={is("/websites")} strong onClose={onClose} />
          <Item href="/subscriptions" label="Subscriptions" Icon={Receipt} current={is("/subscriptions")} strong onClose={onClose} />
          <span className="mx-2.5 mb-1.5 mt-[18px] text-[11px] font-semibold uppercase tracking-[0.08em] text-nav-muted">Workspace</span>
          <Item href="/settings?tab=team" label="Team" Icon={Users} current={settings && tab === "team"} onClose={onClose} />
          {isAdmin && <Item href="/settings?tab=billing" label="Billing and plan" Icon={CreditCard} current={settings && tab === "billing"} onClose={onClose} />}
          <Item href="/settings" label="Settings" Icon={Settings} current={settings && tab !== "team" && tab !== "billing"} onClose={onClose} />
          <Item href="/activity" label="Activity logs" Icon={Clock} current={is("/activity")} onClose={onClose} />
        </nav>

        {ws && (
          <div className="flex flex-col gap-3 rounded-xl border border-[#222b3d] bg-[#151c2c] p-3.5">
            <span className="text-[13px] font-semibold text-white">Your plan usage</span>
            {[["Websites", ws.usage.sites, ws.plan.sites], ["Team members", ws.usage.seats, ws.plan.members]].map(([label, used, of]) => (
              <div key={label as string} className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs"><span>{label}</span><span className="font-semibold text-white">{used} of {of}</span></div>
                <div className="h-1.5 rounded-[3px] bg-[#26324a]"><div className="h-1.5 rounded-[3px] bg-[#4fd08f]" style={{ width: `${Math.min(100, ((used as number) / Math.max(of as number, 1)) * 100)}%` }} /></div>
              </div>
            ))}
            {isAdmin && <Link href="/settings?tab=billing" onClick={onClose} className="flex min-h-10 items-center justify-center rounded-lg bg-[#2f6bff] text-[13px] font-semibold text-white">Manage plan</Link>}
          </div>
        )}
      </aside>
    </>
  );
}

export function Sidebar(props: { open: boolean; onClose: () => void }) {
  return <Suspense><Nav {...props} /></Suspense>;
}
