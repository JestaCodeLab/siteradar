"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon, Skeleton } from "@/components/ui";
import { Logo } from "@/components/mkt";
import { send } from "@/lib/api";
import { useMe } from "@/lib/me";

const nav = [["/admin", "Overview"], ["/admin/customers", "Customers"], ["/admin/plans", "Plans and pricing"], ["/admin/payments", "Payments"], ["/admin/health", "Platform health"], ["/admin/audit", "Audit and messages"]];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { me, user, isLoading, mutate } = useMe();
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    if (isLoading || !me) return;
    if (!me.authenticated) router.replace("/login");
    else if (!me.user?.is_super) router.replace("/overview");
  }, [me, isLoading, router]);

  if (!user?.is_super) return <div className="p-8"><Skeleton className="h-10 w-64" /></div>;
  const is = (h: string) => (h === "/admin" ? path === h : path === h || path.startsWith(h + "/"));
  async function logout() { await send("POST", "/api/auth/logout").catch(() => {}); await mutate(); router.replace("/login"); }

  return (
    <div className="min-h-screen">
      {menu && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMenu(false)} aria-hidden="true" />}
      <aside aria-label="Admin" className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#161233] text-[#cfc8f5] transition-transform lg:translate-x-0 ${menu ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="px-5 pb-3 pt-5"><Logo dark /><p className="mt-2 w-fit rounded bg-[#5b3fd1] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white">Super admin</p></div>
        <nav className="flex flex-1 flex-col gap-1 px-3.5 pt-3">
          {nav.map(([h, l]) => <Link key={h} href={h} onClick={() => setMenu(false)} className={`flex min-h-11 items-center rounded-lg px-3 text-sm ${is(h) ? "bg-[#2a2360] font-medium text-white" : "hover:bg-[#2a2360]/60"}`}>{l}</Link>)}
        </nav>
        <div className="flex flex-col gap-1 border-t border-[#2a2360] px-3.5 py-3.5 text-sm">
          <Link href="/overview" className="flex min-h-11 items-center rounded-lg px-3 hover:bg-[#2a2360]/60">Back to my workspace</Link>
          <button onClick={logout} className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-left hover:bg-[#2a2360]/60"><Icon.logout />Log out</button>
        </div>
      </aside>
      <div className="flex min-h-screen flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-surface px-3 lg:px-6">
          <button onClick={() => setMenu(true)} aria-label="Open menu" className="flex size-11 items-center justify-center rounded-lg hover:bg-soft lg:hidden"><Icon.menu /></button>
          <span className="hidden text-sm text-muted lg:block">Signed in as {user.email}</span><span />
        </header>
        <main className="min-w-0 flex-1 px-4 py-5 lg:px-6"><div className="mx-auto flex max-w-[1300px] flex-col gap-5">{children}</div></main>
      </div>
    </div>
  );
}
