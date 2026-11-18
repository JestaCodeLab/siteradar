"use client";

import { opts, Select } from "@/components/select";
import { useNoteToast } from "@/components/toast";
import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { Camera, ClipboardCheck, Gauge, Globe, Mail, MessageSquare, ShieldCheck, Timer, Webhook, type LucideIcon } from "lucide-react";
import { AdminCard, EmptyState, AdminHeader, aBtn, aInput, tones, type Tone } from "@/components/admin/ui";
import { ErrorState, Skeleton } from "@/components/ui";
import { fetcher, send } from "@/lib/api";
import { fmtWhen } from "@/lib/format";

interface Health {
  services: { name: string; status: string; tone: Tone | "ok" | "warn" | "bad"; detail: string }[];
  volume: { label: string; value: string; pct: number; tone?: string }[];
  messages: { k: string; v: string }[];
  errors: { ts: number; source: string; text: string }[];
  announcement: { message: string; audience: string } | null;
}
const ICONS: Record<string, LucideIcon> = {
  "Web app and API": Globe, "Check scheduler": Timer, "Nightly audits": ClipboardCheck, "Homepage preview worker": Camera,
  "Email sending": Mail, "WhatsApp alerts": MessageSquare, "Payment webhooks": Webhook, "Google PageSpeed quota": Gauge,
};
const iconTone = { ok: "bg-[#E3F4EC] text-[#0B7A4B]", warn: "bg-[#FFF1D6] text-[#8A5A00]", bad: "bg-[#FBE7E5] text-[#B3261E]" } as const;
const dot = { ok: "#0B7A4B", warn: "#8A5A00", bad: "#B3261E" } as const;
export default function AdminHealth() {
  const { data, error, mutate } = useSWR<Health>("/api/admin/health", fetcher, { refreshInterval: 30000 });
  const setNote = useNoteToast();
  if (error) return <ErrorState message={error.message} retry={() => mutate()} />;
  if (!data) return <Skeleton className="h-96" />;

  async function publish(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget); setNote(null);
    try { await send("POST", "/api/admin/announcement", { message: f.get("message"), audience: f.get("audience") }); await mutate(); setNote({ ok: true, text: "Banner published. Customers see it at the top of their dashboard." }); (e.target as HTMLFormElement).reset(); }
    catch (err) { setNote({ ok: false, text: err instanceof Error ? err.message : "Could not publish." }); }
  }
  async function clear() { await send("DELETE", "/api/admin/announcement"); await mutate(); setNote({ ok: true, text: "Banner removed." }); }

  return (
    <>
      <AdminHeader title="Platform health" subtitle="Is the machinery that monitors your customers' websites working?" />
      <section aria-label="Services" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.services.map((s) => {
          const Icon = ICONS[s.name] ?? Globe;
          return (
            <div key={s.name} className="flex flex-col gap-2.5 rounded-xl border border-[#E2E5EA] bg-white p-5">
              <span className={`flex size-9 items-center justify-center rounded-lg ${iconTone[s.tone as keyof typeof iconTone]}`}><Icon size={18} aria-hidden="true" /></span>
              <span className="text-[15px] font-semibold">{s.name}</span>
              <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-[3px] text-xs font-semibold ${tones[s.tone as Tone]}`}><span style={{ background: dot[s.tone as keyof typeof dot] }} className="size-2 rounded-full" />{s.status}</span>
              <span className="text-[13px] leading-snug text-[#5B6472]">{s.detail}</span>
            </div>
          );
        })}
      </section>

      <div className="flex flex-wrap items-stretch gap-5">
        <AdminCard label="Checks" className="flex min-w-0 flex-[1.4_1_420px] flex-col gap-4">
          <h2 className="text-lg font-semibold">Monitoring volume</h2>
          {data.volume.map((v) => (
            <div key={v.label} className="flex flex-col gap-1.5"><div className="flex justify-between text-sm"><span>{v.label}</span><span className="font-mono font-medium">{v.value}</span></div>
              <div className="h-2 rounded bg-[#E8EBF0]"><div className="h-2 rounded" style={{ width: `${Math.max(v.pct > 0 ? 2 : 0, v.pct)}%`, background: v.tone === "warn" ? "#E5A526" : "#6B4FE0" }} /></div></div>))}
        </AdminCard>
        <AdminCard label="Messages sent" className="min-w-0 flex-[1_1_300px]">
          <h2 className="mb-3 text-lg font-semibold">Messages sent today</h2>
          <dl className="flex flex-col">{data.messages.map((m) => <div key={m.k} className="flex justify-between gap-4 border-t border-[#EDEFF3] py-3 text-sm first:border-0"><dt className="text-[#5B6472]">{m.k}</dt><dd className="font-mono font-medium">{m.v}</dd></div>)}</dl>
        </AdminCard>
      </div>

      <AdminCard label="Recent errors" className="!pb-2">
        <h2 className="mb-2 text-lg font-semibold">Recent errors</h2>
        {data.errors.length === 0 && <div className="border-t border-[#EDEFF3]"><EmptyState Icon={ShieldCheck} title="No errors recorded" text="Problems with checks, email, WhatsApp or payments will be listed here when they happen." /></div>}
        {data.errors.map((e, i) => (
          <div key={i} className="flex flex-wrap gap-x-4 gap-y-1 border-t border-[#EDEFF3] py-3 text-sm">
            <span className="w-[190px] shrink-0 text-[13px] text-[#5B6472]">{fmtWhen(e.ts)}</span><span className="w-[110px] shrink-0 font-semibold capitalize">{e.source}</span><span className="min-w-0 flex-1 leading-snug">{e.text}</span></div>))}
      </AdminCard>

      <WhatsAppTest />

      <AdminCard label="Announcement" className="flex flex-col gap-3.5">
        <h2 className="text-lg font-semibold">Message all customers</h2>
        <p className="text-sm text-[#5B6472]">Shows as a banner at the top of every dashboard. Use it for planned maintenance or news.</p>
        {data.announcement && <p className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#EFEAFF] px-4 py-3 text-sm text-[#4A33B0]"><span><b>Live now:</b> {data.announcement.message} <span className="opacity-70">({data.announcement.audience})</span></span><button onClick={clear} className="font-semibold underline">Remove</button></p>}
        <form onSubmit={publish} className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-[3_1_320px] flex-col gap-2"><label htmlFor="msg" className="text-sm font-medium">Message</label><input id="msg" name="message" required maxLength={300} placeholder="Planned maintenance on Saturday 14 Nov, 02:00 to 03:00" className={aInput} /></div>
            <div className="flex flex-[1_1_200px] flex-col gap-2"><label htmlFor="aud" className="text-sm font-medium">Show to</label><Select id="aud" name="audience" defaultValue="everyone" options={[{ value: "everyone", label: "Everyone" }, { value: "paying", label: "Paying customers" }, { value: "free", label: "Complimentary or unpaid only" }]} /></div>
          </div>
          <div><button className={aBtn.primary}>Publish banner</button></div>
        </form>
      </AdminCard>

      <p className="text-sm text-[#5B6472]">Also: <Link href="/admin/activity" className="font-semibold text-[#4A33B0]">Activity logs</Link></p>
    </>
  );
}

interface WaTests { configured: boolean; tests: { ts: number; phone: string; ok: number; error: string | null; status: string | null }[] }

function WhatsAppTest() {
  const { data, mutate } = useSWR<WaTests>("/api/admin/whatsapp/tests", fetcher);
  const setNote = useNoteToast();
  const [busy, setBusy] = useState(false);
  async function test(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget); setNote(null); setBusy(true);
    try {
      const r = await send<{ ok: boolean; error: string; template: string }>("POST", "/api/admin/whatsapp/test", { phone: f.get("phone"), template: f.get("template") });
      setNote(r.ok ? { ok: true, text: `Meta accepted the "${r.template}" message. Delivery status appears below if the webhook is set up.` } : { ok: false, text: `Meta refused it: ${r.error}` });
    } catch (err) { setNote({ ok: false, text: err instanceof Error ? err.message : "Could not send." }); }
    setBusy(false); mutate();
  }
  return (
    <AdminCard label="WhatsApp test" className="flex flex-col gap-3.5">
      <h2 className="text-lg font-semibold">Send a test WhatsApp message</h2>
      <p className="text-sm text-[#5B6472]">Sends one real message through Meta to check your token, number and templates. Each test is billed like any other message. While you are on Meta&apos;s test number, the recipient must be added in Meta&apos;s API Setup first.</p>
      {data && !data.configured && <p className="rounded-lg bg-[#FFF1D6] px-4 py-3 text-sm text-[#8A5A00]">WhatsApp is not configured. Set WHATSAPP_TOKEN and WHATSAPP_PHONE_ID on the API service.</p>}
      <form onSubmit={test} className="flex flex-wrap items-end gap-4">
        <div className="flex flex-[2_1_240px] flex-col gap-2"><label htmlFor="wa-phone" className="text-sm font-medium">Phone number</label><input id="wa-phone" name="phone" required placeholder="+233241234567" inputMode="tel" className={aInput} /></div>
        <div className="flex flex-[1_1_200px] flex-col gap-2"><label htmlFor="wa-tpl" className="text-sm font-medium">Message</label><Select id="wa-tpl" name="template" defaultValue="alert" options={[{ value: "alert", label: "Down alert (siteradar_alert)" }, { value: "code", label: "Verification code (siteradar_code)" }]} /></div>
        <button className={aBtn.primary} disabled={busy || (data ? !data.configured : false)}>{busy ? "Sending…" : "Send test"}</button>
      </form>
      {data && data.tests.length > 0 && (
        <div className="border-t border-[#EDEFF3]">
          {data.tests.map((t, i) => (
            <div key={i} className="flex flex-wrap gap-x-4 gap-y-1 border-t border-[#EDEFF3] py-2.5 text-sm first:border-0">
              <span className="w-[190px] shrink-0 text-[13px] text-[#5B6472]">{fmtWhen(t.ts)}</span><span className="w-[140px] shrink-0 font-mono">{t.phone}</span>
              <span className={`font-semibold ${t.ok && t.status !== "failed" ? "text-[#0B7A4B]" : "text-[#B3261E]"}`}>{!t.ok ? "Refused" : t.status ? t.status[0].toUpperCase() + t.status.slice(1) : "Accepted"}</span>
              {t.error && <span className="min-w-0 flex-1 leading-snug text-[#5B6472]">{t.error}</span>}
            </div>))}
        </div>)}
    </AdminCard>
  );
}
