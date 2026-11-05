import { useId } from "react";

/** The SiteRadar mark: a radar with a sweep line and a detected point. */
export function LogoMark({ size = 34, className = "" }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" role="img" aria-label="SiteRadar" className={className}>
      <defs>
        <linearGradient id={id} x1="6" y1="58" x2="58" y2="6" gradientUnits="userSpaceOnUse"><stop stopColor="#F97316" /><stop offset="1" stopColor="#FDBA74" /></linearGradient>
      </defs>
      <g stroke={`url(#${id})`} strokeWidth="5" strokeLinecap="round">
        <path d="M10 38a18 18 0 0 0 17 18" /><path d="M10 38a18 18 0 0 1 14-17.5" />
        <path d="M19.5 38a8.5 8.5 0 1 0 8.5-8.5" />
        <path d="M28 38 45 20" />
      </g>
      <circle cx="28" cy="38" r="4.5" fill="#F97316" /><circle cx="46.5" cy="18.5" r="5" fill="#F97316" />
      <path d="M36 9.5A27 27 0 0 1 55 28" stroke={`url(#${id})`} strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ dark = false, size = 34 }: { dark?: boolean; size?: number }) {
  return (
    <span className="flex items-center gap-2">
      <LogoMark size={size} />
      <span className={`text-[21px] font-bold tracking-[-0.03em] ${dark ? "text-white" : "text-ink"}`}>SiteRadar</span>
    </span>
  );
}
