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
    /** Whether the workspace is in Ghana (prices in cedis). */
    isGhana: ws?.country === "Ghana",
  };
}

export const ghs = (n: number) => `GHS ${n.toLocaleString("en-GH", { maximumFractionDigits: 2, minimumFractionDigits: n % 1 ? 2 : 0 })}`;

/** An amount in the plan's currency: "$8" for dollars (everyone is billed in USD; GHS only shows on old records). Whole units unless there are pesewas or cents. */
export const money = (n: number, currency = "USD") =>
  currency === "USD" ? `$${n.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: n % 1 ? 2 : 0 })}` : ghs(n);


/** Where a person belongs right after signing in. */
export function homeFor(me: Me): string {
  if (me.mfa_pending) return "/2fa";          // a super admin's second step comes before anything else
  if (!me.workspace) return me.user?.is_super ? "/admin" : "/onboarding/company";
  if (!me.workspace.onboarded) return "/onboarding/plan";      // the company is saved with the workspace, so only the plan is left
  return "/overview";
}
