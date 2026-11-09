"use client";

import Link from "next/link";
import { Check, Lock, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { PlanInfo, Workspace } from "@/lib/api";
import { usePlans } from "@/lib/plans";
import { money, useMe } from "@/lib/me";

/** What a plan has to offer for a feature to be on. Used for the workspace's own plan and to find the cheapest plan that has it. */
type Shape = Pick<PlanInfo, "members" | "channels" | "client_access" | "sms">;
const has = {
  team: (p: Shape) => p.members > 1,
  chat: (p: Shape) => p.channels.includes("chat"),
  sms: (p: Shape) => p.channels.includes("sms") || p.sms > 0,
  clients: (p: Shape) => p.client_access,
} as const;
export type Feature = keyof typeof has;

/** Whether the current plan includes a feature, the cheapest plan that does, and what it costs per month. */
export function useFeature(feature: Feature): { allowed: boolean; plan: string | null; price: string | null } {
  const { ws } = useMe();
  const catalogue = usePlans();
  const allowed = !ws || has[feature](ws.plan as Workspace["plan"] & Shape);
  const target = catalogue?.plans.find((p) => has[feature](p));
  return { allowed, plan: target?.name ?? null, price: target ? `${money(target.price_month, target.currency)} / month` : null };
}

export function LockBadge({ plan, className = "" }: { plan: string | null; className?: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full bg-line-soft px-2.5 py-1 text-xs font-semibold text-ink-2 ${className}`}>
      <Lock aria-hidden="true" size={12} />{plan ? `${plan} plan` : "Upgrade"}
    </span>
  );
}

/** The call to upgrade: a link for people who can change the plan, a hint for everyone else. */
export function UpgradeLink({ plan, price, className = "" }: { plan: string | null; price?: string | null; className?: string }) {
  const { isAdmin } = useMe();
  return isAdmin
    ? <Link href="/settings?tab=billing" className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-hover ${className}`}>{plan ? `Upgrade to ${plan}` : "Upgrade"}{price ? ` · ${price}` : ""}</Link>
    : <span className={`text-[13px] text-muted ${className}`}>Ask an owner or admin to upgrade.</span>;
}

const bar = "rounded-lg bg-line";

/**
 * A section the plan does not include. The real content is never put on the page: in its place there is
 * a blurred stand-in, with a card on top that says what it is, which plan unlocks it and a button to
 * upgrade. Renders the content as normal once the plan has it.
 */
export function Locked({ feature, title, text, icon: Glyph = Lock, chips = [], compact = false, bare = false, children, className = "" }: {
  feature: Feature; title: string; text?: string; icon?: LucideIcon; chips?: string[]; compact?: boolean; /** Sits inside a card that already has a border, so draws none of its own. */ bare?: boolean; children: ReactNode; className?: string;
}) {
  const { allowed, plan, price } = useFeature(feature);
  if (allowed) return <>{children}</>;
  if (compact) {
    return (
      <div className={`relative overflow-hidden rounded-xl border border-line ${className}`}>
        <div aria-hidden="true" className="pointer-events-none flex select-none flex-col gap-2.5 p-5 opacity-70 blur-[5px]"><div className={`${bar} h-4 w-1/4`} /><div className={`${bar} h-11 w-full`} /></div>
        <div role="note" className="absolute inset-0 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 bg-surface/40 px-5 py-4">
          <span className="flex items-center gap-3 text-sm">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand"><Glyph aria-hidden="true" size={18} /></span>
            <span><b className="font-semibold">{title}</b><span className="block text-[13px] text-muted">{plan ? `Included from the ${plan} plan.` : "Not on your plan."}</span></span>
          </span>
          <UpgradeLink plan={plan} />
        </div>
      </div>
    );
  }
  return (
    <div className={`relative min-h-[340px] overflow-hidden bg-surface ${bare ? "" : "rounded-[14px] border border-line"} ${className}`}>
      <div aria-hidden="true" className="pointer-events-none flex select-none flex-col gap-5 p-7 opacity-70 blur-[7px]">
        <div className={`${bar} h-6 w-1/3`} />
        <div className="grid grid-cols-3 gap-4"><div className={`${bar} h-14`} /><div className={`${bar} h-14`} /><div className={`${bar} h-14`} /></div>
        <div className={`${bar} h-14 w-full`} /><div className={`${bar} h-28 w-full`} />
      </div>
      <div role="note" className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface/75 px-6 py-10 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-brand-soft text-brand"><Glyph aria-hidden="true" size={28} /></span>
        <h3 className="text-xl font-bold">{title}</h3>
        {text && <p className="max-w-md text-[15px] leading-relaxed text-muted">{text}</p>}
        {chips.length > 0 && <div className="flex flex-wrap justify-center gap-2">{chips.map((c) => <span key={c} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-[13px] font-semibold"><Check aria-hidden="true" size={13} />{c}</span>)}</div>}
        <UpgradeLink plan={plan} price={price} className="mt-2 w-full max-w-sm" />
        {plan && <span className="text-[13px] text-muted">Included from the {plan} plan</span>}
      </div>
    </div>
  );
}
