"use client";

import { useSyncExternalStore } from "react";
import { send } from "@/lib/api";

/** Everything the app needs to know about installing it and about browser notifications on this device. */
export interface PwaState {
  ready: boolean;
  installed: boolean;          // running as an installed app (home screen, dock or desktop window)
  canPrompt: boolean;          // the browser offered to install it, so one click does it
  ios: boolean;                // iPhone or iPad in the browser: installing is a manual step (Share, Add to Home Screen)
  pushSupported: boolean;
  permission: NotificationPermission | "unsupported";
  subscribed: boolean;         // this device is signed up for alerts
}

let state: PwaState = { ready: false, installed: false, canPrompt: false, ios: false, pushSupported: false, permission: "unsupported", subscribed: false };
const server: PwaState = state;
const listeners = new Set<() => void>();
let deferred: (Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }) | null = null;
let started = false;

function set(patch: Partial<PwaState>) { state = { ...state, ...patch }; listeners.forEach((l) => l()); }
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

function keyBytes(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Start once per page load: register the service worker and find out where this device stands. */
export function startPwa() {
  if (started || typeof window === "undefined") return;
  started = true;
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone;
  const pushSupported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  set({ installed: standalone, ios, pushSupported, permission: "Notification" in window ? Notification.permission : "unsupported" });

  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e as typeof deferred; set({ canPrompt: true }); });
  window.addEventListener("appinstalled", () => { deferred = null; set({ installed: true, canPrompt: false }); });

  if (!("serviceWorker" in navigator)) { set({ ready: true }); return; }
  navigator.serviceWorker.register("/sw.js", { scope: "/" })
    .then(() => navigator.serviceWorker.ready)
    .then((reg) => reg.pushManager.getSubscription())
    .then((sub) => set({ ready: true, subscribed: !!sub }))
    .catch(() => set({ ready: true }));
}

export function usePwa() {
  return useSyncExternalStore(subscribe, () => state, () => server);
}

export async function installApp() {
  if (!deferred) return false;
  await deferred.prompt();
  const choice = await deferred.userChoice;
  deferred = null; set({ canPrompt: false });
  return choice.outcome === "accepted";
}

/** Ask permission (must be called from a click) and sign this device up for alerts. Returns an error message, or null when it worked. */
export async function enablePush(publicKey: string): Promise<string | null> {
  if (!state.pushSupported) return "This browser can't show notifications.";
  const permission = await Notification.requestPermission();
  set({ permission });
  if (permission !== "granted") return permission === "denied" ? "Notifications are blocked for this site. Allow them in your browser's site settings, then try again." : "Notifications were not turned on.";
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) as BufferSource });
    await send("POST", "/api/push/subscribe", { subscription: sub.toJSON() });
    set({ subscribed: true });
    return null;
  } catch (e) { return e instanceof Error ? e.message : "Could not turn on notifications."; }
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) { await send("POST", "/api/push/unsubscribe", { endpoint: sub.endpoint }).catch(() => {}); await sub.unsubscribe(); }
  set({ subscribed: false });
}
