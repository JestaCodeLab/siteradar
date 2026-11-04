"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import { fetcher, send, type SitesResponse } from "@/lib/api";
import { Icon } from "./ui";

const sub = "flex min-h-10 items-center gap-2.5 rounded-lg pl-9 pr-2.5 text-sm";
const idle = "text-nav-text hover:bg-nav-active/60";
const active = "bg-nav-active font-medium text-white";

function Group({ title, icon, open, onToggle, children }: { title: string; icon: React.ReactNode; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <button onClick={onToggle} aria-expanded={open} className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm font-semibold text-white hover:bg-nav-active/40">
        {icon}
        <span className="flex-1">{title}</span>
        {open ? <Icon.chevronDown /> : <Icon.chevronRight />}
      </button>
      {open && <div className="flex flex-col gap-0.5">{children}</div>}
    </div>
  );
}

export function Sidebar() {
  const path = usePathname();
  const router = useRouter();
  const { data } = useSWR<SitesResponse>("/api/sites", fetcher, { refreshInterval: 60000 });
  const [sitesOpen, setSitesOpen] = useState(true);
  const [subsOpen, setSubsOpen] = useState(true);
  const [menu, setMenu] = useState(false);

  const is = (href: string, exact = false) => (exact ? path === href : path === href || path.startsWith(href + "/"));

  async function logout() {
    await send("POST", "/api/auth/logout").catch(() => {});
    router.replace("/login");
  }

  return (
    <aside className="bg-nav text-nav-text lg:w-64 lg:shrink-0">
      <div className="flex items-center justify-between px-4 py-3 lg:px-3.5 lg:pt-5">
        <Link href="/websites" className="flex items-center gap-2.5 px-2">
          <span className="flex size-[34px] items-center justify-center rounded-[9px] bg-[#2f6bff]"><Icon.pulse /></span>
          <span className="flex flex-col">
            <span className="text-[17px] font-semibold leading-tight text-white">SiteWatch</span>
            <span className="text-xs text-nav-muted">Upplause Consulting</span>
          </span>
        </Link>
        <button onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-label="Menu" className="flex size-11 items-center justify-center rounded-lg text-white lg:hidden">
          <Icon.menu />
        </button>
      </div>

      <div className={`${menu ? "flex" : "hidden"} flex-col gap-5 px-3.5 pb-5 lg:flex lg:min-h-[calc(100vh-76px)] lg:pb-5`}>
        <nav aria-label="Main" className="flex flex-1 flex-col gap-4 pt-1">
          <Group title="Websites" icon={<Icon.globe />} open={sitesOpen} onToggle={() => setSitesOpen((o) => !o)}>
            <Link href="/websites" onClick={() => setMenu(false)} className={`${sub} ${is("/websites", true) ? active : idle}`}>All websites</Link>
            {data?.sites.map((s) => (
              <Link key={s.id} href={`/websites/${s.id}`} onClick={() => setMenu(false)} className={`${sub} ${is(`/websites/${s.id}`) ? active : idle}`}>
                <span className={`size-2 shrink-0 rounded-full ${s.status === "down" ? "bg-[#ff6b5b]" : s.status === "unknown" ? "bg-nav-muted" : "bg-[#4fd08f]"}`} />
                <span className="truncate">{s.name}</span>
                <span className="sr-only">{s.status === "down" ? "(down)" : ""}</span>
              </Link>
            ))}
            <Link href="/websites/new" onClick={() => setMenu(false)} className={`${sub} text-[#8fb0ff] font-medium hover:bg-nav-active/60`}>
              <Icon.plus /> Add website
            </Link>
          </Group>

          <Group title="Subscriptions" icon={<Icon.receipt />} open={subsOpen} onToggle={() => setSubsOpen((o) => !o)}>
            <Link href="/subscriptions" onClick={() => setMenu(false)} className={`${sub} ${is("/subscriptions", true) || is("/subscriptions/new", true) || /^\/subscriptions\/\d+/.test(path) ? active : idle}`}>All subscriptions</Link>
            <Link href="/subscriptions/reports" onClick={() => setMenu(false)} className={`${sub} ${is("/subscriptions/reports") ? active : idle}`}>Monthly reports</Link>
          </Group>
        </nav>

        <div className="flex items-center gap-2.5 border-t border-[#222b3d] px-2 pt-3.5">
          <span className="flex size-[34px] items-center justify-center rounded-full bg-[#26324a] text-[13px] font-semibold text-white">UC</span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="font-medium text-white">Team login</span>
            <span className="text-xs text-nav-muted">Shared account</span>
          </span>
          <button onClick={logout} aria-label="Log out" className="flex size-11 items-center justify-center rounded-lg hover:bg-nav-active/60">
            <Icon.logout />
          </button>
        </div>
      </div>
    </aside>
  );
}
