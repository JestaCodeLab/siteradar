import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/legal";
import { LEGAL } from "@/lib/legal";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({ title: "Terms of Service", description: "The terms that apply when you use SiteRadar: accounts, plans and payments, acceptable use, your data, and how either side can end the agreement.", path: "/terms-of-service" });

const mail = <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>;

const sections: LegalSection[] = [
  { id: "agreement", title: "The agreement", body: (
    <>
      <p>These terms are an agreement between you and {LEGAL.company} (&ldquo;we&rdquo;, &ldquo;us&rdquo;), the company behind SiteRadar. They apply when you create an account, are invited to a workspace, or use our website, dashboard or tracking snippet.</p>
      <p>If you use SiteRadar for a company or a client, you confirm you are allowed to accept these terms for them. If you do not agree, please do not use the service.</p>
    </>
  ) },
  { id: "service", title: "What SiteRadar does", body: (
    <>
      <p>SiteRadar watches websites and reports on them. Depending on your plan it checks whether a site is up, when its SSL certificate and domain expire, its DNS and email records, speed and SEO audits, and visitor statistics, and it sends alerts and monthly reports. It also helps you keep track of your website-related subscriptions.</p>
      <p>We work hard to keep checks and alerts accurate and on time, but monitoring depends on networks and third parties we do not control. We do not promise that every outage will be detected or that every alert will arrive. Please do not rely on SiteRadar as your only safeguard for anything critical.</p>
    </>
  ) },
  { id: "accounts", title: "Accounts and workspaces", body: (
    <>
      <p>You need an account to use SiteRadar. Give us accurate details, keep your password private, and tell us quickly if you think someone else has used your account. You are responsible for what happens under it.</p>
      <p>Every account belongs to a workspace. The person who creates a workspace is its owner and decides who else joins and what role they have (Owner, Admin, Member or Viewer). Owners and admins are responsible for the people they invite and for the websites they add.</p>
      <p>You must add only websites you own or are authorised to monitor.</p>
    </>
  ) },
  { id: "plans", title: "Plans, prices and payment", body: (
    <>
      <p>SiteRadar has several plans, each with its own limits on websites, team members, checks, storage and features. The current plans and prices are on our <a href="/pricing">pricing page</a>. Prices are shown in Ghana cedis (GHS) for customers in Ghana and in US dollars (USD) elsewhere. We may change prices and plan limits; a change never applies to a period you have already paid for.</p>
      <p>Paid plans are billed in advance, monthly or yearly, as you choose. Payments are handled by Paystack, and we do not store your full card details. Plans renew automatically unless you cancel before the renewal date. Taxes may be added where the law requires.</p>
      <p>SMS alerts use bundles of messages that you buy separately. Bundles are available for numbers in Ghana only.</p>
      <p>We do not offer free trials or a free plan. Every plan includes the same features. Plans differ only in how many websites, team members and months of history they include, and in the alert channels available.</p>
    </>
  ) },
  { id: "changes", title: "Changing, cancelling and refunds", body: (
    <>
      <p>You can upgrade, downgrade or cancel at any time from Billing in your dashboard. If you cancel, your plan stays active until the end of the period you paid for and then ends. We do not refund the unused part of a period unless the law says we must.</p>
      <p>If you were charged in error, or you cannot use the service because of a fault on our side, email {mail} within 14 days and we will look into it and put it right, including a refund where that is fair.</p>
      <p>When a plan ends, your workspace becomes read-only. Monitoring and alerts stop and you cannot add websites, but your data, reports and history are kept and nothing is deleted. Choosing a plan again restores everything straight away.</p>
    </>
  ) },
  { id: "acceptable-use", title: "Acceptable use", body: (
    <>
      <p>You agree not to:</p>
      <ul>
        <li>add websites you are not allowed to monitor, or use SiteRadar to attack, overload or probe any website or network;</li>
        <li>break the law, or upload anything unlawful, harmful or that infringes someone else&rsquo;s rights;</li>
        <li>try to get around plan limits, security or access controls, or use another person&rsquo;s account;</li>
        <li>scrape, copy, resell or reverse engineer the service, except where the law allows it;</li>
        <li>send spam or abusive messages through our alerts, or use SMS alerts for anything other than monitoring notices;</li>
        <li>interfere with the service or other customers&rsquo; use of it.</li>
      </ul>
      <p>We may pause or end accounts that break these rules, and we will tell you why where we can.</p>
    </>
  ) },
  { id: "your-data", title: "Your data and your content", body: (
    <>
      <p>You keep all rights to your websites, logos, invoices and anything else you put into SiteRadar (&ldquo;your content&rdquo;). You give us permission to store and process it only to run the service for you, for example to run checks, build reports and send alerts.</p>
      <p>Invoices and generated reports are kept in private storage that only your workspace can open. You can delete your content, and the account, at any time. How we handle personal information is described in our <a href="/privacy">Privacy Policy</a>.</p>
      <p>If you add the SiteRadar tracking snippet to a website, you are responsible for telling that website&rsquo;s visitors about it and for following the privacy laws that apply to them.</p>
    </>
  ) },
  { id: "third-parties", title: "Other services we rely on", body: (
    <p>SiteRadar works with other providers, including Paystack (payments), Resend (email), FlockText (SMS), Cloudinary (file storage), Google (sign-in and PageSpeed data) and our hosting providers. Their services are governed by their own terms. If one of them has a problem, parts of SiteRadar may be slow or unavailable.</p>
  ) },
  { id: "ours", title: "Our rights", body: (
    <p>SiteRadar, its design, software and name belong to us or our licensors. These terms give you a right to use the service while you have an account; they do not transfer any ownership to you. If you send us feedback or ideas, we may use them freely without paying you.</p>
  ) },
  { id: "availability", title: "Availability and changes to the service", body: (
    <p>We aim to keep SiteRadar running around the clock but we cannot promise it will never be interrupted. We may carry out maintenance, and we may add, change or remove features. If we remove something you pay for in a way that matters, we will give you reasonable notice and a fair way out.</p>
  ) },
  { id: "liability", title: "Warranty and liability", body: (
    <>
      <p>SiteRadar is provided &ldquo;as is&rdquo;. To the extent the law allows, we do not give any promises beyond those in these terms, including that the service will be uninterrupted, error-free, or that every problem on your websites will be found.</p>
      <p>To the extent the law allows, we are not liable for indirect or consequential loss, such as lost profit, lost business or lost data, including losses from an outage we did not detect or an alert that was late or did not arrive. Our total liability for any claim is limited to the amount you paid us for SiteRadar in the 12 months before the event that caused the claim.</p>
      <p>Nothing in these terms limits liability that cannot be limited by law.</p>
    </>
  ) },
  { id: "ending", title: "Ending the agreement", body: (
    <p>You can stop using SiteRadar and delete your account whenever you like. We can suspend or end your access if you break these terms, if you do not pay, or if we are required to by law. If we end your account without a reason you caused, we will refund the unused part of what you paid. After an account is deleted we remove its content as described in the Privacy Policy.</p>
  ) },
  { id: "changes-terms", title: "Changes to these terms", body: (
    <p>We may update these terms from time to time. When we make a meaningful change we will tell you by email or in the dashboard before it applies. If you keep using SiteRadar after the change takes effect, you accept the new terms.</p>
  ) },
  { id: "law", title: "Governing law", body: (
    <p>These terms are governed by the laws of the Republic of Ghana. We will try to settle any dispute by talking first; if that does not work, the courts of Ghana will have jurisdiction, unless the law of your country gives you the right to bring a claim elsewhere.</p>
  ) },
  { id: "contact", title: "Contact us", body: (
    <p>Questions about these terms? Email {mail} or use our <a href="/contact">contact page</a>.</p>
  ) },
];

export default function TermsOfService() {
  return (
    <LegalPage
      label="Legal" title="Terms of Service"
      intro={<p>These terms explain the rules for using SiteRadar. We have tried to keep them short and in plain English. Please read them before you sign up.</p>}
      sections={sections}
    />
  );
}
