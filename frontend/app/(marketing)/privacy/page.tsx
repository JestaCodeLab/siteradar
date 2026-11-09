import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/legal";
import { LEGAL } from "@/lib/legal";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({ title: "Privacy Policy", description: "What personal information SiteRadar collects, why, who we share it with, how long we keep it, and the choices you have.", path: "/privacy" });

const mail = <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>;

const sections: LegalSection[] = [
  { id: "who", title: "Who we are", body: (
    <p>SiteRadar is run by {LEGAL.company} (&ldquo;we&rdquo;, &ldquo;us&rdquo;). We decide how and why the personal information described here is used, which makes us the &ldquo;controller&rdquo; under the Ghana Data Protection Act, 2012 (Act 843) and, where it applies, similar laws elsewhere. You can reach us at {mail}.</p>
  ) },
  { id: "collect", title: "What we collect", body: (
    <>
      <p><strong>Account details.</strong> Your name, email address, password (stored only as a one-way hash), phone number if you give one, company name and your role in a workspace. If you sign in with Google we receive your name, email address and Google account identifier.</p>
      <p><strong>What you add to SiteRadar.</strong> The websites and domains you monitor, alert settings and recipients (emails, phone numbers, Slack and Teams addresses), team invitations, the subscriptions and invoices you record, and your logo.</p>
      <p><strong>Monitoring results.</strong> Uptime and response checks, SSL, domain and DNS information, audit and speed results, screenshots of your websites, and the reports we build from them.</p>
      <p><strong>Billing.</strong> Your plan, payment history and invoices. Card details are entered with Paystack and are not stored by us.</p>
      <p><strong>Use of SiteRadar.</strong> Technical information such as your IP address, browser, and approximate country (used to choose your currency and to decide whether to ask for a phone number), and sign-in and security records.</p>
      <p><strong>Visitors to websites you track.</strong> If you add our tracking snippet to a website, we count that website&rsquo;s visits. We do not use cookies for this. A visitor is represented by a short code made from a daily-changing mix of their IP address and browser details, which cannot be turned back into the original details. We store pages viewed, referrer, device type and approximate country, not names or email addresses.</p>
    </>
  ) },
  { id: "use", title: "How we use it", body: (
    <>
      <ul>
        <li>to provide SiteRadar: run checks, send alerts, build reports and show your dashboard;</li>
        <li>to create and secure your account, including verification codes and sign-in;</li>
        <li>to take payment, issue invoices and manage your plan;</li>
        <li>to answer your messages and send service notices such as expiry warnings and billing receipts;</li>
        <li>to keep the service safe, prevent abuse and fix problems;</li>
        <li>to meet our legal duties.</li>
      </ul>
      <p>We rely on your agreement, on our need to perform our contract with you, on our legitimate interest in running and protecting the service, and on legal obligations. We do not sell your personal information and we do not use it for advertising.</p>
    </>
  ) },
  { id: "share", title: "Who we share it with", body: (
    <>
      <p>We share information only with providers that help us run SiteRadar, and only what each one needs:</p>
      <ul>
        <li><strong>Paystack</strong> for payments;</li>
        <li><strong>Resend</strong> to send email;</li>
        <li><strong>FlockText</strong> to send SMS alerts to numbers in Ghana (phone number and message);</li>
        <li><strong>Cloudinary</strong> to store invoices, reports, screenshots and logos;</li>
        <li><strong>Google</strong> for sign-in and, for speed tests, the address of the website being tested;</li>
        <li>our hosting and database providers, <strong>Railway</strong> and <strong>Vercel</strong>.</li>
      </ul>
      <p>Other members of your workspace can see the workspace&rsquo;s websites, results and team list, according to their role. If you send an alert to Slack or Teams, the message goes to the channel you chose.</p>
      <p>We may also disclose information if the law, a court or a regulator requires it, or to protect our rights and users, and as part of a sale or reorganisation of our business, in which case we will tell you.</p>
    </>
  ) },
  { id: "transfers", title: "Where it is processed", body: (
    <p>Our providers may process information in countries other than yours, including outside Ghana. Where that happens we use providers that apply appropriate protection, and we rely on the safeguards the law allows.</p>
  ) },
  { id: "keep", title: "How long we keep it", body: (
    <>
      <p>We keep your information while your account is open. Monitoring history is kept for as long as your plan allows. When you delete a website its results are removed. When you delete your account we delete or anonymise your personal information within 30 days, except what we must keep longer, such as payment records for tax and accounting, which we keep for the period the law requires.</p>
      <p>Backups are overwritten on a regular cycle, so a deleted item can remain in a backup for a short time after it disappears from the service.</p>
    </>
  ) },
  { id: "security", title: "How we protect it", body: (
    <p>Passwords are stored as hashes. Connections to SiteRadar are encrypted. Invoices and reports sit in private storage and are opened only after we check that you belong to the right workspace, and sessions end automatically after an hour of use. No system is perfectly secure, so please use a strong, unique password and tell us right away if you suspect a problem.</p>
  ) },
  { id: "rights", title: "Your choices and rights", body: (
    <>
      <p>You can change most of your details in Settings, and delete websites, team members and your logo yourself. Under the Data Protection Act, and similar laws, you may also:</p>
      <ul>
        <li>ask for a copy of the personal information we hold about you;</li>
        <li>ask us to correct information that is wrong;</li>
        <li>ask us to delete your information or close your account;</li>
        <li>object to, or ask us to limit, some uses of your information;</li>
        <li>withdraw consent you gave earlier, for example for SMS alerts, at any time.</li>
      </ul>
      <p>To use any of these rights, email {mail}. We may need to check it is really you. If you are unhappy with our answer, you can complain to the Data Protection Commission of Ghana.</p>
    </>
  ) },
  { id: "cookies", title: "Cookies", body: (
    <p>SiteRadar uses only the cookies it needs to work: a secure session cookie that keeps you signed in. We do not use advertising or third-party tracking cookies on our own website. Our own visitor counting does not use cookies.</p>
  ) },
  { id: "children", title: "Children", body: (
    <p>SiteRadar is for businesses and is not meant for people under 18. We do not knowingly collect information from children. If you think a child has given us information, please tell us and we will delete it.</p>
  ) },
  { id: "changes", title: "Changes to this policy", body: (
    <p>We may update this policy from time to time. We will change the date at the top and, for meaningful changes, tell you by email or in the dashboard before they apply.</p>
  ) },
  { id: "contact", title: "Contact us", body: (
    <p>Questions or requests about your information? Email {mail} or use our <a href="/contact">contact page</a>.</p>
  ) },
];

export default function Privacy() {
  return (
    <LegalPage
      label="Legal" title="Privacy Policy"
      intro={<p>This policy explains what personal information SiteRadar collects, why we collect it, who we share it with, and the choices you have. We have tried to keep it clear and honest.</p>}
      sections={sections}
    />
  );
}
