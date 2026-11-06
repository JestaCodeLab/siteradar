"use client";

import { useEffect, useState } from "react";

/**
 * The SiteRadar radar, sweeping. `fullscreen` covers the whole window (a page that is still starting up);
 * without it the loader fills the space it is placed in. `dark` forces the navy version; inside the
 * signed-in app the dark theme switches it on its own.
 */
export function PageLoader({ fullscreen = true, dark, label = "Loading", done }: { fullscreen?: boolean; dark?: boolean; label?: string; done?: boolean }) {
  return (
    <div
      role="status" aria-live="polite" aria-label={label} aria-busy={!done}
      className={`sr-loader ${fullscreen ? "sr-loader--full" : "sr-loader--fill"} ${dark ? "sr-loader--dark" : ""} ${done ? "is-done" : ""}`}
    >
      <svg viewBox="0 0 100 100" width="96" height="96" aria-hidden="true">
        <circle className="sr-ping" cx="50" cy="50" r="40" fill="none" stroke="#F97316" strokeWidth="1.5" />
        <g fill="none" strokeLinecap="round">
          <path d="M68.16 14.36A40 40 0 1 0 34.37 86.82" stroke="#F97316" strokeWidth="5.5" />
          <path className="sr-inner" d="M87.59 36.32A40 40 0 0 1 68.78 85.32" stroke="#FBA23C" strokeWidth="5" />
          <path className="sr-inner" d="M60.57 27.34A25 25 0 1 0 73.49 58.55" stroke="#FBA23C" strokeWidth="5" />
        </g>
        <g className="sr-needle">
          <path d="M50 50L80 20" stroke="#F97316" strokeWidth="4.5" strokeLinecap="round" />
          <circle cx="80" cy="20" r="6" fill="#F97316" />
        </g>
        <circle cx="50" cy="50" r="7.5" fill="#F97316" />
      </svg>
      <span className="sr-loader__label">{label}</span>
    </div>
  );
}

/** Covers the first paint of any page and fades away once the page has loaded (or after a few seconds, whichever is first). */
export function InitialLoader() {
  const [state, setState] = useState<"show" | "fade" | "gone">("show");

  useEffect(() => {
    const finish = () => { setState("fade"); setTimeout(() => setState("gone"), 450); };
    if (document.readyState === "complete") { finish(); return; }
    window.addEventListener("load", finish, { once: true });
    const cap = setTimeout(finish, 6000);
    return () => { window.removeEventListener("load", finish); clearTimeout(cap); };
  }, []);

  return state === "gone" ? null : <PageLoader done={state === "fade"} />;
}
