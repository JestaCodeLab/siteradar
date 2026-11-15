import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { Container, CtaBand, Rings } from "@/components/mkt";
import { UptimeChecker } from "@/components/uptime-checker";
import { eyebrow, h2Small } from "@/lib/mkt-styles";
import { SITE_URL, breadcrumbs, pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Free Website Uptime Checker",
  absoluteTitle: "Free Website Uptime Checker: Is My Site Down? | SiteRadar",
  description: "Check if a website is up or down right now. See the status code, response time, redirects and SSL certificate expiry in seconds. Free, no signup.",
  path: "/tools/uptime-checker",
});

const FAQ: [string, string][] = [
  ["How do I check if my website is down?", "Type the address into the checker above. We open the page from our servers and report whether it loaded, the status code, how long it took, and whether the SSL certificate is valid."],
  ["What does HTTP status 200, 301, 404 or 503 mean?", "200 means the page loaded fine. 301 and 302 are redirects to another address. 404 means the page was not found. 500 and 503 mean the server failed or is overloaded. Anything from 400 up is treated as an error by this checker."],
  ["Why does it say my site is up when I cannot open it?", "The problem may be on your side, such as your network, DNS cache or a browser extension. It can also be specific to one page, or to visitors from one country. Try the site on your phone using mobile data."],
  ["What is a good website response time?", "Under one second is fast, one to three seconds is acceptable, and over three seconds is slow enough that many visitors leave. This checker measures how long the server took to start answering."],
  ["Is this the same as uptime monitoring?", "No. This tool checks once, now. Uptime monitoring checks continuously, keeps a history, and alerts you when something fails, so you do not have to remember to look."],
];

export default function UptimeCheckerPage() {
  return (
    <>
      <JsonLd data={[
        breadcrumbs([["Home", "/"], ["Free uptime checker", "/tools/uptime-checker"]]),
        { "@context": "https://schema.org", "@type": "WebApplication", name: "SiteRadar Free Website Uptime Checker", url: `${SITE_URL}/tools/uptime-checker`,
          applicationCategory: "UtilitiesApplication", operatingSystem: "Web", offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          description: "Check whether a website is up or down, with status code, response time, redirects and SSL certificate expiry." },
        { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
      ]} />
      <section className="relative overflow-hidden border-b border-[#EFE4D8] bg-[#FFF7ED]">
        <Rings className="-right-[260px] -top-[260px] hidden size-[900px] md:block" opacity={0.9} />
        <Container className="relative flex max-w-[860px] flex-col gap-3 pb-12 pt-10 md:gap-4 md:pb-16 md:pt-20">
          <span className={`${eyebrow} text-[#C2410C]`}>Free tool</span>
          <h1 className="text-[28px] font-bold leading-[1.12] tracking-[-0.025em] md:text-[clamp(36px,4.6vw,56px)] md:leading-[1.05] md:tracking-[-0.035em]">Is your website up? Check it in seconds.</h1>
          <p className="max-w-[640px] text-base text-[#475569] md:text-[19px]">Enter any address to see if it loads, how fast it answers, where it redirects and when its SSL certificate expires. No signup.</p>
        </Container>
      </section>
      <section className="py-10 md:py-14">
        <Container className="max-w-[860px]"><UptimeChecker /></Container>
      </section>
      <section className="border-t border-[#EFE4D8] bg-white py-12 md:py-16">
        <Container className="flex max-w-[860px] flex-col gap-5 text-[17px] leading-[1.75] text-[#334155]">
          <h2 className={h2Small}>What this checker tells you</h2>
          <ul className="flex list-disc flex-col gap-2 pl-6 marker:text-[#F97316]">
            <li><b className="text-[#0F172A]">Status code.</b> Whether the page loaded (200) or the server returned an error such as 404, 500 or 503.</li>
            <li><b className="text-[#0F172A]">Response time.</b> How long the server took to start answering, in milliseconds.</li>
            <li><b className="text-[#0F172A]">Redirects.</b> Every hop between the address you typed and the page that finally loaded.</li>
            <li><b className="text-[#0F172A]">SSL certificate.</b> Whether HTTPS works and how many days are left before it expires.</li>
            <li><b className="text-[#0F172A]">HTTP to HTTPS.</b> Whether visitors on the unsecured address are sent to the secure one.</li>
          </ul>
          <p>One check is a snapshot. To catch outages while you are asleep, or at a client&apos;s busiest hour, you need checks that run all the time. Read <Link href="/insights/website-uptime-explained" className="font-semibold text-[#C2410C] underline underline-offset-2">website uptime explained</Link> for what 99.9% really means, or see <Link href="/features/uptime-monitoring" className="font-semibold text-[#C2410C] underline underline-offset-2">uptime monitoring</Link> from SiteRadar.</p>
          <h2 className={`${h2Small} mt-4`}>Frequently asked questions</h2>
          {FAQ.map(([q, a]) => <div key={q}><h3 className="text-lg font-bold text-[#0F172A]">{q}</h3><p className="mt-1">{a}</p></div>)}
        </Container>
      </section>
      <CtaBand title="Stop checking by hand." text="SiteRadar watches your websites every few minutes and alerts you on WhatsApp, email, Slack or Teams." primary={{ href: "/signup", label: "Get started" }} secondary={{ href: "/features/uptime-monitoring", label: "See uptime monitoring" }} />
    </>
  );
}
