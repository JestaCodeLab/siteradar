"use client";

import Link from "next/link";
import { useState } from "react";
import { MessageCircle, TriangleAlert } from "lucide-react";
import { btn, input } from "./ui";
import { send, type SiteWhatsApp } from "@/lib/api";

/** The sentence people must not miss. Used in the add-website steps, the website's settings and the banner. */
export const WA_FALLBACK = "Until a number is verified, alerts for this website are sent by email only.";

export const WA_CONSENT = "The owner of this number agrees to get SiteRadar alerts on WhatsApp.";

/** Plain-language rules, shown wherever a number is entered. */
export function WhatsAppRules({ cap }: { cap: number }) {
  return (
    <ul className="list-disc space-y-0.5 pl-5 text-[13px] text-muted">
      <li>Only for when the website goes down and when it is back up.</li>
      <li>Up to {cap} WhatsApp alerts per website in any 24 hours. After that, alerts go by email only.</li>
      <li>You cannot reply to these messages. To stop them, remove the number here.</li>
    </ul>
  );
}

/** Orange notice for numbers that still need their code. Deliberately loud: unverified numbers get nothing. */
export function VerifyNotice({ numbers }: { numbers: string[] }) {
  return (
    <div role="status" className="flex items-start gap-2.5 rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">
      <TriangleAlert aria-hidden="true" size={18} className="mt-0.5 shrink-0" />
      <span><b>Not verified yet.</b> {WA_FALLBACK} Enter the 6-digit code we sent to {numbers.join(" and ")} on WhatsApp. If you skip this, your alerts still reach you by email.</span>
    </div>
  );
}

/** Manage the WhatsApp numbers of one website: add, verify with the code, remove. */
export function WhatsAppNumbers({ siteId, status, onChange, canWrite = true }: { siteId: string; status: SiteWhatsApp; onChange: () => void; canWrite?: boolean }) {
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const waiting = status.numbers.filter((n) => !n.verified);

  async function run(key: string, fn: () => Promise<unknown>, done?: string) {
    setBusy(key); setMsg(null);
    try { await fn(); if (done) setMsg({ ok: true, text: done }); onChange(); }
    catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : "Something went wrong." }); }
    setBusy(null);
  }
  const save = (list: string[], consented = false) => send<{ problems?: string[] }>("PUT", `/api/sites/${siteId}/whatsapp`, { phones: list, consent: consented });

  return (
    <div className="flex flex-col gap-3">
      {waiting.length > 0 && <VerifyNotice numbers={waiting.map((n) => n.masked)} />}
      {status.numbers.map((n) => (
        <div key={n.phone} className="flex flex-col gap-2 rounded-xl border border-line p-3.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <MessageCircle aria-hidden="true" size={17} className="text-muted" />
            <span className="font-mono text-sm">{n.masked}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${n.verified ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn"}`}>{n.verified ? "Verified" : "Not verified"}</span>
            {canWrite && (
              <button type="button" disabled={busy !== null} className="ml-auto text-sm font-semibold text-bad underline"
                onClick={() => run("rm" + n.phone, () => save(status.numbers.filter((x) => x.phone !== n.phone).map((x) => x.phone)), "Number removed. It will not get WhatsApp alerts for this website.")}>Remove</button>
            )}
          </div>
          {!n.verified && canWrite && (
            <div className="flex flex-wrap items-center gap-2.5">
              <input aria-label={`Code sent to ${n.masked}`} inputMode="numeric" maxLength={6} placeholder="6-digit code" value={codes[n.phone] ?? ""}
                onChange={(e) => setCodes({ ...codes, [n.phone]: e.target.value.replace(/\D/g, "") })} className={`${input} !w-40`} />
              <button type="button" disabled={busy !== null || (codes[n.phone] ?? "").length !== 6} className={btn.primary}
                onClick={() => run("v" + n.phone, () => send("POST", "/api/whatsapp/verify", { phone: n.phone, code: codes[n.phone] }), "Verified. Alerts for this website will now reach this number.")}>{busy === "v" + n.phone ? "Checking…" : "Verify"}</button>
              <button type="button" disabled={busy !== null} className={btn.secondary}
                onClick={() => run("r" + n.phone, () => send("POST", "/api/whatsapp/resend", { phone: n.phone }), "A new code is on its way.")}>Send a new code</button>
            </div>
          )}
        </div>
      ))}
      {canWrite && status.numbers.length < status.max && (
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-wrap gap-2.5">
            <input aria-label="WhatsApp number" inputMode="tel" placeholder="024 123 4567 or +44 7700 900123" value={phone} onChange={(e) => setPhone(e.target.value)} className={`${input} !w-72 max-w-full`} />
            <button type="button" disabled={busy !== null || !phone.trim() || !consent} className={btn.secondary}
              onClick={() => run("add", async () => { await save([...status.numbers.map((n) => n.phone), phone], consent); setPhone(""); setConsent(false); }, "We sent a code to that number on WhatsApp.")}>{busy === "add" ? "Adding…" : "Add number"}</button>
          </div>
          <label className="flex items-start gap-2.5 text-[13px]"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-4" /><span>{WA_CONSENT}</span></label>
        </div>
      )}
      <WhatsAppRules cap={status.cap} />
      {msg && <p role={msg.ok ? "status" : "alert"} className={`rounded-lg px-3.5 py-2.5 text-sm ${msg.ok ? "bg-ok-soft text-ok" : "bg-bad-soft text-bad"}`}>{msg.text}</p>}
    </div>
  );
}

/** Across the top of a website while a number still needs its code. Leads straight to where it is done. */
export function WhatsAppBanner({ siteId, status }: { siteId: string; status?: SiteWhatsApp }) {
  const waiting = status?.numbers.filter((n) => !n.verified) ?? [];
  if (!status?.enabled || waiting.length === 0) return null;
  return (
    <div role="status" className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">
      <TriangleAlert aria-hidden="true" size={18} className="shrink-0" />
      <span className="min-w-0 flex-1"><b>WhatsApp number not verified.</b> {WA_FALLBACK}</span>
      <Link href={`/websites/${siteId}?tab=settings`} className="font-semibold underline">Verify now</Link>
    </div>
  );
}
