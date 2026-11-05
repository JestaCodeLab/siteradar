"use client";

import { useState } from "react";
import { Mail, MapPin, Phone } from "lucide-react";
import { Container, eyebrow } from "@/components/mkt";
import { send } from "@/lib/api";

const EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL, PHONE = process.env.NEXT_PUBLIC_CONTACT_PHONE, OFFICE = process.env.NEXT_PUBLIC_CONTACT_ADDRESS;
const field = "w-full rounded-[10px] border border-[#CBD5E1] bg-white px-3.5 py-[13px] text-base text-[#0F172A] focus-visible:!outline-[#F97316]";

export default function Contact() {
  const [state, setState] = useState<"idle" | "busy" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const details = [[Mail, "Email", EMAIL], [Phone, "Phone / WhatsApp", PHONE], [MapPin, "Office", OFFICE]] as const;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    setState("busy"); setError(null);
    try { await send("POST", "/api/contact", { name: f.name, email: f.email, company: f.company, topic: `Websites: ${f.sites}`, message: f.message }); setState("sent"); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not send your message."); setState("idle"); }
  }

  return (
    <Container className="flex flex-wrap items-stretch gap-8 pb-24 pt-20">
      <div className="relative flex min-w-0 flex-[1_1_380px] flex-col gap-5 overflow-hidden rounded-3xl bg-[#0F172A] p-10 text-white md:px-10 md:py-12">
        <svg viewBox="0 0 400 400" aria-hidden="true" className="pointer-events-none absolute -bottom-[170px] -right-[170px] size-[460px]"><g fill="none" stroke="#F97316" strokeWidth="3"><circle cx="200" cy="200" r="70" strokeOpacity="0.35" /><circle cx="200" cy="200" r="130" strokeOpacity="0.22" /><circle cx="200" cy="200" r="190" strokeOpacity="0.12" /><path d="M200 200L320 80" strokeOpacity="0.4" /></g><circle cx="320" cy="80" r="9" fill="#F97316" fillOpacity="0.7" /></svg>
        <span className={`${eyebrow} relative text-[#FDBA74]`}>Contact</span>
        <h1 className="relative text-[clamp(34px,4vw,50px)] font-extrabold leading-[1.05] tracking-[-0.035em]">Let’s put your websites on the radar.</h1>
        <p className="relative text-lg text-[#CBD5E1]">Questions about plans, a larger portfolio, or setting SiteRadar up for your clients? Send us a message and we will get back to you.</p>
        <div className="relative mt-3 flex flex-col gap-4">
          {details.filter(([, , v]) => v).map(([Icon, label, v]) => (
            <div key={label} className="flex items-center gap-3.5"><span className="flex size-11 items-center justify-center rounded-xl bg-[#1E293B] text-[#FDBA74]"><Icon size={20} aria-hidden="true" /></span><div><div className="text-[13px] text-[#94A3B8]">{label}</div><div className="font-semibold">{v}</div></div></div>))}
        </div>
      </div>

      {state === "sent" ? (
        <div role="status" className="flex min-w-0 flex-[1.3_1_460px] flex-col items-center justify-center gap-2 rounded-3xl border border-[#EFE4D8] bg-white p-10 text-center">
          <h2 className="text-[26px] font-bold tracking-[-0.02em]">Message sent</h2><p className="text-[#475569]">Thank you. We will reply to the email address you gave.</p></div>
      ) : (
        <form aria-label="Contact form" onSubmit={submit} className="flex min-w-0 flex-[1.3_1_460px] flex-col gap-5 rounded-3xl border border-[#EFE4D8] bg-white p-10">
          <h2 className="text-[26px] font-bold tracking-[-0.02em]">Send us a message</h2>
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <div className="flex flex-col gap-1.5"><label htmlFor="c-name" className="text-sm font-semibold">Full name</label><input id="c-name" name="name" required autoComplete="name" className={field} /></div>
            <div className="flex flex-col gap-1.5"><label htmlFor="c-email" className="text-sm font-semibold">Work email</label><input id="c-email" name="email" type="email" required autoComplete="email" className={field} /></div>
            <div className="flex flex-col gap-1.5"><label htmlFor="c-company" className="text-sm font-semibold">Company or agency</label><input id="c-company" name="company" autoComplete="organization" className={field} /></div>
            <div className="flex flex-col gap-1.5"><label htmlFor="c-sites" className="text-sm font-semibold">How many websites?</label><select id="c-sites" name="sites" className={field}>{["1", "2 to 3", "4 to 15", "16 to 50", "More than 50"].map((o) => <option key={o}>{o}</option>)}</select></div>
          </div>
          <div className="flex flex-col gap-1.5"><label htmlFor="c-msg" className="text-sm font-semibold">Message</label><textarea id="c-msg" name="message" rows={6} required className={`${field} resize-y`} /></div>
          {error && <p role="alert" className="rounded-lg bg-[#FEE2E2] px-3.5 py-2.5 text-sm text-[#991B1B]">{error}</p>}
          <div className="flex flex-wrap items-center justify-between gap-4"><p className="text-sm text-[#475569]">We only use your details to reply to you.</p>
            <button disabled={state === "busy"} className="rounded-xl bg-[#F97316] px-7 py-[15px] font-bold text-white hover:bg-[#EA580C] disabled:opacity-60">{state === "busy" ? "Sending…" : "Send message"}</button></div>
        </form>
      )}
    </Container>
  );
}
