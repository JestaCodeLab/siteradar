"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import { fetcher, type SitesResponse } from "@/lib/api";
import { Icon } from "./ui";

const row = "flex min-h-11 items-center gap-2.5 rounded-lg px-2.5 text-sm";
const sub = "flex min-h-10 items-center gap-2.5 rounded-lg pl-9 pr-2.5 text-sm";
const idle = "text-nav-text hover:bg-nav-active/60";
const active = "bg-nav-active font-medium text-white";

type GroupId = "sites" | "subs";

function Group({ title, icon, open, current, onToggle, children }: {
  title: string; icon: React.ReactNode; open: boolean; current: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <button onClick={onToggle} aria-expanded={open}
        className={`${row} w-full text-left font-semibold ${current && !open ? "bg-nav-active/70 text-white" : "text-white hover:bg-nav-active/40"}`}>
        {icon}
        <span className="flex-1">{title}</span>
        {open ? <Icon.chevronDown /> : <Icon.chevronRight />}
      </button>
      {open && <div className="flex flex-col gap-0.5">{children}</div>}
    </div>
  );
}

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const path = usePathname();
  const { data } = useSWR<SitesResponse>("/api/sites", fetcher, { refreshInterval: 60000 });
  // Collapsed by default. Opening one group closes the other.
  const [group, setGroup] = useState<GroupId | null>(null);
  const toggle = (id: GroupId) => setGroup((g) => (g === id ? null : id));

  const is = (href: string) => path === href || path.startsWith(href + "/");
  const sitesCurrent = is("/websites");
  const subsCurrent = is("/subscriptions");

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={onClose} aria-hidden="true" />}
      <aside aria-label="Sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col overflow-y-auto bg-nav text-nav-text transition-transform duration-200 lg:z-30 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="px-3.5 pb-3 pt-5">
          <Link href="/overview" onClick={onClose} className="flex items-center gap-2.5 px-2">
            <span className="flex size-[34px] items-center justify-center rounded-[9px] bg-[#2f6bff]"><Icon.pulse /></span>
            <span className="flex flex-col">
              <span className="text-[17px] font-semibold leading-tight text-white">SiteWatch</span>
              <span className="text-xs text-nav-muted">Upplause Consulting</span>
            </span>
          </Link>
        </div>

        <nav aria-label="Main" className="flex flex-1 flex-col gap-2 px-3.5 pt-2">
          <Link href="/overview" onClick={onClose} className={`${row} font-semibold ${path === "/overview" ? active : "text-white hover:bg-nav-active/40"}`}>
            <Icon.grid />Overview
          </Link>

          <Group title="Websites" icon={<Icon.globe />} open={group === "sites"} current={sitesCurrent} onToggle={() => toggle("sites")}>
            {data?.sites.map((s) => (
              <Link key={s.id} href={`/websites/${s.id}`} onClick={onClose} className={`${sub} ${is(`/websites/${s.id}`) ? active : idle}`}>
                <span className={`size-2 shrink-0 rounded-full ${s.status === "down" || s.status === "warn" ? "bg-[#ff6b5b]" : s.status === "unknown" ? "bg-nav-muted" : "bg-[#4fd08f]"}`} />
                <span className="truncate">{s.name}</span>
                {(s.status === "down" || s.status === "warn") && <span className="sr-only">(down)</span>}
              </Link>
            ))}
            <Link href="/websites/new" onClick={onClose} className={`${sub} font-medium text-[#8fb0ff] hover:bg-nav-active/60`}>
              <Icon.plus /> Add website
            </Link>
          </Group>

          <Group title="Subscriptions" icon={<Icon.receipt />} open={group === "subs"} current={subsCurrent} onToggle={() => toggle("subs")}>
            <Link href="/subscriptions" onClick={onClose} className={`${sub} ${is("/subscriptions") && !is("/subscriptions/reports") ? active : idle}`}>All subscriptions</Link>
            <Link href="/subscriptions/reports" onClick={onClose} className={`${sub} ${is("/subscriptions/reports") ? active : idle}`}>Monthly reports</Link>
          </Group>
        </nav>

        <div className="mt-4 flex flex-col gap-1 border-t border-[#222b3d] px-3.5 py-3.5">
          <Link href="/settings" onClick={onClose} className={`${row} ${is("/settings") ? active : idle}`}><Icon.settings />Settings</Link>
          <Link href="/activity" onClick={onClose} className={`${row} ${is("/activity") ? active : idle}`}><Icon.activity />Activity logs</Link>
        </div>
      </aside>
    </>
  );
}
