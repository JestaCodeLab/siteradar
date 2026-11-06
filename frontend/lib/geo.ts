"use client";

import useSWR from "swr";
import { fetcher } from "./api";

/** Country names the onboarding form offers, by two-letter code. Anything else becomes "Other". */
const NAMES: Record<string, string> = { GH: "Ghana", NG: "Nigeria", KE: "Kenya", ZA: "South Africa", GB: "United Kingdom" };
export const countryName = (code?: string | null) => (code ? NAMES[code.toUpperCase()] ?? "Other" : null);

function fromTimezone(): string | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return { "Africa/Accra": "GH", "Africa/Lagos": "NG", "Africa/Nairobi": "KE", "Africa/Johannesburg": "ZA", "Europe/London": "GB" }[tz] ?? null;
  } catch { return null; }
}

/** The visitor's two-letter country: from the server's geo headers, else a guess from the browser time zone. undefined while loading. */
export function useVisitorCountry(): string | null | undefined {
  const { data, error } = useSWR<{ country: string | null }>("/api/geo", fetcher, { revalidateOnFocus: false });
  if (!data && !error) return undefined;
  return data?.country ?? fromTimezone();
}
