/** Articles for the Insights section (/insights). Plain data, so the index, each article, the sitemap and the structured data all read the same list.
 *  Paragraphs may contain [link text](/path) and **bold**. Keep claims to things that are true and that SiteRadar really does. */

export interface Section { h: string; p: string[]; list?: string[]; after?: string[] }
export interface Article {
  slug: string;
  title: string;                 // the on-page headline
  seoTitle: string;              // the search-result title (the site name is added after it)
  description: string;           // search-result description, up to 160 characters
  published: string;             // ISO date
  updated?: string;
  minutes: number;
  category: "Monitoring" | "SEO" | "WordPress" | "Agencies";
  intro: string[];
  sections: Section[];
  faq?: [string, string][];
  cta: { title: string; text: string; href: string; label: string };
}

export const ARTICLES: Article[] = [
  {
    slug: "website-uptime-explained",
    title: "Website uptime explained: what 99.9% really means",
    seoTitle: "Website Uptime Explained: What 99.9% Really Means",
    description: "What website uptime is, how to calculate it, and how much downtime 99%, 99.9% and 99.99% allow each month and year. Plus what to do when your site goes down.",
    published: "2026-11-02", minutes: 6, category: "Monitoring",
    intro: [
      "Uptime is the share of time your website is reachable and working. It is usually shown as a percentage, and hosting companies love to promise 99.9%. That sounds almost perfect, but the gap between 99% and 99.99% is the difference between a bad week and a few minutes.",
      "This guide explains how uptime is calculated, what each number means in real minutes, and how to measure your own site instead of trusting a promise.",
    ],
    sections: [
      { h: "How uptime is calculated",
        p: ["Uptime is the time your site was available divided by the total time, multiplied by 100. If a site is down for 43 minutes in a 30-day month (43,200 minutes), its uptime is 43,157 ÷ 43,200, which is about 99.9%.",
            "The number depends on what counts as down. A good monitor treats a site as down when the page does not load, answers with an error such as 500 or 503, takes too long, or no longer contains text it should show. A blank page that still returns a 200 status is down to your visitors even if a simple ping says otherwise."] },
      { h: "What each percentage allows",
        p: ["Here is how much downtime fits inside each level:"],
        list: ["**99%**: about 7.2 hours a month, or 3.65 days a year.", "**99.5%**: about 3.6 hours a month, or 1.8 days a year.", "**99.9%**: about 43 minutes a month, or 8.8 hours a year.", "**99.95%**: about 22 minutes a month, or 4.4 hours a year.", "**99.99%**: about 4 minutes a month, or 53 minutes a year."],
        after: ["For a brochure site or a small shop, 99.9% is a sensible target. Chasing 99.99% usually means paying for redundant servers, which only pays off when every minute of downtime costs real money."] },
      { h: "Why a hosting promise is not your uptime",
        p: ["A host's uptime guarantee usually covers its own network and servers. It does not cover your site crashing because of a bad plugin update, an expired SSL certificate, a full disk, a database error or a domain that lapsed. Those are the outages your visitors actually see, and they never appear in the host's statistics.",
            "Credits for broken guarantees are also rarely worth the loss. You only get them if you notice, prove it and ask, and they are usually a small slice of one month's hosting fee."] },
      { h: "How to measure your own uptime",
        p: ["You need something outside your own server that opens your site on a schedule and writes down the result. Checking every few minutes catches almost every outage. Checking once an hour can miss a problem that comes and goes, and it makes your uptime figure unreliable.",
            "A useful monitor also does three things: it confirms a failure with a second check before alerting you so one network blip does not wake you up, it tells you when the site is back and how long it was down, and it keeps the history so you can show a client or a host the real numbers.",
            "You can try a one-off test with the free [uptime checker](/tools/uptime-checker), or let [SiteRadar uptime monitoring](/features/uptime-monitoring) check your sites continuously."] },
      { h: "What to do when your site goes down",
        p: ["Work through it in this order:"],
        list: ["Open the site from your phone on mobile data, to rule out your own network.", "Check whether it is the whole site or one page, and whether the error is a timeout, a 5xx error or a security warning.", "Look at your host's status page and your control panel for resource limits or maintenance.", "Check that your SSL certificate and your domain have not expired.", "Roll back the last change, whether that is a plugin, theme or code update."],
        after: ["Afterwards, write down the cause and the time. The pattern across several outages is usually more useful than any single one."] },
    ],
    faq: [
      ["What is a good uptime percentage for a website?", "For most business websites, 99.9% is a good target. That allows about 43 minutes of downtime a month. Sites where every minute costs money, such as busy online shops, may aim for 99.95% or higher."],
      ["How often should uptime be checked?", "Every one to five minutes is common. Longer gaps can miss short outages and make the uptime figure less accurate."],
      ["Does planned maintenance count as downtime?", "Visitors cannot tell planned from unplanned downtime, so many teams count it. Some monitors let you pause checks during maintenance so the figure reflects only surprises."],
    ],
    cta: { title: "Know the moment your site goes down", text: "SiteRadar checks your website every few minutes and alerts you on WhatsApp, email, Slack or Teams.", href: "/features/uptime-monitoring", label: "See uptime monitoring" },
  },
  {
    slug: "ssl-certificate-expiry",
    title: "How to check when your SSL certificate expires (and never miss it)",
    seoTitle: "How to Check When Your SSL Certificate Expires",
    description: "How to find your SSL certificate's expiry date in a browser or the command line, why certificates expire unexpectedly, and how to get warned weeks ahead.",
    published: "2026-11-04", minutes: 6, category: "Monitoring",
    intro: [
      "An expired SSL certificate does not quietly degrade your site. Browsers replace the page with a full-screen warning that your connection is not private, and most visitors leave. Search engines, payment providers and email systems can also start to distrust the site.",
      "The good news is that expiry is entirely predictable. Here is how to find the date, why certificates still expire by surprise, and how to be warned in time.",
    ],
    sections: [
      { h: "Check the expiry date in your browser",
        p: ["In Chrome, Edge or Brave, click the padlock (or the site information icon) next to the address, open the connection details and choose the certificate. The \"Valid to\" date is when it expires. In Firefox and Safari the steps are similar: open the site information, then view the certificate.",
            "The same panel shows who issued the certificate and which names it covers, which is worth a glance. A certificate for www.example.com does not automatically cover example.com or a subdomain unless they are listed."] },
      { h: "Check it from the command line",
        p: ["If you are comfortable with a terminal, this prints the start and end dates for any site:"],
        list: ["`echo | openssl s_client -connect example.com:443 -servername example.com 2>/dev/null | openssl x509 -noout -dates`"],
        after: ["The line starting notAfter is the expiry date. This is handy in scripts, but you would have to run it on a schedule for every site, which is the part most people forget."] },
      { h: "Why certificates expire by surprise",
        p: ["Most certificates today renew automatically, which makes the rare failure harder to notice. The usual causes are:"],
        list: ["The renewal task stopped working after a server move, a changed DNS record or a firewall rule.", "A certificate was installed by hand once and nobody remembers it needs renewing.", "A certificate on a subdomain, a mail server or a staging site was forgotten about.", "A renewal succeeded but the web server was never reloaded to use the new certificate.", "The person who bought it left, and the reminders went to their old email."],
        after: ["Lifetimes are also getting shorter across the industry, so there are more renewals to get right every year, not fewer."] },
      { h: "Get warned weeks ahead instead of the day before",
        p: ["A reminder the day before expiry is too late if you have to ask a client or a vendor for help. A better rule is a warning about three weeks out, then a few more as the date approaches, sent to more than one person.",
            "[SiteRadar SSL monitoring](/features/ssl-monitoring) reads each website's certificate on every check, shows the exact expiry date, and warns you from 21 days before. It is also worth watching your domain: a lapsed domain breaks the certificate and the site together. See our guide to [domain expiry](/insights/domain-expiry-and-renewal)."] },
      { h: "What to do if it has already expired",
        p: ["Renew or reissue the certificate with your host or certificate provider, install it, and reload the web server. Then test from a private window and from your phone, because caches can show the old result for a while. If you use a CDN or proxy in front of the site, check the certificate there too."] },
    ],
    faq: [
      ["How long does an SSL certificate last?", "It depends on the provider. Free certificates from Let's Encrypt last 90 days and are meant to renew automatically. Paid certificates last longer, but the maximum lifetime allowed across the industry keeps getting shorter."],
      ["Will my site go down when the certificate expires?", "The server keeps running, but browsers show a security warning that blocks most visitors, so for them the site is effectively down."],
      ["Can I check a certificate for free?", "Yes. Your browser shows the expiry date, and monitoring tools can watch it for you and warn you before it lapses."],
    ],
    cta: { title: "Never see a \"Not secure\" warning again", text: "SiteRadar watches the certificate on every website and warns you weeks before it expires.", href: "/features/ssl-monitoring", label: "See SSL monitoring" },
  },
  {
    slug: "domain-expiry-and-renewal",
    title: "Domain expiry: what happens when a domain lapses, and how to avoid it",
    seoTitle: "Domain Expiry: What Happens When a Domain Lapses",
    description: "What happens when a domain name expires, how grace and redemption periods work, and a simple routine so a missed renewal never takes your website and email offline.",
    published: "2026-11-06", minutes: 6, category: "Monitoring",
    intro: [
      "A domain name is rented, not owned. If the renewal is missed, the website stops, email stops, and eventually someone else can register the name. It is one of the most avoidable disasters in running a website, and it still happens to businesses of every size.",
      "This guide explains the stages after expiry, why renewals get missed, and a routine that prevents it.",
    ],
    sections: [
      { h: "What happens after a domain expires",
        p: ["The exact steps differ between registries and registrars, but the pattern is similar:"],
        list: ["**Expiry day:** the registration ends. Many registrars switch the domain to a parking page at once, so your site and your email stop working.", "**Grace period:** often up to a few weeks, during which you can usually still renew at the normal price.", "**Redemption period:** typically around 30 days, where recovery is still possible but costs an extra fee.", "**Pending delete:** a short final stage where the domain cannot be recovered, after which it is released and anyone can register it."],
        after: ["Do not rely on a grace period. Some registrars skip it, and what you get depends on your registrar and the type of domain."] },
      { h: "Why renewals get missed",
        p: ["The reasons are rarely dramatic:"],
        list: ["Reminders go to an email address nobody reads, often one belonging to a developer or agency who has left.", "The card on file expired, so automatic renewal failed quietly.", "The domain is registered under a former employee, a freelancer or the agency, not the business.", "A company owns dozens of domains and nobody has the full list.", "The renewal looked like a spam email."] },
      { h: "A routine that prevents it",
        p: ["Keep this short and boring, and it will work:"],
        list: ["Put every domain in one list with the registrar, the account owner and the expiry date.", "Make sure the domain is registered to the business, with a shared mailbox as the contact, not one person's inbox.", "Turn on auto-renew, and also keep the payment card current.", "Register for several years at a time for domains you cannot afford to lose.", "Get warnings 60, 30, 14, 7, 3 and 1 days before expiry, sent to more than one person."],
        after: ["[SiteRadar domain monitoring](/features/domain-monitoring) reads the expiry date of each website's domain and sends exactly those reminders. The [subscriptions tracker](/features/subscriptions-tracker) keeps hosting, tools and other renewals with their invoices in the same place."] },
      { h: "If your domain has already expired",
        p: ["Contact your registrar straight away and ask what the options and fees are. Renew as soon as you can, since the price rises in the redemption stage. After it is back, check your DNS records, your SSL certificate and your email, because some of these may need to be restored."] },
    ],
    faq: [
      ["Can someone else buy my domain when it expires?", "Only after it has passed through the grace, redemption and deletion stages and been released. Before that, you can normally still renew it, but the fee grows as time passes."],
      ["Does an expired domain affect my email?", "Yes. Email addresses on the domain stop working as soon as the domain stops resolving, and messages sent to them can bounce."],
      ["How far ahead should I renew?", "As soon as the registrar allows, or set auto-renew. Missing the date costs far more than renewing early."],
    ],
    cta: { title: "Never lose a domain to a missed renewal", text: "SiteRadar reads each domain's expiry date and reminds you 60, 30, 14, 7, 3 and 1 days before.", href: "/features/domain-monitoring", label: "See domain monitoring" },
  },
  {
    slug: "wordpress-website-monitoring-checklist",
    title: "WordPress website monitoring: a checklist of what to watch",
    seoTitle: "WordPress Website Monitoring Checklist",
    description: "A practical checklist for monitoring a WordPress site: uptime, SSL, domain, speed, broken links, SEO basics, plugin updates and what to fix first.",
    published: "2026-11-09", minutes: 7, category: "WordPress",
    intro: [
      "WordPress runs a large share of the web, and most of its problems are not dramatic hacks. They are an expired certificate, a plugin update that breaks a page, a slow homepage, a missing meta description or a link that now leads nowhere.",
      "Use this checklist to decide what to watch on each WordPress site, and in what order to deal with what you find.",
    ],
    sections: [
      { h: "1. Is the site up and working?",
        p: ["Start with availability. Check the homepage on a schedule from outside your server, and check for a piece of text you expect to see, so a blank page or an error screen that still returns a 200 status is caught. Alerts should go to a channel you actually read, and fire only after two failed checks to avoid false alarms. See [website uptime explained](/insights/website-uptime-explained) for how much downtime is acceptable."] },
      { h: "2. SSL, domain and DNS",
        p: ["Three renewals sit underneath every WordPress site and none of them is part of WordPress itself: the SSL certificate, the domain registration and the DNS records. Watch the expiry dates of the first two, and watch the DNS records for unexpected changes, including your mail records such as SPF and DMARC. Read more in [how to check when your SSL certificate expires](/insights/ssl-certificate-expiry) and [domain expiry and renewal](/insights/domain-expiry-and-renewal)."] },
      { h: "3. Speed on real phones",
        p: ["Test the homepage and one or two key pages on a mobile connection. The things that slow WordPress down are usually large images, too many plugins, heavy page builders and no caching. Google's Core Web Vitals measure the parts visitors feel: how fast the main content appears, how soon the page responds to taps, and whether things jump around while loading."] },
      { h: "4. SEO basics on every page",
        p: ["A daily audit catches the quiet problems that cost visits:"],
        list: ["Pages without a title or meta description, or with duplicates.", "More than one main heading (H1) on a page, or none.", "Images without alt text.", "Pages blocked from Google by a noindex tag or a robots rule, sometimes left on from when the site was being built.", "A missing or broken sitemap, so new pages take longer to be found.", "Form fields without labels, and a page without a language set."] },
      { h: "5. Broken links and mixed content",
        p: ["Links break when pages are deleted or renamed. Fix broken internal links first, since they hurt visitors and waste Google's attention. Also look for mixed content, where an HTTPS page still loads an image or script over plain HTTP, which can trigger browser warnings."] },
      { h: "6. Updates and what to do first",
        p: ["Keep WordPress, themes and plugins updated, and remove any you do not use. Update on a day when you can check the site afterwards, and take a backup first. When an audit gives you a long list, work in this order: anything that makes the site unavailable or unsafe, then problems on your most important pages, then the quick sitewide wins."],
        after: ["With the [SiteRadar WordPress plugin](/features/wordpress-monitoring), several sitewide fixes can be switched on in one click, and AI-drafted titles, descriptions and alt text are only applied after you approve them, and can be undone."] },
    ],
    faq: [
      ["What should I monitor on a WordPress site?", "At minimum: uptime, the SSL certificate, domain expiry, DNS changes, page speed and a regular SEO and broken-link audit."],
      ["How often should a WordPress site be checked?", "Availability every few minutes, and a full audit daily or weekly, depending on how often the site changes."],
      ["Do I need a plugin to monitor WordPress?", "No. Uptime, SSL, domain and most audit checks work from outside the site. A plugin is only needed if you want fixes applied to the site for you."],
    ],
    cta: { title: "Monitor and fix your WordPress site", text: "Connect the SiteRadar plugin to switch on common fixes in one click, with every AI draft approved by you.", href: "/features/wordpress-monitoring", label: "See WordPress monitoring" },
  },
  {
    slug: "click-through-rate-search-console",
    title: "Click-through rate in Google Search Console: what it is and how to improve it",
    seoTitle: "Click-Through Rate (CTR) in Search Console Explained",
    description: "What click-through rate means in Google Search Console, how it is calculated, what counts as a good CTR, and practical ways to raise it for pages that already rank.",
    published: "2026-11-11", minutes: 7, category: "SEO",
    intro: [
      "Ranking on Google is only half the job. If people see your page in the results and do not click, you are getting little from the position you worked for. That click rate is called click-through rate, or CTR.",
      "This guide explains how Search Console reports it, why a \"good\" CTR depends on position, and how to improve it for pages that already rank.",
    ],
    sections: [
      { h: "What click-through rate is",
        p: ["CTR is clicks divided by impressions. An impression is counted when your page appears in a search result for someone, and a click is when they choose it. If a page appeared 2,000 times and was clicked 100 times, its CTR is 5%.",
            "Search Console shows CTR in the Performance report, next to clicks, impressions and average position. You can view it for the whole site, for a page, for a search query or for a country."] },
      { h: "What is a good CTR?",
        p: ["There is no single good number, because CTR falls sharply as position drops. A result in the first position usually gets far more clicks than one in the fifth, and results lower on the page get few. Searches where Google shows a featured answer, a map or ads above the results also change the picture.",
            "The useful comparison is not against other sites. It is between your own pages: a page averaging position 3 with a much lower CTR than your other position-3 pages has a problem worth fixing."] },
      { h: "Where the quick wins are",
        p: ["Look for pages with plenty of impressions, an average position on the first page, and a CTR that is low for that position. These pages already have Google's trust. A better title or description can bring more clicks without needing to rank any higher."] },
      { h: "How to raise it",
        p: ["Focus on what searchers see in the result:"],
        list: ["**Write for the query.** Put the words people searched for near the start of the title, and make it match what the page really offers.", "**Keep titles within about 60 characters** so they are not cut off, and make each one unique.", "**Use the description to promise something specific.** Around 155 characters, a clear benefit or number, no filler. Google may rewrite it, but a good one is often used.", "**Show what is different.** Price, year, a free tool or a clear answer can set a result apart from ten similar ones.", "**Fix duplicates.** If several of your pages compete for the same query, merge them or make each one clearly different.", "**Add structured data where it applies,** such as FAQs or product details, which can make a result take up more space."],
        after: ["Change one thing at a time on a page and give Google a few weeks before judging, since results move slowly. Compare the same length of time before and after, using the same query."] },
      { h: "Track it without digging through reports",
        p: ["The [SiteRadar click-through rate tracker](/features/click-through-rate) connects to Search Console read-only and shows clicks, impressions, CTR and average position over time, the searches that bring visitors, and a list of pages that rank on page one but get fewer clicks than they should. The numbers also go into the monthly report you can send clients."] },
    ],
    faq: [
      ["What is the formula for click-through rate?", "Clicks divided by impressions, multiplied by 100 to give a percentage."],
      ["Why is my CTR low even though I rank well?", "Usually the title or description does not match what searchers want, other results look more appealing, or Google shows other features above the results."],
      ["Does CTR affect my ranking?", "Google says it does not use Search Console CTR as a direct ranking signal, but a result that earns more clicks brings more visitors, which is the point of ranking."],
    ],
    cta: { title: "See where Google sends people from", text: "Connect Search Console in one click and find the pages that deserve a better title.", href: "/features/click-through-rate", label: "See the CTR tracker" },
  },
  {
    slug: "monitor-client-websites-agency",
    title: "How agencies can monitor client websites without a lot of manual work",
    seoTitle: "How Agencies Can Monitor Client Websites at Scale",
    description: "A practical system for agencies and freelancers to monitor many client websites: what to check, who gets alerted, and how to turn it into a monthly report clients value.",
    published: "2026-11-13", minutes: 7, category: "Agencies",
    intro: [
      "When you look after a handful of client websites, you notice problems because you look at them. When you look after thirty, you find out when a client phones you. That call is expensive: it costs trust, and sometimes the contract.",
      "A small, repeatable system turns that around. Here is what to watch on every client site, who should be alerted, and how to make the work visible.",
    ],
    sections: [
      { h: "What to watch on every client site",
        p: ["The same short list covers most of the damage you will ever see:"],
        list: ["**Uptime and response time,** checked every few minutes.", "**SSL certificate expiry,** so \"Not secure\" never greets a client's customers.", "**Domain expiry,** especially when the domain is registered under an old account.", "**DNS changes,** including mail records, which quietly break email delivery.", "**A daily SEO and technical audit,** which finds missing titles, broken links and pages blocked from Google.", "**Search visibility,** using click-through data from Search Console."] },
      { h: "Decide who is told, and how",
        p: ["An alert that reaches nobody is worth nothing. For each client, decide who is told when the site is down, and through what. Many agency owners prefer WhatsApp for outages because they see it quickly, and email for everything else. Keep the number of alerts low, so they stay meaningful: require two failed checks in a row before an outage alert, and send routine warnings, such as an expiring certificate, as a single message.",
            "Give clients read-only access if they want it, so they can look for themselves without asking you."] },
      { h: "Keep renewals in one place",
        p: ["Agencies often hold the renewals for their clients' domains, hosting and tools, which means a missed one is your fault. Keep a single list with the renewal date, the cost, who pays, and the invoice. A [subscriptions tracker](/features/subscriptions-tracker) with reminders beats a spreadsheet nobody opens."] },
      { h: "Turn the work into a monthly report",
        p: ["Monitoring is invisible when it works. A short monthly report fixes that: uptime for the month, any incidents and how long they lasted, issues found and fixed, visitor numbers, and what you recommend next. Send it on the same day every month, with your logo on it.",
            "[SiteRadar monthly reports](/features/client-reporting) are generated for every website on the first of the month, with your logo, a prioritised list of what to do next and a Found on Google section when Search Console is connected."] },
      { h: "Fix the common problems quickly",
        p: ["For WordPress clients, a connected plugin lets you switch on common fixes across sites instead of editing each theme. Drafts for titles, meta descriptions and image alt text can be reviewed and approved one by one, so a client's wording is never changed without a human reading it. See [WordPress monitoring and fixes](/features/wordpress-monitoring)."] },
    ],
    faq: [
      ["How many websites can one person monitor?", "With automated checks and alerts, dozens. The limit is how many alerts you can act on, which is why alert rules and a monthly report matter more than the tool."],
      ["Should clients get their own alerts?", "Usually the agency gets the alerts and decides what to tell the client. Read-only access and a monthly report keep clients informed without noise."],
      ["What should a client report include?", "Uptime and incidents, issues found and fixed, traffic and search results, and the next recommended actions."],
    ],
    cta: { title: "Look after every client site from one dashboard", text: "Monitoring, alerts, fixes and a branded monthly report for each client.", href: "/agencies", label: "See SiteRadar for agencies" },
  },
];

export const bySlug = (slug: string) => ARTICLES.find((a) => a.slug === slug);
export const newestFirst = () => [...ARTICLES].sort((a, b) => b.published.localeCompare(a.published));
export const dateLabel = (iso: string) => new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
