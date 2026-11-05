/* eslint-disable @next/next/no-img-element -- fixed brand files from /public, no resizing needed */

/** The SiteRadar logo with its tagline. `dark` is the version for dark backgrounds. */
export function Logo({ dark = false, height = 44, className = "" }: { dark?: boolean; height?: number; className?: string }) {
  return <img src={dark ? "/logos/siteradar-logo-horizontal-dark.svg" : "/logos/siteradar-logo-horizontal.svg"} alt="SiteRadar" height={height} style={{ height, width: "auto" }} className={className} />;
}

/** The radar mark on its orange tile, for places that only have room for the symbol. */
export function LogoMark({ size = 34, className = "" }: { size?: number; className?: string }) {
  return <img src="/app-icon/siteradar-app-icon.svg" alt="SiteRadar" width={size} height={size} className={className} />;
}
