"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Activity, ChevronLeft, CreditCard, LayoutGrid, Star, Users } from "lucide-react";
import useSWR from "swr";
import { Skeleton } from "@/components/ui";
import { initials } from "@/components/admin/ui";
import { AdminTopbar } from "@/components/admin/topbar";
import { fetcher } from "@/lib/api";
import { useMe } from "@/lib/me";

interface Summary { customers: number; failed_payments: number; attention: number; env: string }
const nav = [
  { href: "/admin", label: "Overview", Icon: LayoutGrid },
  { href: "/admin/customers", label: "Customers", Icon: Users, badge: "customers" as const },
  { href: "/admin/plans", label: "Plans and pricing", Icon: Star },
  { href: "/admin/payments", label: "Payments", Icon: CreditCard, badge: "failed_payments" as const },
  { href: "/admin/health", label: "Platform health", Icon: Activity },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { me, user, isLoading } = useMe();
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
        <AdminTopbar user={user} env={summary?.env ?? "Production"} onMenu={() => setMenu(true)} />
        <main className="min-w-0 flex-1 p-4 lg:p-6"><div className="mx-auto flex max-w-[1400px] flex-col gap-6">{children}</div></main>
      </div>
    </div>
  );
}
