"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import type { PlanInfo, Workspace } from "@/lib/api";
import { usePlans } from "@/lib/plans";
import { useMe } from "@/lib/me";

/** What a plan has to offer for a feature to be on. Used for the workspace's own plan and to find the cheapest plan that has it. */
type Shape = Pick<PlanInfo, "members" | "channels" | "client_access" | "clean_reports" | "sms">;
const has = {
  team: (p: Shape) => p.members > 1,
  chat: (p: Shape) => p.channels.includes("chat"),
  sms: (p: Shape) => p.channels.includes("sms") || p.sms > 0,
  clients: (p: Shape) => p.client_access,
  clean: (p: Shape) => p.clean_reports,
} as const;
export type Feature = keyof typeof has;

/** Whether the current plan includes a feature, and the name of the cheapest plan that does. */
export function useFeature(feature: Feature): { allowed: boolean; plan: string | null } {
  const { ws } = useMe();
  const catalogue = usePlans();
  const allowed = !ws || has[feature](ws.plan as Workspace["plan"] & Shape);
  const plan = catalogue?.plans.find((p) => has[feature](p))?.name ?? null;
  return { allowed, plan };
}

export function LockBadge({ plan, className = "" }: { plan: string | null; className?: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full bg-line-soft px-2.5 py-1 text-xs font-semibold text-ink-2 ${className}`}>
      <Lock aria-hidden="true" size={12} />{plan ? `${plan} plan` : "Upgrade"}
    </span>
  );
}

/** The call to upgrade: a link for people who can change the plan, a hint for everyone else. */
export function UpgradeLink({ plan, className = "" }: { plan: string | null; className?: string }) {
  const { isAdmin } = useMe();
  return isAdmin
    ? <Link href="/settings?tab=billing" className={`inline-flex min-h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover ${className}`}>{plan ? `Upgrade to ${plan}` : "Upgrade"}</Link>
    : <span className={`text-[13px] text-muted ${className}`}>Ask an owner or admin to upgrade.</span>;
}

/**
 * Shows a section the plan does not include. The content stays visible but dimmed and out of reach, with a
 * panel on top that says which plan unlocks it. Renders the content as normal once the plan has it.
 */
export function Locked({ feature, title, children, className = "" }: { feature: Feature; title?: string; children: ReactNode; className?: string }) {
  const { allowed, plan } = useFeature(feature);
  if (allowed) return <>{children}</>;
  return (
    <div className={`relative ${className}`}>
      <div inert aria-hidden="true" className="pointer-events-none select-none opacity-50">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center p-3">
        <div role="note" className="flex max-w-full flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-xl border border-line bg-surface px-4 py-3 shadow-[0_8px_30px_rgba(15,23,42,0.14)]">
          <span className="flex items-center gap-2.5 text-sm">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand"><Lock aria-hidden="true" size={16} /></span>
            <span><b className="font-semibold">{title ?? "Locked"}</b><span className="block text-[13px] text-muted">{plan ? `Included from the ${plan} plan.` : "Not on your plan."}</span></span>
          </span>
          <UpgradeLink plan={plan} />
        </div>
      </div>
    </div>
  );
}
