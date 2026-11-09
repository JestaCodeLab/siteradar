/** The top-level features shown in the Features menu. Each links to its own page under /features/<slug>. Only things SiteRadar really does. */

export interface Feature {
  slug: string;
  name: string;
  /** One or two sentences for the preview panel. */
  blurb: string;
  /** The small example card in the preview panel. The numbers are illustrations, not real data. */
  preview: { label: string; chip?: string; big: string; caption: string; bars?: boolean };
}

export const FEATURE_GROUPS: { title: string; items: Feature[] }[] = [
  { title: "Availability", items: [
    { slug: "uptime-monitoring", name: "Website uptime monitoring",
      blurb: "SiteRadar opens your site every few minutes and checks its status, its speed and the words you expect to see. Alerts only go out after two failed checks in a row, so a blip never wakes you up.",
      preview: { label: "example.com", chip: "Up", big: "99.98%", caption: "uptime in the last 30 days", bars: true } },
    { slug: "alerts", name: "Alerts and notifications",
      blurb: "Hear about it the moment a site goes down, and again when it is back. Alerts reach you by email, Slack or Microsoft Teams.",
      preview: { label: "Alert · example.com", chip: "Down", big: "2 checks", caption: "failed in a row, so one alert goes out, and another when it recovers." } },
  ] },
  { title: "Performance & SEO", items: [
    { slug: "performance-monitoring", name: "Performance monitoring",
      blurb: "See how fast your site answers every day, and how long real visitors wait. Google's Core Web Vitals show what slows pages down, especially on phones.",
      preview: { label: "example.com", chip: "Fast", big: "0.14 s", caption: "average response time over 30 days", bars: true } },
    { slug: "seo-audit", name: "SEO and site audit",
      blurb: "A daily audit of up to 100 pages with about 50 checks across SEO, speed, security and accessibility. Every finding comes with a plain-language fix, plus Google Lighthouse scores.",
      preview: { label: "Site health score", chip: "Very good", big: "93 / 100", caption: "from 17 pages and 50 checks" } },
    { slug: "sitemap-monitoring", name: "Sitemap monitoring",
      blurb: "We find your sitemap, check every address in it, and tell you about pages that were added, removed or broken.",
      preview: { label: "sitemap.xml", chip: "Healthy", big: "14 pages", caption: "listed, all 14 checked, 0 with errors" } },
    { slug: "visitor-analytics", name: "Visitor analytics",
      blurb: "A tiny cookieless script shows your visitors, where they come from, what devices they use and how fast pages load for them. No cookie banner needed.",
      preview: { label: "Last 30 days", big: "1,284", caption: "visitors, 62% from Google search" } },
  ] },
  { title: "Site integrity", items: [
    { slug: "ssl-monitoring", name: "SSL certificate monitoring",
      blurb: "See the exact expiry date of your security certificate, and get warned weeks ahead, then daily, so visitors never meet a browser security warning.",
      preview: { label: "example.com", chip: "Valid", big: "40 days", caption: "until the certificate expires" } },
    { slug: "broken-links", name: "Broken links monitoring",
      blurb: "Finds broken links inside and outside your site, pages that return errors, and pages that look fine but should say “not found”.",
      preview: { label: "Latest audit", chip: "3 to fix", big: "3 links", caption: "are broken. Each one is listed with the page it is on." } },
    { slug: "mixed-content", name: "Mixed content monitoring",
      blurb: "Spots insecure http:// images, scripts and files on secure pages, the kind that make browsers show a warning.",
      preview: { label: "Latest audit", chip: "Clean", big: "0 files", caption: "load over an insecure connection" } },
    { slug: "dns-monitoring", name: "DNS record monitoring",
      blurb: "Checks your A, name server, email (MX), SPF, DKIM, DMARC and CAA records, gives you a health score and keeps a history of every change.",
      preview: { label: "DNS and email health", chip: "2 to fix", big: "62 / 100", caption: "SPF and DMARC are missing, so email could be faked" } },
    { slug: "domain-monitoring", name: "Domain monitoring",
      blurb: "Know when your domain expires and who it is registered with, with reminders before it lapses and takes your website and email with it.",
      preview: { label: "example.com", chip: "Safe", big: "251 days", caption: "until the domain needs renewing" } },
  ] },
  { title: "Reporting and your team", items: [
    { slug: "client-reporting", name: "Client reporting",
      blurb: "A plain-English monthly report for every website, with your logo, a short to-do list and the numbers that matter, sent to your clients automatically.",
      preview: { label: "Monthly report · October", chip: "PDF", big: "5 pages", caption: "with a summary, a to-do list and your logo" } },
    { slug: "subscriptions-tracker", name: "Subscriptions and invoices",
      blurb: "Track domains, hosting and tool subscriptions with renewal dates, reminders and invoice PDFs, and see what they cost you every month.",
      preview: { label: "This month", big: "GHS 4,250", caption: "across 12 subscriptions, 2 renewing this week" } },
    { slug: "team-access", name: "Team and client access",
      blurb: "Invite your team with the right role, and give clients read-only access to just their own websites.",
      preview: { label: "Workspace", big: "5 + 2", caption: "team members and clients, each seeing only what they should" } },
  ] },
];

export const FEATURES: Feature[] = FEATURE_GROUPS.flatMap((g) => g.items);
export const featureHref = (f: Feature) => `/features/${f.slug}`;
