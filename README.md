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

## Database (Postgres)

SiteWatch stores everything in Postgres. Set `DATABASE_URL` (Railway's Postgres plugin provides it) and the
tables are created on first start. Moving an existing install from SQLite:

```bash
python -m sitewatch migrate-sqlite /app/data/sitewatch.db   # copies the old data, safe to run twice
```

Run the monitoring jobs as their own service so the web service can scale: give the web service the start command
`python -m sitewatch serve --no-scheduler` and a second service `python -m sitewatch worker`.

## Dashboard (Next.js)

`frontend/` is the dashboard people use: login, Websites (overview, per-site tabs, add/remove) and Subscriptions
(invoices as PDFs, monthly spend report). It talks to this Python service through `/api`.

```bash
python -m sitewatch serve                      # API + scheduler on :8080
cd frontend && npm install
BACKEND_URL=http://localhost:8080 npm run dev  # dashboard on :3000
```

Deploy the Python service on Railway (volume at `/app/data`, public domain such as `api.monitor.yourdomain.com`) and
`frontend/` on Vercel with the environment variable `BACKEND_URL=https://api.monitor.yourdomain.com`.
Set `public_url` in `config.yaml` to the API domain, so the tracking snippet loads straight from Railway instead of through Vercel.
Invoice PDFs are limited to 4 MB because Vercel caps proxied request bodies.
Websites are stored in the database; `sites:` in `config.yaml` only seeds the first start.

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
- Data lives in Postgres (set `DATABASE_URL`). Invoice PDFs, reports and screenshots are still files in `data/` until they move to cloud storage.
- `demo/` contains a fake website with deliberate problems and a script that seeds simulated history, used to test everything locally. Don't run `seed_history.py` on a real install.
