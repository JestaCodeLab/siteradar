"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [menu, setMenu] = useState(false);
  return (
    <div className="min-h-screen">
      <Sidebar open={menu} onClose={() => setMenu(false)} />
      <div className="flex min-h-screen flex-col lg:pl-64">
        <Topbar onMenu={() => setMenu(true)} />
        <main className="min-w-0 flex-1 px-4 py-5 lg:px-6">
          <div className="mx-auto flex max-w-[1400px] flex-col gap-5">{children}</div>
        </main>
        <footer className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-t border-line bg-surface px-4 py-4 text-[13px] text-muted lg:px-6">
          <span>© {new Date().getFullYear()} SiteWatch. All rights reserved.</span>
          <span>Powered by <span className="font-medium text-ink-2">Upplause Consulting</span></span>
        </footer>
      </div>
    </div>
  );
}
