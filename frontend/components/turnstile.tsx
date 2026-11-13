"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id?: string) => void;
    };
  }
}

export const turnstileKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function load(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src^="https://challenges.cloudflare.com/turnstile"]`);
    const s = existing ?? Object.assign(document.createElement("script"), { src: SCRIPT, async: true, defer: true });
    s.addEventListener("load", () => resolve());
    s.addEventListener("error", () => reject(new Error("The security check could not load.")));
    if (!existing) document.head.appendChild(s);
  });
}

/**
 * Cloudflare Turnstile: a small check that the person filling in a form is not a bot. It hands the page a one-time token through `onToken`
 * (null again when it expires or fails), which the form sends along and the server verifies. A token works once, so change `resetKey` after a failed submit.
 * Renders nothing when no site key is set, so local development works without it.
 */
export function Turnstile({ onToken, resetKey = 0 }: { onToken: (token: string | null) => void; resetKey?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const cb = useRef(onToken);
  cb.current = onToken;

  useEffect(() => {
    if (!turnstileKey || !box.current) return;
    let gone = false;
    load().then(() => {
      if (gone || !box.current || !window.turnstile) return;
      widget.current = window.turnstile.render(box.current, {
        sitekey: turnstileKey, theme: "light", size: "flexible",
        callback: (t: string) => cb.current(t),
        "expired-callback": () => cb.current(null),
        "error-callback": () => cb.current(null),
      });
    }).catch(() => cb.current(null));
    return () => { gone = true; if (widget.current) window.turnstile?.remove(widget.current); widget.current = null; };
  }, []);

  useEffect(() => {
    if (resetKey && widget.current) { cb.current(null); window.turnstile?.reset(widget.current); }
  }, [resetKey]);

  if (!turnstileKey) return null;
  return <div ref={box} className="min-h-[65px]" aria-label="Security check" />;
}
