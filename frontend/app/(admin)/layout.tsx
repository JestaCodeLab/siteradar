"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Activity, Bell, ChevronLeft, CreditCard, LayoutGrid, Menu, Search, Star, Users } from "lucide-react";
import useSWR from "swr";
import { Skeleton } from "@/components/ui";
import { avatarColor, initials } from "@/components/admin/ui";
import { fetcher, send } from "@/lib/api";
import { useMe } from "@/lib/me";

interface Summary { customers: number; failed_payments: number; attention: number; env: string }
const nav = [
  { href: "/admin", label: "Overview", Icon: LayoutGrid },
  { href: "/admin/customers", label: "Customers", Icon: Users, badge: "customers" as const },
  { href: "/admin/plans", label: "Plans and pricing", Icon: Star },
  { href: "/admin/payments", label: "Payments", Icon: CreditCard, badge: "failed_payments" as const },
  { href: "/admin/health", label: "Platform health", Icon: Activity },
];

function SearchBox() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data } = useSWR<{ results: { id: number; name: string; email: string; plan: string }[] }>(q.trim().length >= 2 ? `/api/admin/search?q=${encodeURIComponent(q.trim())}` : null, fetcher);
  useEffect(() => {
    const down = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", down); return () => document.removeEventListener("mousedown", down);
  }, []);
  return (
    <div ref={ref} className="relative min-w-0 max-w-[420px] flex-[1_1_260px]">
      <div className="flex min-h-10 items-center gap-2 rounded-lg border border-[#C9CFD8] px-3 text-[#5B6472]">
        <Search size={16} aria-hidden="true" />
        <label htmlFor="admin-q" className="sr-only">Search customers</label>
        <input id="admin-q" value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder="Search customers, emails, websites"
          className="w-full bg-transparent text-sm text-[#12151C] outline-none placeholder:text-[#5B6472] focus-visible:!outline-none" />
      </div>
      {open && q.trim().length >= 2 && (
        <ul className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-xl border border-[#E2E5EA] bg-white shadow-lg">
          {(data?.results ?? []).length === 0 && <li className="px-4 py-4 text-sm text-[#5B6472]">{data ? "No customers found." : "Searching…"}</li>}
          {data?.results.map((r) => (
            <li key={r.id}><button onClick={() => { setOpen(false); setQ(""); router.push(`/admin/customers/${r.id}`); }} className="flex min-h-12 w-full items-center gap-3 px-4 text-left hover:bg-[#F5F1FF]">
              <span className="flex min-w-0 flex-1 flex-col"><span className="truncate text-sm font-semibold">{r.name}</span><span className="truncate text-xs text-[#5B6472]">{r.email}</span></span>
              <span className="text-xs text-[#5B6472]">{r.plan}</span></button></li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { me, user, isLoading, mutate } = useMe();
  const { data: summary } = useSWR<Summary>(user?.is_super ? "/api/admin/summary" : null, fetcher, { refreshInterval: 60000 });
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    if (isLoading || !me) return;
    if (!me.authenticated) router.replace("/login");
    else if (!me.user?.is_super) router.replace("/overview");
  }, [me, isLoading, router]);

  if (!user?.is_super) return <div className="p-8"><Skeleton className="h-10 w-64" /></div>;
  const name = `${user.first_name} ${user.last_name}`.trim();
  const is = (h: string) => (h === "/admin" ? path === h : path === h || path.startsWith(h + "/"));
  void mutate; void send;

  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      {menu && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMenu(false)} aria-hidden="true" />}
      <aside aria-label="Admin" className={`fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col gap-5 bg-[#16122B] px-3.5 py-5 text-sm text-[#CFC8EA] transition-transform lg:translate-x-0 ${menu ? "translate-x-0" : "-translate-x-full"}`}>
        <Link href="/admin" onClick={() => setMenu(false)} className="flex items-center gap-2.5 px-2">
          <span className="flex size-[34px] items-center justify-center rounded-[9px] bg-[#6B4FE0]"><Activity size={20} strokeWidth={2.2} color="#fff" aria-hidden="true" /></span>
          <span className="flex flex-col"><span className="text-[17px] font-semibold leading-[1.1] text-white">SiteWatch</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#B6A6FF]">Super admin</span></span>
        </Link>
        <nav aria-label="Admin" className="flex flex-1 flex-col gap-1">
          {nav.map(({ href, label, Icon, badge }) => {
            const on = is(href);
            const count = badge && summary ? summary[badge] : 0;
            return (
              <Link key={href} href={href} onClick={() => setMenu(false)} aria-current={on ? "page" : undefined}
                className={`flex min-h-11 items-center gap-2.5 rounded-lg px-2.5 ${on ? "bg-[#2A2150] font-semibold text-white" : "font-medium text-[#E7E2FA] hover:bg-[#2A2150]/60"}`}>
                <Icon size={18} aria-hidden="true" /><span className="flex-1">{label}</span>
                {count > 0 && <span className={`text-xs ${on ? "text-[#B6A6FF]" : "text-[#9C92C8]"}`}>{count}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="flex flex-col gap-2.5 border-t border-[#2E2658] px-2 pt-3.5">
          <Link href="/overview" className="flex min-h-11 items-center gap-2.5 font-medium text-[#E7E2FA]"><ChevronLeft size={18} aria-hidden="true" />Back to my workspace</Link>
          <div className="flex items-center gap-2.5">
            <span style={{ background: "#2A2150" }} className="flex size-[34px] items-center justify-center rounded-full text-[13px] font-semibold text-white" aria-hidden="true">{initials(name)}</span>
            <span className="flex min-w-0 flex-col"><span className="truncate font-medium text-white">{name}</span><span className="text-xs text-[#9C92C8]">Super admin</span></span>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col lg:pl-[264px]">
        <header className="sticky top-0 z-20 flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b-[3px] border-[#6B4FE0] bg-white px-3 py-1.5 lg:px-6">
          <div className="flex min-w-0 flex-[1_1_360px] flex-wrap items-center gap-x-4 gap-y-2">
            <button onClick={() => setMenu(true)} aria-label="Open menu" className="flex size-11 items-center justify-center rounded-lg hover:bg-[#F5F1FF] lg:hidden"><Menu size={20} /></button>
            <span className="inline-flex min-h-8 items-center gap-2 rounded-full bg-[#EFEAFF] px-3 text-[13px] font-semibold text-[#4A33B0]"><span className="size-2 rounded-full bg-[#6B4FE0]" />Super admin · {summary?.env ?? "Production"}</span>
            <SearchBox />
          </div>
          <div className="flex items-center gap-1">
            <Link href="/admin" aria-label={summary?.attention ? `Alerts, ${summary.attention} need attention` : "Alerts"} className="relative flex size-11 items-center justify-center rounded-lg text-[#3F4857] hover:bg-[#F5F1FF]">
              <Bell size={20} aria-hidden="true" />
              {!!summary?.attention && <span className="absolute right-2 top-2 flex h-4 min-w-4 items-center justify-center rounded-lg bg-[#B3261E] px-1 text-[10px] font-semibold text-white">{summary.attention}</span>}
            </Link>
            <Link href="/overview" className="flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-[#4A33B0]">Exit admin</Link>
          </div>
        </header>
        <main className="min-w-0 flex-1 p-4 lg:p-6"><div className="mx-auto flex max-w-[1400px] flex-col gap-6">{children}</div></main>
      </div>
    </div>
  );
}
