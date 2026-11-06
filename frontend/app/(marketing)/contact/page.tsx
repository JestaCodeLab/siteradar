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

const cardBase = "relative flex min-w-0 flex-[1_1_300px] flex-row items-center gap-3.5 rounded-2xl border bg-white p-[18px] md:flex-col md:items-stretch md:gap-3 md:p-8";
const body = "flex min-w-0 flex-1 flex-col md:flex-none md:gap-3";
const title = "text-[17px] font-bold text-[#0F172A] md:text-[26px] md:tracking-[-0.02em]";
const sub = "text-sm text-[#475569] md:text-base md:leading-relaxed";
const tile = "flex size-[52px] items-center justify-center rounded-xl";
const link = "text-xl text-[#C2410C] after:absolute after:inset-0 hover:text-[#7C2D12] md:mt-auto md:inline-flex md:min-h-11 md:items-center md:gap-1.5 md:pt-3 md:text-[15px] md:font-bold";

export default function Contact() {
  const whatsapp = env.NEXT_PUBLIC_CONTACT_WHATSAPP || env.NEXT_PUBLIC_CONTACT_PHONE;
  const phone = env.NEXT_PUBLIC_CONTACT_PHONE;
  const email = env.NEXT_PUBLIC_CONTACT_EMAIL;
  const hours = env.NEXT_PUBLIC_CONTACT_HOURS;
  const emailNote = env.NEXT_PUBLIC_CONTACT_EMAIL_NOTE;

  return (
    <>
      <section className="relative overflow-hidden border-b border-[#EFE4D8] bg-[#FFF7ED]">
        <Rings className="-right-[260px] -top-[260px] hidden size-[900px] md:block" opacity={0.9} />
        <Container className="relative flex flex-col gap-3 pb-8 pt-10 md:gap-5 md:pb-[72px] md:pt-[88px]">
          <span className={`${eyebrow} text-[#C2410C]`}>Contact</span>
          <h1 className="max-w-[860px] text-[28px] font-bold leading-[1.12] tracking-[-0.025em] text-[#0F172A] md:text-[clamp(36px,4.6vw,58px)] md:font-bold md:leading-[1.05] md:tracking-[-0.035em]">Talk to a real person about your websites.</h1>
          <p className="max-w-[640px] text-base leading-relaxed text-[#475569] md:text-[19px]"><span className="hidden md:inline">Questions about plans, a larger portfolio, or setting SiteRadar up for your clients? </span>Pick whichever way suits you.</p>
        </Container>
      </section>

      <section className="bg-[#FBF8F4] pb-11 pt-7 md:pb-10 md:pt-14">
        <Container className="flex flex-wrap gap-3.5 md:gap-6">
          {whatsapp && (
            <article className={`${cardBase} border-2 border-[#F97316] shadow-[0_18px_40px_-18px_rgba(249,115,22,0.45)] md:border md:ring-1 md:ring-[#F97316]`}>
              <span className={`${tile} bg-[#F97316] text-white`}><MessageCircle aria-hidden="true" size={24} /></span>
              <div className={body}>
                <p className="hidden text-sm font-semibold text-[#475569] md:block">Prefer WhatsApp?</p>
                <h2 className={title}>Chat on WhatsApp</h2>
                <p className={sub}>Quick questions, plan advice, or just saying hi.</p>
              </div>
              <span className="absolute right-5 top-5 hidden rounded-full bg-[#FFEDD5] px-3 py-1 text-xs font-bold text-[#7C2D12] md:block">Fastest reply</span>
              <a href={`https://wa.me/${digits(whatsapp)}`} target="_blank" rel="noopener noreferrer" className={link}><span className="hidden md:inline">Start a chat</span><ArrowRight aria-hidden="true" size={16} /></a>
            </article>
          )}
          {phone && (
            <article className={`${cardBase} border-[#EFE4D8]`}>
              <span className={`${tile} bg-[#FFEDD5] text-[#C2410C]`}><Phone aria-hidden="true" size={24} /></span>
              <div className={body}>
                <p className="hidden text-sm font-semibold text-[#475569] md:block">Call us directly</p>
                <h2 className={`${title} md:hidden`}>Call us</h2>
                <p className={`${monoLabel} !text-sm !font-medium !text-[#475569] md:hidden`}>{phone}</p>
                <h2 className={`${monoLabel} hidden !text-[26px] !font-bold !text-[#0F172A] md:block`}>{phone}</h2>
                {hours && <p className="hidden text-base leading-relaxed text-[#475569] md:block">{hours}</p>}
              </div>
              <a href={`tel:+${digits(phone)}`} className={link}><span className="hidden md:inline">Call now</span><ArrowRight aria-hidden="true" size={16} /></a>
            </article>
          )}
          {email && (
            <article className={`${cardBase} border-[#EFE4D8]`}>
              <span className={`${tile} bg-[#FFEDD5] text-[#C2410C]`}><Mail aria-hidden="true" size={24} /></span>
              <div className={body}>
                <p className="hidden text-sm font-semibold text-[#475569] md:block">Drop us a line</p>
                <h2 className={`${title} md:hidden`}>Email us</h2>
                <p className={`${sub} break-words md:hidden`}>{email}</p>
                <h2 className="hidden break-words text-[26px] font-bold tracking-[-0.02em] text-[#0F172A] md:block">{email}</h2>
                {emailNote && <p className="hidden text-base leading-relaxed text-[#475569] md:block">{emailNote}</p>}
              </div>
              <a href={`mailto:${email}`} className={link}><span className="hidden md:inline">Send an email</span><ArrowRight aria-hidden="true" size={16} /></a>
            </article>
          )}
          {!whatsapp && !phone && !email && (
            <p className="text-lg text-[#475569]">Contact details are coming soon. In the meantime you can <Link href="/signup" className="font-bold text-[#C2410C]">create an account</Link> and use the help in your dashboard.</p>
          )}
        </Container>
      </section>

      <div className="hidden md:block"><CtaBand onPage title="Rather start on your own?" text="Create an account and add your first website in a couple of minutes." primary={{ href: "/signup", label: "Get started" }} /></div>
    </>
  );
}
