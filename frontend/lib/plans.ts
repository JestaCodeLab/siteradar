"use client";

import useSWR from "swr";
import { fetcher, type Catalogue, type PlanInfo } from "./api";
import { ghs } from "./me";

export function usePlans() {
  const { data } = useSWR<Catalogue>("/api/plans", fetcher, { revalidateOnFocus: false });
  return data;
}

export const channelLabel = (p: Pick<PlanInfo, "channels">) =>
  p.channels.includes("chat") ? "Email, Slack and Teams alerts" : "Email alerts only";

/** Plain-language feature lines for a plan card. */
export function planFeatures(p: PlanInfo): string[] {
  const out = [
    `${p.sites} website${p.sites === 1 ? "" : "s"}`,
    `${p.members} team member${p.members === 1 ? "" : "s"}`,
    `Checks every ${p.interval_minutes === 1 ? "minute" : p.interval_minutes + " minutes"}`,
    channelLabel(p),
  ];
  if (p.sms) out.push(`${p.sms} SMS alerts a month`);
  out.push(p.clean_reports ? "Monthly reports without the watermark" : "Monthly report with a light SiteRadar watermark");
  out.push("Your logo on every report");
  if (p.client_access) out.push("Read-only viewer access for clients");
  out.push(`${p.history_months} month${p.history_months === 1 ? "" : "s"} of history`);
  return out;
}

export const priceLine = (p: PlanInfo, yearly: boolean) =>
  p.price_month === 0 ? "GHS 0" : ghs(yearly ? Math.round(p.price_year_month) : p.price_month);
