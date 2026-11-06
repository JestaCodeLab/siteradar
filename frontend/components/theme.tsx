"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Moon, Sun } from "lucide-react";

const KEY = "sitewatch.theme";
const EVENT = "sitewatch-theme";
/** Pages that follow the theme. The marketing site and sign-in pages stay light. */
export const THEMED = /^\/(overview|websites|reports|subscriptions|settings|activity|billing|team|admin)(\/|$)/;

/** Run before the first paint (see the layout), so a dark page never flashes white. */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('${KEY}');var d=t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches;
if(d&&${THEMED}.test(location.pathname))document.documentElement.classList.add('dark')}catch(e){}})()`;

function wantsDark() {
  try {
    const t = localStorage.getItem(KEY);
    return t ? t === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch { return false; }
}

const subscribe = (cb: () => void) => { window.addEventListener(EVENT, cb); return () => window.removeEventListener(EVENT, cb); };
const snapshot = () => document.documentElement.classList.contains("dark");

/** Keeps the page in step with the saved choice when moving between themed and plain pages. */
export function ThemeSync() {
  const path = usePathname();
  useEffect(() => {
    document.documentElement.classList.toggle("dark", THEMED.test(path) && wantsDark());
    window.dispatchEvent(new Event(EVENT));
  }, [path]);
  return null;
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const dark = useSyncExternalStore(subscribe, snapshot, () => false);
  function flip() {
    const next = !dark;
    try { localStorage.setItem(KEY, next ? "dark" : "light"); } catch { /* optional */ }
    document.documentElement.classList.toggle("dark", next);
    window.dispatchEvent(new Event(EVENT));
  }
  return (
    <button onClick={flip} aria-pressed={dark} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} title={dark ? "Light mode" : "Dark mode"}
      className={`relative flex size-11 items-center justify-center rounded-lg text-[#3F4857] hover:bg-soft ${className}`}>
      {dark ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
    </button>
  );
}
