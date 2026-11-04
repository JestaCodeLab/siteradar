# SiteWatch

Self-hosted website monitoring for your own sites and your clients':

- **Uptime monitoring** every few minutes — HTTP status, response time, required-text check, SSL expiry. Alerts by email, Slack, Teams or Discord when a site goes down (after 2 failed checks, to avoid false alarms), when it recovers, when it's slow, and before the certificate expires.
- **Analytics** — a 1-line, cookieless tracking script: visitors, page views, bounce rate, sources, devices, browsers, UTM campaigns and real-visitor page-load times. No personal data stored, so normally no cookie banner needed.
- **Daily site audit** — crawls up to 50 pages and checks ~50 rules across SEO, performance, security, accessibility and best practices (broken links, titles/descriptions, sitemap/robots, compression, caching, image sizes, security headers, exposed files, mixed content, alt text, form labels…). Every finding comes with a plain-language fix.
- **Monthly report** (HTML + PDF, emailed automatically on the 1st) — uptime, incidents, speed, traffic vs last month, health scores, what was fixed / what's new, and a prioritised **"What to do next"** list.
- **Dashboard** — all sites at a glance, 30-day uptime bars, one-click check/audit/report.

## Quick start

```bash
pip install -r requirements.txt
playwright install chromium          # only needed for PDF reports
cp config.example.yaml config.yaml   # add your sites, email & alert settings
python -m sitewatch check            # test: one uptime check of every site
python -m sitewatch audit            # test: run an audit now
python -m sitewatch serve            # dashboard + scheduler on http://localhost:8080
```

Then add the tracking snippet to each website (just before `</head>`):

```bash
python -m sitewatch snippet
```

WordPress: paste it with a plugin like *WPCode* (Header section). Shopify/Wix/Squarespace: Settings → Custom code → Header.

## Run it 24/7

Monitoring only works while SiteWatch is running, so host it on an always-on machine — a small VPS (Hetzner, DigitalOcean, TransIP ~€5/month) is plenty for dozens of sites.

```bash
docker build -t sitewatch .
docker run -d --restart unless-stopped -p 8080:8080 \
  -v $PWD/config.yaml:/app/config.yaml -v $PWD/data:/app/data \
  -e SMTP_PASSWORD=... -e SITEWATCH_PASSWORD=... sitewatch
```

Put it behind HTTPS (e.g. Caddy: `monitor.yourdomain.com { reverse_proxy localhost:8080 }`) and set `public_url` to that address — the tracking script on your sites sends data there.

## Commands

| Command | What it does |
|---|---|
| `serve [--port 8080]` | Dashboard, analytics endpoint and scheduler |
| `check` | One uptime check of every site |
| `audit [site-id]` | Full audit now |
| `report [site-id] [--month 2026-09] [--pdf] [--email]` | Monthly report (default: last month) |
| `snippet` | Print each site's tracking code |
| `test-alert` | Send a test alert through your channels |

## Good to know

- **Core Web Vitals**: add a free Google PageSpeed Insights API key (`pagespeed_api_key`) to include LCP/CLS/INP from real Chrome users in audits and reports.
- **Google Search Console** data (search queries, impressions, rankings) isn't included yet — it needs an OAuth connection per site and is the natural next addition.
- Data is in a single SQLite file in `data/` — back that folder up.
- `demo/` contains a fake website with deliberate problems and a script that seeds simulated history, used to test everything locally. Don't run `seed_history.py` on a real install.
