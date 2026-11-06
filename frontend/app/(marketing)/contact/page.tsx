import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import { ArrowRight, Mail, MessageCircle, Phone } from "lucide-react";
import { Container, CtaBand, Rings } from "@/components/mkt";
import { eyebrow, monoLabel } from "@/lib/mkt-styles";

export const metadata: Metadata = pageMeta({ title: "Contact", description: "Talk to a real person about your websites. Reach the SiteRadar team on WhatsApp, by phone or by email.", path: "/contact", image: "/og/og-contact.png" });

/** Contact details come from the environment so they can change without touching the code. A card with no value is left out. */
const env = process.env;
const digits = (v?: string) => (v ?? "").replace(/\D/g, "");

const cardBase = "relative flex min-w-0 flex-[1_1_300px] flex-col gap-3 rounded-2xl border bg-white p-8";
const tile = "flex size-[52px] items-center justify-center rounded-xl";
const link = "mt-auto inline-flex min-h-11 items-center gap-1.5 pt-3 text-[15px] font-bold text-[#C2410C] hover:text-[#7C2D12]";

export default function Contact() {
  const whatsapp = env.NEXT_PUBLIC_CONTACT_WHATSAPP || env.NEXT_PUBLIC_CONTACT_PHONE;
  const phone = env.NEXT_PUBLIC_CONTACT_PHONE;
  const email = env.NEXT_PUBLIC_CONTACT_EMAIL;
  const hours = env.NEXT_PUBLIC_CONTACT_HOURS;
  const emailNote = env.NEXT_PUBLIC_CONTACT_EMAIL_NOTE;

  return (
    <>
      <section className="relative overflow-hidden border-b border-[#EFE4D8] bg-[#FFF7ED]">
        <Rings className="-right-[260px] -top-[260px] size-[900px]" opacity={0.9} />
        <Container className="relative flex flex-col gap-5 pb-[72px] pt-[88px]">
          <span className={`${eyebrow} text-[#C2410C]`}>Contact</span>
          <h1 className="max-w-[860px] text-[clamp(36px,4.6vw,58px)] font-bold leading-[1.05] tracking-[-0.035em] text-[#0F172A]">Talk to a real person about your websites.</h1>
          <p className="max-w-[640px] text-[19px] leading-relaxed text-[#475569]">Questions about plans, a larger portfolio, or setting SiteRadar up for your clients? Pick whichever way suits you.</p>
        </Container>
      </section>

      <section className="bg-[#FBF8F4] pb-10 pt-14">
        <Container className="flex flex-wrap gap-6">
          {whatsapp && (
            <article className={`${cardBase} border-[#F97316] shadow-[0_18px_40px_-18px_rgba(249,115,22,0.45)] ring-1 ring-[#F97316]`}>
              <div className="flex items-start justify-between gap-3">
                <span className={`${tile} bg-[#F97316] text-white`}><MessageCircle aria-hidden="true" size={24} /></span>
                <span className="rounded-full bg-[#FFEDD5] px-3 py-1 text-xs font-bold text-[#7C2D12]">Fastest reply</span>
              </div>
              <p className="text-sm font-semibold text-[#475569]">Prefer WhatsApp?</p>
              <h2 className="text-[26px] font-bold tracking-[-0.02em] text-[#0F172A]">Chat on WhatsApp</h2>
              <p className="text-base leading-relaxed text-[#475569]">Quick questions, plan advice, or just saying hi.</p>
              <a href={`https://wa.me/${digits(whatsapp)}`} target="_blank" rel="noopener noreferrer" className={link}>Start a chat <ArrowRight aria-hidden="true" size={16} /></a>
            </article>
          )}
          {phone && (
            <article className={`${cardBase} border-[#EFE4D8]`}>
              <span className={`${tile} bg-[#FFEDD5] text-[#C2410C]`}><Phone aria-hidden="true" size={24} /></span>
              <p className="text-sm font-semibold text-[#475569]">Call us directly</p>
              <h2 className={`${monoLabel} !text-[26px] !font-bold !text-[#0F172A]`}>{phone}</h2>
              {hours && <p className="text-base leading-relaxed text-[#475569]">{hours}</p>}
              <a href={`tel:+${digits(phone)}`} className={link}>Call now <ArrowRight aria-hidden="true" size={16} /></a>
            </article>
          )}
          {email && (
            <article className={`${cardBase} border-[#EFE4D8]`}>
              <span className={`${tile} bg-[#FFEDD5] text-[#C2410C]`}><Mail aria-hidden="true" size={24} /></span>
              <p className="text-sm font-semibold text-[#475569]">Drop us a line</p>
              <h2 className="break-words text-[26px] font-bold tracking-[-0.02em] text-[#0F172A]">{email}</h2>
              {emailNote && <p className="text-base leading-relaxed text-[#475569]">{emailNote}</p>}
              <a href={`mailto:${email}`} className={link}>Send an email <ArrowRight aria-hidden="true" size={16} /></a>
            </article>
          )}
          {!whatsapp && !phone && !email && (
            <p className="text-lg text-[#475569]">Contact details are coming soon. In the meantime you can <Link href="/signup" className="font-bold text-[#C2410C]">create an account</Link> and use the help in your dashboard.</p>
          )}
        </Container>
      </section>

      <CtaBand onPage title="Rather start on your own?" text="Create an account and add your first website in a couple of minutes." primary={{ href: "/signup", label: "Get started" }} />
    </>
  );
}
