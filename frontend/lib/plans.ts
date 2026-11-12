"use client";

import useSWR from "swr";
import { fetcher, type Catalogue, type PlanInfo } from "./api";
import { money } from "./me";

export function usePlans() {
  const { data } = useSWR<Catalogue>("/api/plans", fetcher, { revalidateOnFocus: false });
  return data;
}

export const channelLabel = (p: Pick<PlanInfo, "channels">) =>
  p.channels.includes("chat") ? "Email, Slack and Teams alerts" : "Email alerts only";

/** Explains the AI credit line wherever a plan's features are listed. */
export const AI_TIP = "AI credits write titles, meta descriptions and image alt text when you fix issues on a WordPress website. Shopify stores will be added when our Shopify app launches. Other websites get step-by-step fix instructions instead, which do not use credits.";
export const aiLine = (p: Pick<PlanInfo, "ai_credits">) => (p.ai_credits ? `${p.ai_credits.toLocaleString()} AI credits a month` : "");

/** Plain-language feature lines for a plan card. */
export function planFeatures(p: PlanInfo): { text: string; tip?: string }[] {
  const out: { text: string; tip?: string }[] = [
    { text: `${p.sites} website${p.sites === 1 ? "" : "s"}` },
    { text: `${p.members} team member${p.members === 1 ? "" : "s"}` },
    { text: `Checks every ${p.interval_minutes === 1 ? "minute" : p.interval_minutes + " minutes"}` },
    ...(p.ai_credits ? [{ text: aiLine(p), tip: AI_TIP }] : []),
    { text: channelLabel(p) },
  ];
  if (p.sms) out.push({ text: `${p.sms} SMS alerts a month` });
  out.push({ text: "Monthly report with your logo" });
  if (p.client_access) out.push({ text: "Read-only viewer access for clients" });
  out.push({ text: `${p.history_months} month${p.history_months === 1 ? "" : "s"} of history` });
  return out;
}

export const priceLine = (p: PlanInfo, yearly: boolean) =>
  money(yearly ? p.price_year_month : p.price_month, p.currency);
