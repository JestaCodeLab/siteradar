"use client";

import { Tag } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
import { NewDiscountDialog, UsesDialog } from "@/components/admin/discount-dialogs";
import { AdminCard, AdminHeader, EmptyState, Pill, TableHead, aBtn, shortDate, type Tone } from "@/components/admin/ui";
import { useToast } from "@/components/toast";
import { ErrorState, Skeleton } from "@/components/ui";
import { fetcher, send, type DiscountCode, type DiscountsResponse } from "@/lib/api";

const GRID = "minmax(130px,1.2fr) 120px minmax(110px,1fr) 125px 70px 130px 90px 190px";
const tone: Record<DiscountCode["state"], Tone> = { active: "ok", disabled: "muted", scheduled: "purple", expired: "muted", "used up": "warn" };
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export default function AdminDiscounts() {
  const { data, error, mutate } = useSWR<DiscountsResponse>("/api/admin/discounts", fetcher);
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const [usesFor, setUsesFor] = useState<DiscountCode | null>(null);
  if (error) return <ErrorState message={error.message} retry={() => mutate()} />;
  if (!data) return <Skeleton className="h-96" />;
  const planName = (id: string) => data.plans.find((p) => p.id === id)?.name ?? id;

  async function toggle(c: DiscountCode) {
    try { await send("PATCH", `/api/admin/discounts/${c.id}`, { active: !c.active }); await mutate(); toast.success(c.active ? `${c.code} disabled.` : `${c.code} enabled.`); }
    catch (e) { toast.error("Could not change the code.", e instanceof Error ? e.message : undefined); }
  }
  async function remove(c: DiscountCode) {
    if (!window.confirm(`Delete ${c.code}? This cannot be undone.`)) return;
    try { await send("DELETE", `/api/admin/discounts/${c.id}`); await mutate(); toast.success(`${c.code} deleted.`); }
    catch (e) { toast.error("Could not delete the code.", e instanceof Error ? e.message : undefined); }
  }
  const applies = (c: DiscountCode) => `${c.plan_ids?.length ? c.plan_ids.map(planName).join(", ") : "All paid plans"}${c.cycles === "both" ? "" : ` · ${c.cycles} only`}`;
  const valid = (c: DiscountCode) => (c.starts || c.expires) ? `${c.starts ? shortDate(c.starts) : "Now"} to ${c.expires ? shortDate(c.expires) : "no end"}` : "Always";

  return (
    <>
      <AdminHeader title="Discount codes" subtitle="Create codes that customers type in when they choose a paid plan. They can use each code once."
        actions={<button onClick={() => setCreating(true)} className={aBtn.primary}>New discount code</button>} />

      <p className="text-sm text-[#5B6472]">{data.summary.active} active {data.summary.active === 1 ? "code" : "codes"} · {data.summary.uses} {data.summary.uses === 1 ? "use" : "uses"} in total</p>

      <AdminCard label="Discount codes" className="!p-0 overflow-hidden">
        {data.codes.length === 0 ? (
          <EmptyState Icon={Tag} title="No discount codes yet" text="Create your first code, for example 20% off the first payment, and share it with the customers you want to reward." />
        ) : (
          <div className="overflow-x-auto"><div className="min-w-[1080px]">
            <TableHead template={GRID} cols={["Code", "Discount", "Applies to", "Lasts", "Used", "Valid", "Status", ""]} />
            {data.codes.map((c) => (
              <div key={c.id} style={{ display: "grid", gridTemplateColumns: GRID }} className="min-h-[60px] items-center gap-4 border-b border-[#EDEFF3] px-5 py-3 text-sm">
                <span className="min-w-0"><span className="block font-mono text-[15px] font-semibold">{c.code}</span>{c.description && <span className="block truncate text-[13px] text-[#5B6472]">{c.description}</span>}</span>
                <span className="font-semibold">{c.label}</span>
                <span className="text-[13px] text-[#3F4857]">{applies(c)}</span>
                <span className="text-[13px] text-[#3F4857]">{cap(c.duration)}</span>
                <span className="font-mono">{c.uses}{c.max_uses != null ? ` / ${c.max_uses}` : ""}</span>
                <span className="text-[13px] text-[#3F4857]">{valid(c)}</span>
                <span><Pill tone={tone[c.state]}>{cap(c.state)}</Pill></span>
                <span className="flex flex-wrap justify-end gap-1.5">
                  <button onClick={() => setUsesFor(c)} className={aBtn.small}>Uses</button>
                  <button onClick={() => toggle(c)} className={aBtn.small}>{c.active ? "Disable" : "Enable"}</button>
                  {c.uses === 0 && <button onClick={() => remove(c)} className={`${aBtn.small} !text-[#B3261E]`}>Delete</button>}
                </span>
              </div>
            ))}
          </div></div>
        )}
      </AdminCard>

      {creating && <NewDiscountDialog plans={data.plans} onClose={() => setCreating(false)} onDone={async () => { setCreating(false); await mutate(); toast.success("Discount code created."); }} />}
      {usesFor && <UsesDialog code={usesFor} onClose={() => setUsesFor(null)} />}
    </>
  );
}
