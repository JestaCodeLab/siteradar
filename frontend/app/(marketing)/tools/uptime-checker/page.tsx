import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { JsonLd } from "@/components/json-ld";
import { Container, CtaBand, Rings } from "@/components/mkt";
import { UptimeChecker } from "@/components/uptime-checker";
import { eyebrow, h2Small } from "@/lib/mkt-styles";
import { SITE_URL, breadcrumbs, pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Is My Website Down?",
  absoluteTitle: "Is My Website Down? Free Uptime Checker | SiteRadar",
  description: "Check if a website is down for everyone or just you. Free uptime checker shows the status code, response time, redirects and SSL expiry in seconds. No signup.",
  path: "/tools/uptime-checker",
});

const FAQ: [string, string][] = [
  ["How do I check if a website is down?", "Type the address into the checker above. We open the page from our servers and report whether it loaded, the status code, how long it took and whether the SSL certificate is valid. If we can load it but you cannot, the problem is on your side."],
  ["Is the website down for everyone or just me?", "If this checker says the site is up, it is working for other people and the problem is likely your connection, DNS cache, VPN, firewall or browser. Try the site on your phone using mobile data, or restart your router."],
  ["What does HTTP status 200, 301, 404, 500 or 503 mean?", "200 means the page loaded fine. 301 and 302 are redirects to another address. 404 means the page was not found. 500 means the server hit an error, and 503 means it is overloaded or down for maintenance. Anything from 400 up is reported as an error here."],
  ["Why does it say my site is up when I cannot open it?", "The problem may be your network, a cached DNS record or a browser extension. It can also affect one page only, or visitors from one country or network. Check from a second device."],
  ["What is a good website response time?", "Under one second is fast, one to three seconds is acceptable, and over three seconds is slow enough that many visitors leave. This checker measures how long the server took to start answering."],
  ["How do I know when my SSL certificate expires?", "The checker shows the expiry date and the days left. A certificate that has expired makes browsers show a security warning that blocks most visitors."],
  ["Is this the same as uptime monitoring?", "No. This tool checks once, now. Uptime monitoring checks continuously, keeps a history and alerts you when something fails, so you do not have to remember to look."],
  ["Is the uptime checker free?", "Yes. It is free and needs no account. Because it is public, it limits how many addresses can be checked in a short time."],
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
          <h1 className="text-[28px] font-bold leading-[1.12] tracking-[-0.025em] md:text-[clamp(36px,4.6vw,56px)] md:leading-[1.05] md:tracking-[-0.035em]">Is my website down? Free uptime checker.</h1>
          <p className="max-w-[640px] text-base text-[#475569] md:text-[19px]">Check whether a website is down for everyone or only for you. See the status code, response time, redirects and SSL certificate expiry in seconds. No signup.</p>
        </Container>
      </section>
      <section className="py-10 md:py-14">
        <Container className="max-w-[860px]"><Suspense fallback={null}><UptimeChecker /></Suspense></Container>
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
          <h2 className={`${h2Small} mt-4`}>What to do if your website is down</h2>
          <ol className="flex list-decimal flex-col gap-2 pl-6 marker:font-bold marker:text-[#F97316]">
            <li>Open the site on your phone using mobile data to rule out your own network.</li>
            <li>Note the error: a timeout, a 5xx error, or a security warning each point to a different cause.</li>
            <li>Check your host&apos;s status page and your control panel for resource limits or maintenance.</li>
            <li>Make sure your <Link href="/insights/ssl-certificate-expiry" className="font-semibold text-[#C2410C] underline underline-offset-2">SSL certificate</Link> and your <Link href="/insights/domain-expiry-and-renewal" className="font-semibold text-[#C2410C] underline underline-offset-2">domain</Link> have not expired.</li>
            <li>Undo the last change, such as a plugin, theme or code update.</li>
          </ol>
          <h2 className={`${h2Small} mt-4`}>Common status codes</h2>
          <div className="overflow-x-auto"><table className="w-full min-w-[480px] border-collapse text-left text-base">
            <thead><tr className="border-b border-[#EFE4D8] text-sm text-[#64748B]"><th className="py-2 pr-4">Code</th><th className="py-2 pr-4">Meaning</th><th className="py-2">What it usually means for you</th></tr></thead>
            <tbody>{[["200", "OK", "The page loaded. The site is up."], ["301 / 302", "Redirect", "The address moved. Fine, unless it loops."], ["403", "Forbidden", "A firewall or permission rule is blocking the request."], ["404", "Not found", "The page does not exist at that address."], ["500", "Server error", "Something broke on the server, often a plugin or code error."], ["502 / 504", "Bad gateway / timeout", "A server in front of the site could not get an answer."], ["503", "Unavailable", "The server is overloaded or in maintenance."]].map(([c, m, d]) => <tr key={c} className="border-b border-[#F1E8DD]"><td className="py-2 pr-4 font-mono font-semibold text-[#0F172A]">{c}</td><td className="py-2 pr-4">{m}</td><td className="py-2">{d}</td></tr>)}</tbody>
          </table></div>
          <h2 className={`${h2Small} mt-4`}>Frequently asked questions</h2>
          {FAQ.map(([q, a]) => <div key={q}><h3 className="text-lg font-bold text-[#0F172A]">{q}</h3><p className="mt-1">{a}</p></div>)}
        </Container>
      </section>
      <CtaBand title="Stop checking by hand." text="SiteRadar watches your websites every few minutes and alerts you on WhatsApp, email, Slack or Teams." primary={{ href: "/signup", label: "Get started" }} secondary={{ href: "/features/uptime-monitoring", label: "See uptime monitoring" }} />
    </>
  );
}
