"use client";

import useSWR from "swr";
import { fetcher, type Me } from "./api";

/** The signed-in person, their workspace and role. Shared by every page through SWR's cache. */
export function useMe() {
  const { data, error, mutate, isLoading } = useSWR<Me>("/api/auth/me", fetcher, { revalidateOnFocus: true });
  const ws = data?.workspace ?? null;
  return {
    me: data, ws, user: data?.user ?? null, error, mutate, isLoading,
    role: ws?.role ?? null,
    canWrite: !!ws && ws.role !== "viewer",
    isAdmin: ws?.role === "owner" || ws?.role === "admin",
    isOwner: ws?.role === "owner",
    /** SMS alerts go through FlockText, which only reaches Ghanaian numbers. */
    isGhana: ws?.country === "Ghana",
  };
}

export const ghs = (n: number) => `GHS ${n.toLocaleString("en-GH", { maximumFractionDigits: 2, minimumFractionDigits: n % 1 ? 2 : 0 })}`;

/** An amount in the plan's currency: "GHS 99" for cedis, "$8" for dollars. Whole units unless there are pesewas or cents. */
export const money = (n: number, currency = "GHS") =>
  currency === "USD" ? `$${n.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: n % 1 ? 2 : 0 })}` : ghs(n);


/** Where a person belongs right after signing in. */
export function homeFor(me: Me): string {
  if (!me.workspace) return me.user?.is_super ? "/admin" : "/onboarding/company";
  if (!me.workspace.onboarded) return "/onboarding/plan";      // the company is saved with the workspace, so only the plan is left
  return "/overview";
}
