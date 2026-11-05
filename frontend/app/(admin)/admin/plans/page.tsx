"use client";

import { useState } from "react";
import useSWR from "swr";
import { btn, Card, CardTitle, ErrorState, Field, input, PageHeader, Skeleton } from "@/components/ui";
import { fetcher, send, type PlanInfo } from "@/lib/api";

type Row = PlanInfo & { customers: number };
const num = (n: number | string) => Number(n);

export default function AdminPlans() {
  const { data, error, mutate } = useSWR<{ plans: Row[]; yearly_discount: number }>("/api/admin/plans", fetcher);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  if (error) return <ErrorState message={error.message} retry={() => mutate()} />;
  if (!data) return <Skeleton className="h-96" />;

  async function savePlan(e: React.FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault(); const f = new FormData(e.currentTarget); setNote(null);
    try {
      await send("PATCH", `/api/admin/plans/${id}`, {
        price_month: num(f.get("price_month") as string), sites: num(f.get("sites") as string), members: num(f.get("members") as string),
        interval_minutes: num(f.get("interval_minutes") as string), sms: num(f.get("sms") as string), history_months: num(f.get("history_months") as string),
        channels: ["email", ...(f.get("chat") ? ["chat"] : []), ...(f.get("sms_ch") ? ["sms"] : [])],
        clean_reports: !!f.get("clean_reports"), client_access: !!f.get("client_access"), active: !!f.get("active"),
      });
      await mutate(); setNote({ ok: true, text: `${id} saved. New prices apply to new subscriptions and renewals.` });
    } catch (err) { setNote({ ok: false, text: err instanceof Error ? err.message : "Could not save." }); }
  }
  async function saveDiscount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setNote(null);
    try { await send("PATCH", "/api/admin/settings", { yearly_discount: num(new FormData(e.currentTarget).get("d") as string) }); await mutate(); setNote({ ok: true, text: "Yearly discount saved." }); }
    catch (err) { setNote({ ok: false, text: err instanceof Error ? err.message : "Could not save." }); }
  }
  const cell = "w-20 min-h-10 rounded-lg border border-[#c9cfd8] px-2 font-mono";

  return (
    <>
      <PageHeader title="Plans and pricing" subtitle="Change prices, limits and features here. Customers keep their current price until they renew or change plan." />
      {note && <p role="status" className={`rounded-lg px-4 py-3 text-sm ${note.ok ? "bg-ok-soft text-ok" : "bg-bad-soft text-bad"}`}>{note.text}</p>}
      <Card className="p-5"><CardTitle>Billing rules</CardTitle>
        <form onSubmit={saveDiscount} className="flex flex-wrap items-end gap-3"><Field label="Yearly discount (%)" htmlFor="d"><input id="d" name="d" type="number" min={0} max={90} step="any" defaultValue={data.yearly_discount} className={`${input} !w-32`} /></Field><button className={btn.secondary}>Save</button>
          <p className="text-sm text-muted">Currency: GHS · Free trials: off · Payment methods: card and mobile money through Paystack.</p></form></Card>
      <div className="grid gap-4 xl:grid-cols-2">
        {data.plans.map((p) => (
          <Card key={p.id} className="p-5">
            <CardTitle aside={`${p.customers} customer${p.customers === 1 ? "" : "s"}`}>{p.name}</CardTitle>
            <form onSubmit={(e) => savePlan(e, p.id)} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {([["price_month", "GHS / month", p.price_month], ["sites", "Websites", p.sites], ["members", "Team", p.members], ["interval_minutes", "Check every (min)", p.interval_minutes], ["sms", "SMS / month", p.sms], ["history_months", "History (months)", p.history_months]] as const).map(([k, l, v]) => (
                  <label key={k} className="flex flex-col gap-1 text-sm">{l}<input name={k} type="number" min={0} step="any" defaultValue={v} className={`${cell} !w-full`} /></label>))}
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <label className="flex items-center gap-2"><input type="checkbox" name="chat" defaultChecked={p.channels.includes("chat")} className="size-4" />Chat alerts</label>
                <label className="flex items-center gap-2"><input type="checkbox" name="sms_ch" defaultChecked={p.channels.includes("sms")} className="size-4" />SMS alerts</label>
                <label className="flex items-center gap-2"><input type="checkbox" name="clean_reports" defaultChecked={p.clean_reports} className="size-4" />No watermark</label>
                <label className="flex items-center gap-2"><input type="checkbox" name="client_access" defaultChecked={p.client_access} className="size-4" />Client viewers</label>
                <label className="flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={p.active} className="size-4" />Active</label></div>
              <button className={`${btn.primary} w-fit`}>Save {p.name}</button>
            </form>
          </Card>))}
      </div>
    </>
  );
}
