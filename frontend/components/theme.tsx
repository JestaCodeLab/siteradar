"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Moon, Sun } from "lucide-react";

const KEY = "sitewatch.theme";
const EVENT = "sitewatch-theme";
/** Pages that stay light: sign-in, sign-up and onboarding. Everything else follows the theme, including addresses that do not exist (the 404 page). */
export const LIGHT_ONLY = /^\/(login|signup|verify|forgot|invite|auth|onboarding)(\/|$)/;

/** The signed-in app and the admin area. Their dark theme is navy; every other themed page (the public website) uses neutral black and grey. */
export const APP_PAGES = /^\/(overview|websites|reports|subscriptions|settings|activity|billing|team|admin)(\/|$)/;

/** Run before the first paint (see the layout), so a dark page never flashes white. Also marks public pages "dark-public", so the loader matches them. */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('${KEY}');var d=t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches;
var p=location.pathname;if(d&&!${LIGHT_ONLY}.test(p)){var c=document.documentElement.classList;c.add('dark');if(!${APP_PAGES}.test(p))c.add('dark-public')}}catch(e){}})()`;

function wantsDark() {
  try {
    const t = localStorage.getItem(KEY);
    return t ? t === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch { return false; }
}

const subscribe = (cb: () => void) => { window.addEventListener(EVENT, cb); return () => window.removeEventListener(EVENT, cb); };
const snapshot = () => document.documentElement.classList.contains("dark");

/** Whether the page is showing the dark theme right now. */
export function useDark() {
  return useSyncExternalStore(subscribe, snapshot, () => false);
}

/** Keeps the page in step with the saved choice when moving between themed and plain pages. */
export function ThemeSync() {
  const path = usePathname();
  useEffect(() => {
    const dark = !LIGHT_ONLY.test(path) && wantsDark();
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.classList.toggle("dark-public", dark && !APP_PAGES.test(path));
    window.dispatchEvent(new Event(EVENT));
  }, [path]);
  return null;
}

export function ThemeToggle({ className = "", marketing = false }: { className?: string; marketing?: boolean }) {
  const dark = useDark();
  function flip() {
    const next = !dark;
    try { localStorage.setItem(KEY, next ? "dark" : "light"); } catch { /* optional */ }
    document.documentElement.classList.toggle("dark", next);
    document.documentElement.classList.toggle("dark-public", next && !APP_PAGES.test(location.pathname));
    window.dispatchEvent(new Event(EVENT));
  }
  return (
    <button onClick={flip} aria-pressed={dark} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} title={dark ? "Light mode" : "Dark mode"}
      className={`relative flex items-center justify-center rounded-lg ${marketing ? "size-10 text-[#334155] hover:bg-[#FFF7ED]" : "size-11 text-[#3F4857] hover:bg-soft"} ${className}`}>
      {dark ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
    </button>
  );
}
