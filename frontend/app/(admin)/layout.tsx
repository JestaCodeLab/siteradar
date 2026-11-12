"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Activity, Clock, CreditCard, LayoutGrid, Sparkles, Star, Tag, Users } from "lucide-react";
import useSWR from "swr";
import { PageLoader } from "@/components/page-loader";
import { AdminTopbar } from "@/components/admin/topbar";
import { Logo } from "@/components/logo";
import { SUPPORT_EMAIL } from "@/lib/brand";
import { fetcher } from "@/lib/api";
import { useMe } from "@/lib/me";

interface Summary { customers: number; failed_payments: number; attention: number; env: string }
const nav = [
  { href: "/admin", label: "Overview", Icon: LayoutGrid },
  { href: "/admin/customers", label: "Customers", Icon: Users, badge: "customers" as const },
  { href: "/admin/plans", label: "Plans and pricing", Icon: Star },
  { href: "/admin/payments", label: "Payments", Icon: CreditCard, badge: "failed_payments" as const },
  { href: "/admin/discounts", label: "Discount codes", Icon: Tag },
  { href: "/admin/ai", label: "AI credits", Icon: Sparkles },
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

  if (!user?.is_super) return <PageLoader />;
  const is = (h: string) => (h === "/admin" ? path === h : path === h || path.startsWith(h + "/"));

  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      {menu && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMenu(false)} aria-hidden="true" />}
      <aside aria-label="Admin" className={`fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col gap-5 bg-[#16122B] px-3.5 py-5 text-sm text-[#CFC8EA] transition-transform lg:translate-x-0 ${menu ? "translate-x-0" : "-translate-x-full"}`}>
        <Link href="/admin" onClick={() => setMenu(false)} className="flex items-center gap-2.5 px-2">
          <span className="flex flex-col gap-1"><Logo dark height={42} />
            <span className="w-fit rounded bg-[#6B4FE0] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-white">Super admin</span></span>
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
        <div className="border-t border-[#2E2658] pt-3">
          <Link href="/admin/activity" onClick={() => setMenu(false)} aria-current={is("/admin/activity") ? "page" : undefined}
            className={`flex min-h-11 items-center gap-2.5 rounded-lg px-2.5 ${is("/admin/activity") ? "bg-[#2A2150] font-semibold text-white" : "font-medium text-[#E7E2FA] hover:bg-[#2A2150]/60"}`}>
            <Clock size={18} aria-hidden="true" />Activity logs
          </Link>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col lg:pl-[264px]">
        <AdminTopbar user={user} env={summary?.env ?? "Production"} onMenu={() => setMenu(true)} />
        <main className="min-w-0 flex-1 p-4 lg:p-6"><div className="mx-auto flex max-w-[1400px] flex-col gap-6">{children}</div></main>
        <footer className="mt-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-t border-[#E2E5EA] bg-white px-4 py-4 text-[13px] text-[#5B6472] lg:px-6">
          <span>© {new Date().getFullYear()} SiteRadar. All rights reserved.</span>
          {SUPPORT_EMAIL && <span>Support: <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-[#3F4857] hover:text-[#0F172A]">{SUPPORT_EMAIL}</a></span>}
        </footer>
      </div>
    </div>
  );
}
