import type { Metadata } from "next";
import Link from "next/link";
import { Building2, LogIn, Tag, Users } from "lucide-react";
import { Container, MktFooter, MktHeader } from "@/components/mkt";
import { eyebrow } from "@/lib/mkt-styles";

export const metadata: Metadata = { title: "Page not found" };

const links = [
  { href: "/agencies", icon: Users, title: "For agencies", text: "Every client website on one radar." },
  { href: "/businesses", icon: Building2, title: "For businesses", text: "Your digital presence, watched around the clock." },
  { href: "/pricing", icon: Tag, title: "Pricing", text: "Compare plans in Ghana cedis." },
  { href: "/login", icon: LogIn, title: "Log in", text: "Back to your dashboard." },
];

/** Shown for any address that does not exist. It sits outside the marketing layout, so it brings its own header and footer. */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-[#FBF8F4] text-[#0F172A]">
      <MktHeader />
      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-[#F5E6D3] bg-[#FFF7ED]">
          <Container className="relative flex flex-col items-center gap-7 pb-24 pt-[72px] text-center">
            <div className="relative flex aspect-square w-[min(440px,86vw)] items-center justify-center">
              <svg viewBox="0 0 440 440" aria-hidden="true" className="absolute inset-0 size-full">
                <g fill="none" stroke="#F97316" strokeWidth="2">
                  <circle cx="220" cy="220" r="80" strokeOpacity="0.45" /><circle cx="220" cy="220" r="140" strokeOpacity="0.3" /><circle cx="220" cy="220" r="200" strokeOpacity="0.18" />
                  <path d="M220 14V426M14 220H426" strokeOpacity="0.12" />
                  <path d="M220 220L361 79" strokeOpacity="0.55" strokeWidth="3" strokeLinecap="round" />
                </g>
                <circle cx="361" cy="79" r="10" fill="#F97316" />
                <circle cx="96" cy="300" r="13" fill="none" stroke="#C2410C" strokeWidth="2" strokeDasharray="4 4" />
                <circle cx="300" cy="340" r="5" fill="#FBA23C" fillOpacity="0.6" /><circle cx="140" cy="120" r="4" fill="#FBA23C" fillOpacity="0.5" />
              </svg>
              <span className="relative bg-[#FFF7ED] px-3 py-1 font-mono text-[clamp(72px,12vw,120px)] font-bold leading-none tracking-[-0.04em]">404</span>
            </div>
            <span className={`${eyebrow} text-[#C2410C]`}>Page not found</span>
            <h1 className="max-w-[760px] text-[28px] font-bold leading-[1.12] tracking-[-0.025em] md:text-[clamp(34px,4.4vw,54px)] md:font-bold md:leading-[1.05] md:tracking-[-0.035em]">This page dropped off the radar.</h1>
            <p className="max-w-[560px] text-[19px] text-[#475569]">The page you are looking for may have moved, been renamed, or never existed. Let&rsquo;s get you back on track.</p>
            <div className="mt-1 flex flex-wrap justify-center gap-3">
              <Link href="/" className="rounded-xl bg-[#F97316] px-6 py-[15px] text-base font-bold text-white hover:bg-[#EA580C]">Back to home</Link>
              <Link href="/contact" className="rounded-xl border-[1.5px] border-[#0F172A] px-6 py-[15px] text-base font-semibold hover:bg-white">Contact us</Link>
            </div>
          </Container>
        </section>

        <Container className="flex flex-col gap-6 pb-24 pt-[72px]">
          <h2 className="text-2xl font-bold tracking-[-0.02em]">You might be looking for</h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
            {links.map(({ href, icon: Icon, title, text }) => (
              <Link key={href} href={href} className="flex flex-col gap-2 rounded-2xl border border-[#EFE4D8] bg-white p-6 hover:border-[#F97316]">
                <span className="flex size-11 items-center justify-center rounded-xl bg-[#FFEDD5] text-[#C2410C]"><Icon aria-hidden="true" size={22} /></span>
                <span className="text-lg font-bold">{title}</span>
                <span className="text-[15px] text-[#475569]">{text}</span>
              </Link>
            ))}
          </div>
        </Container>
      </main>
      <MktFooter />
    </div>
  );
}
