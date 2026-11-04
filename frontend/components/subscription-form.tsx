"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import useSWR, { mutate } from "swr";
import { btn, Card, Field, Icon, input } from "./ui";
import { fetcher, send, type SitesResponse, type Subscription, type SubscriptionsResponse } from "@/lib/api";
import { fmtDateTime, fmtSize } from "@/lib/format";

interface Parsed { readable: boolean; amount?: number; currency?: string; date?: string; provider?: string }

const addCycle = (iso: string, cycle: "monthly" | "yearly") => {
  const d = new Date(iso + "T00:00:00");
  d.setMonth(d.getMonth() + (cycle === "monthly" ? 1 : 12));
  return d.toISOString().slice(0, 10);
};

export function SubscriptionForm({ sub }: { sub?: Subscription }) {
  const router = useRouter();
  const preset = useSearchParams().get("site") ?? "";
  const fileInput = useRef<HTMLInputElement>(null);
  const { data: sites } = useSWR<SitesResponse>("/api/sites", fetcher);
  const { data: meta } = useSWR<SubscriptionsResponse>("/api/subscriptions", fetcher);

  const [f, setF] = useState({
    name: sub?.name ?? "", site_id: sub?.site_id ?? preset, category: sub?.category ?? "Domain", provider: sub?.provider ?? "",
    amount: sub ? String(sub.amount) : "", currency: sub?.currency ?? "USD", cycle: sub?.cycle ?? ("yearly" as "monthly" | "yearly"),
    started: sub?.started ?? "", next_renewal: sub?.next_renewal ?? "", auto_renew: sub?.auto_renew ?? true,
    remind_days: String(sub?.remind_days ?? 14), notes: sub?.notes ?? "", active: sub?.active ?? true,
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));
  const [file, setFile] = useState<File | null>(null);
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [filled, setFilled] = useState<string[] | null>(null);
  const [unreadable, setUnreadable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function choose(chosen: File | null) {
    setFile(chosen);
    setFilled(null);
    setUnreadable(false);
    if (!chosen) return;
    if (chosen.size > 4 * 1024 * 1024) { setError("That PDF is larger than 4 MB."); setFile(null); return; }
    setError(null);
    try {
      const body = new FormData();
      body.append("invoice", chosen);
      const p = await send<Parsed>("POST", "/api/invoices/parse", body);
      if (!p.readable) { setUnreadable(true); return; }
      const got: string[] = [];
      setF((cur) => {
        const next = { ...cur };
        if (p.amount && !cur.amount) { next.amount = String(p.amount); got.push("amount"); }
        if (p.currency && !sub) { next.currency = p.currency; }
        if (p.provider && !cur.provider) { next.provider = p.provider; got.push("provider"); }
        if (p.date && !cur.next_renewal) { next.next_renewal = addCycle(p.date, cur.cycle); next.started = cur.started || p.date; got.push("billing date"); }
        return next;
      });
      setFilled(got);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that PDF.");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload = { ...f, remind_days: Number(f.remind_days) || 0 };
      if (sub) {
        await send("PATCH", `/api/subscriptions/${sub.id}`, payload);
        if (file) {
          const body = new FormData();
          body.append("invoice", file);
          body.append("period", period);
          await send("POST", `/api/subscriptions/${sub.id}/invoices`, body);
        }
      } else {
        const body = new FormData();
        Object.entries(payload).forEach(([k, v]) => body.append(k, String(v)));
        if (file) { body.append("invoice", file); body.append("invoice_period", period); }
        await send<Subscription>("POST", "/api/subscriptions", body);
      }
      await mutate((key) => typeof key === "string" && key.startsWith("/api/subscription"), undefined, { revalidate: true });
      router.push(f.site_id && !sub ? `/websites/${f.site_id}?tab=subscriptions` : "/subscriptions");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the subscription.");
      setBusy(false);
    }
  }

  async function removeInvoice(id: number) {
    if (!confirm("Delete this invoice?")) return;
    await send("DELETE", `/api/invoices/${id}`);
    await mutate(`/api/subscriptions/${sub!.id}`);
  }

  async function remove() {
    if (!confirm(`Delete ${sub!.name} and its invoices? This can't be undone. To keep the history, mark it cancelled instead.`)) return;
    await send("DELETE", `/api/subscriptions/${sub!.id}`);
    router.replace("/subscriptions");
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-start gap-6">
      <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-5">
        <Card className="flex flex-col gap-3.5 p-5">
          <h2 className="text-lg font-semibold">{sub ? "Add an invoice or receipt" : "Invoice or receipt"}</h2>
          <input ref={fileInput} type="file" accept="application/pdf" className="sr-only" aria-label="Choose a PDF" onChange={(e) => choose(e.target.files?.[0] ?? null)} />
          {file ? (
            <div className="flex flex-wrap items-center gap-3.5 rounded-[10px] border border-[#c9cfd8] bg-soft p-3.5">
              <span className="flex h-[54px] w-11 items-center justify-center rounded-md bg-bad-soft text-xs font-semibold text-bad">PDF</span>
              <span className="flex min-w-[180px] flex-1 flex-col gap-0.5">
                <span className="break-all text-[15px] font-semibold">{file.name}</span>
                <span className="text-[13px] text-muted">{fmtSize(file.size)}</span>
              </span>
              <button type="button" onClick={() => { setFile(null); if (fileInput.current) fileInput.current.value = ""; setFilled(null); setUnreadable(false); }} className={btn.danger}>Remove</button>
            </div>
          ) : (
            <button type="button" onClick={() => fileInput.current?.click()}
              onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); choose(e.dataTransfer.files?.[0] ?? null); }}
              className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#9aa5b8] bg-soft p-5 text-ink-2 hover:bg-brand-soft/40">
              <Icon.upload className="text-brand" />
              <span className="text-[15px] font-semibold text-ink">Drop a PDF here, or choose a file</span>
              <span className="text-[13px] text-muted">PDF only · up to 4 MB</span>
            </button>
          )}
          {filled && filled.length > 0 && <p role="status" className="rounded-[10px] bg-brand-soft px-3.5 py-3 text-sm leading-relaxed text-brand-ink">Filled in from the PDF: {filled.join(", ")}. Please check them below.</p>}
          {unreadable && <p role="status" className="rounded-[10px] bg-warn-soft px-3.5 py-3 text-sm text-warn">We couldn&apos;t read text in this PDF (it may be a scan). Enter the details by hand. The file is still saved.</p>}
          {file && (
            <Field label="This invoice covers" htmlFor="period" hint="month it was charged">
              <input id="period" type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className={`${input} sm:max-w-56`} />
            </Field>
          )}
          {sub && sub.invoices.length > 0 && (
            <ul className="flex flex-col">
              {sub.invoices.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-line-soft py-2">
                  <a href={i.url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-brand"><Icon.file />{i.name} <span className="font-normal text-muted">· {i.period} · uploaded {fmtDateTime(i.uploaded)}</span></a>
                  <button type="button" onClick={() => removeInvoice(i.id)} className="min-h-11 px-2 text-sm font-semibold text-bad">Delete</button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="flex flex-col gap-5 p-5">
          <h2 className="text-lg font-semibold">Details</h2>
          <Field label="Name" htmlFor="name"><input id="name" required value={f.name} onChange={(e) => set("name", e.target.value)} className={input} placeholder="example.com domain" /></Field>
          <div className="flex flex-wrap gap-5">
            <div className="min-w-[220px] flex-1"><Field label="Website" htmlFor="site">
              <select id="site" value={f.site_id} onChange={(e) => set("site_id", e.target.value)} className={input}>
                <option value="">Not tied to a website</option>
                {sites?.sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field></div>
            <div className="min-w-[220px] flex-1"><Field label="Category" htmlFor="cat">
              <select id="cat" value={f.category} onChange={(e) => set("category", e.target.value)} className={input}>
                {(meta?.categories ?? ["Domain", "Hosting", "SSL", "SaaS", "Other"]).map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field></div>
          </div>
          <div className="flex flex-wrap gap-5">
            <div className="min-w-[220px] flex-1"><Field label="Provider" htmlFor="prov"><input id="prov" value={f.provider} onChange={(e) => set("provider", e.target.value)} className={input} placeholder="Namecheap" /></Field></div>
            <div className="min-w-[220px] flex-1"><Field label="Amount" htmlFor="amt">
              <div className="flex gap-2">
                <select aria-label="Currency" value={f.currency} onChange={(e) => set("currency", e.target.value)} className={`${input} !w-auto`}>
                  {["USD", "GHS", "EUR", "GBP"].map((c) => <option key={c}>{c}</option>)}
                </select>
                <input id="amt" required inputMode="decimal" value={f.amount} onChange={(e) => set("amount", e.target.value)} className={`${input} min-w-0 font-mono`} placeholder="11.99" />
              </div>
            </Field></div>
          </div>
          <div className="flex flex-col gap-2">
            <span id="cycle" className="text-sm font-medium">Billing cycle</span>
            <div role="group" aria-labelledby="cycle" className="inline-flex gap-1 self-start rounded-[10px] bg-[#e8ebf0] p-1">
              {(["monthly", "yearly"] as const).map((c) => (
                <button type="button" key={c} aria-pressed={f.cycle === c} onClick={() => set("cycle", c)} className={`min-h-10 rounded-[7px] px-6 text-sm capitalize ${f.cycle === c ? "bg-surface font-semibold shadow-sm" : "font-medium text-ink-2"}`}>{c}</button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-5">
            <div className="min-w-[200px] flex-1"><Field label="Started on" htmlFor="start" hint="optional"><input id="start" type="date" value={f.started} onChange={(e) => set("started", e.target.value)} className={input} /></Field></div>
            <div className="min-w-[200px] flex-1"><Field label="Next renewal" htmlFor="renew"><input id="renew" required type="date" value={f.next_renewal} onChange={(e) => set("next_renewal", e.target.value)} className={input} /></Field></div>
            <div className="min-w-[200px] flex-1"><Field label="Remind us" htmlFor="remind">
              <select id="remind" value={f.remind_days} onChange={(e) => set("remind_days", e.target.value)} className={input}>
                <option value="30">30 days before</option><option value="14">14 days before</option><option value="7">7 days before</option><option value="0">No reminder</option>
              </select>
            </Field></div>
          </div>
          <label className="flex min-h-11 items-start gap-3 text-[15px]">
            <input type="checkbox" checked={f.auto_renew} onChange={(e) => set("auto_renew", e.target.checked)} className="mt-1 size-5" />
            <span>Renews automatically<span className="block text-sm text-muted">Untick if someone has to renew it by hand. It shows as expired once the date passes.</span></span>
          </label>
          <Field label="Notes" htmlFor="notes" hint="optional"><textarea id="notes" rows={3} value={f.notes} onChange={(e) => set("notes", e.target.value)} className={`${input} py-3`} /></Field>
          {sub && (
            <label className="flex min-h-11 items-center gap-3 text-[15px]"><input type="checkbox" checked={!f.active} onChange={(e) => set("active", !e.target.checked)} className="size-5" />Cancelled. Stop reminders and leave it out of the totals.</label>
          )}
        </Card>

        {error && <p role="alert" className="rounded-lg bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {sub ? <button type="button" onClick={remove} className={btn.danger}>Delete subscription</button> : <span />}
          <div className="flex gap-3">
            <Link href="/subscriptions" className={btn.secondary}>Cancel</Link>
            <button type="submit" disabled={busy} className={btn.primary}>{busy ? "Saving…" : sub ? "Save changes" : "Save subscription"}</button>
          </div>
        </div>
      </div>
    </form>
  );
}
