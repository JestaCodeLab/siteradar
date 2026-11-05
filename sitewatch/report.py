"""Monthly report: uptime, performance, analytics, audit scores and a prioritised action list."""
import calendar
import datetime as dt
import logging
import os
import time

from jinja2 import Environment, FileSystemLoader, select_autoescape

from . import alerts, analytics, db, health as health_mod, monitor
from .charts import bar_chart, line_chart, uptime_strip

log = logging.getLogger("sitewatch.report")
env = Environment(loader=FileSystemLoader(os.path.join(os.path.dirname(__file__), "templates")),
                  autoescape=select_autoescape(["html"]))


def month_bounds(year, month):
    start = dt.datetime(year, month, 1)
    end = dt.datetime(year + (month == 12), month % 12 + 1, 1)
    return start.timestamp(), end.timestamp()


def previous_month(year, month):
    return (year - 1, 12) if month == 1 else (year, month - 1)


def _delta(now, before):
    if now is None or before in (None, 0):
        return None
    return round(100 * (now - before) / before)


def build(cfg, site, year, month):
    since, until = month_bounds(year, month)
    until_eff = min(until, time.time())
    py, pm = previous_month(year, month)
    psince, puntil = month_bounds(py, pm)
    if until > time.time():   # month in progress: compare with the same number of days last month
        puntil = min(puntil, psince + (until_eff - since))

    up = monitor.uptime_stats(site["id"], since, until_eff)
    up_prev = monitor.uptime_stats(site["id"], psince, puntil)
    series = monitor.daily_series(site["id"], since, until_eff)
    ssl = db.q1("SELECT ssl_days_left FROM checks WHERE site_id=? AND ssl_days_left IS NOT NULL ORDER BY ts DESC LIMIT 1",
                (site["id"],))

    a = analytics.summary(site["id"], since, until_eff)
    a_prev = analytics.summary(site["id"], psince, puntil)

    audit = db.latest_audit(site["id"], before=until)
    prev_audit = None
    if audit:
        prev_audit = db.latest_audit(site["id"], before=min(since, audit["ts"] - 1))
    new_issues, fixed_issues = [], []
    if audit and prev_audit:
        cur_rules = {i["rule"]: i for i in audit["issues"]}
        prev_rules = {i["rule"]: i for i in prev_audit["issues"]}
        new_issues = [cur_rules[r] for r in cur_rules if r not in prev_rules]
        fixed_issues = [prev_rules[r] for r in prev_rules if r not in cur_rules]

    health = health_mod.latest(site["id"])
    recs = recommendations(cfg, site, up, a, audit, health)

    days = [dt.date(year, month, d).isoformat() for d in range(1, calendar.monthrange(year, month)[1] + 1)]
    by_day = {s["day"]: s for s in series}
    charts = {
        "uptime": uptime_strip([(d, by_day[d]["uptime"] if d in by_day else None) for d in days]),
        "response": line_chart([(d[8:], by_day[d]["avg_ms"]) for d in days if d in by_day], unit="ms"),
    }
    if a.get("pageviews"):
        dv = dict(a["daily_visitors"])
        charts["visitors"] = bar_chart([(d[8:], dv.get(d, 0)) for d in days if d <= dt.date.today().isoformat()])

    return {
        "site": site, "cfg": cfg,
        "period": dt.date(year, month, 1).strftime("%B %Y"),
        "generated": dt.datetime.now().strftime("%d %B %Y, %H:%M"),
        "partial": until > time.time(),
        "up": up, "up_prev": up_prev, "ssl_days": ssl["ssl_days_left"] if ssl else None,
        "a": a, "a_prev": a_prev,
        "deltas": {
            "visitors": _delta(a.get("visitors"), a_prev.get("visitors")),
            "pageviews": _delta(a.get("pageviews"), a_prev.get("pageviews")),
            "avg_ms": _delta(up["avg_ms"], up_prev["avg_ms"]),
        },
        "audit": audit, "prev_audit": prev_audit,
        "new_issues": new_issues, "fixed_issues": fixed_issues,
        "recs": recs, "charts": charts, "health": health,
        "fmt_ts": lambda ts: dt.datetime.fromtimestamp(ts).strftime("%d %b %H:%M") if ts else "ongoing",
    }


def recommendations(cfg, site, up, a, audit, health=None):
    """Plain-language, prioritised to-do list combining all data sources."""
    recs = []

    def add(priority, area, title, why, action):
        recs.append({"priority": priority, "area": area, "title": title, "why": why, "action": action})

    if up["uptime"] is not None and up["uptime"] < 99.9:
        add(1, "Reliability", f"Improve availability ({up['uptime']:.2f}% uptime)",
            f"The site was down for {up['downtime_minutes']:.0f} minutes across {len(up['incidents'])} incident(s). "
            "Each outage loses visitors and can hurt search rankings.",
            "Review the incident causes below with your host; consider better hosting, a CDN, or server monitoring/auto-restart.")
    if up["avg_ms"] and up["avg_ms"] > 1000:
        add(1 if up["avg_ms"] > 2000 else 2, "Speed", f"Speed up server response (avg {up['avg_ms']} ms)",
            "Visitors start leaving after ~2–3 seconds, and Google uses speed as a ranking signal.",
            "Enable full-page caching, use a CDN, and check for slow plugins or database queries.")
    ssl = db.q1("SELECT ssl_days_left FROM checks WHERE site_id=? AND ssl_days_left IS NOT NULL ORDER BY ts DESC LIMIT 1",
                (site["id"],))
    if ssl and ssl["ssl_days_left"] <= cfg["ssl_warning_days"]:
        add(1, "Security", f"SSL certificate expires in {ssl['ssl_days_left']} days",
            "When it expires, browsers show a full-page security warning and most visitors leave.",
            "Renew the certificate now, or check why automatic renewal (e.g. Let's Encrypt/certbot) is not running.")
    if a.get("pageviews"):
        if a["bounce_rate"] >= 70:
            add(2, "Engagement", f"Reduce bounce rate ({a['bounce_rate']}%)",
                "Most visitors leave after one page.",
                f"Strengthen the top entry pages ({', '.join(p for p, _ in a['entry_pages'][:3])}) with a clear "
                "next step: prominent call-to-action, related links, and faster loading.")
        mobile = next((p for d, _, p in a["devices"] if d == "Mobile"), 0)
        if mobile >= 40:
            add(2, "Mobile", f"{mobile}% of visits are on mobile",
                "Mobile experience directly drives results for this site.",
                "Test the key pages on a phone each month: tap targets, form usability, image sizes and load speed.")
        if a["slow_pages"]:
            add(2, "Speed", "Pages that load slowly for real visitors",
                "Measured in visitors' browsers: " + ", ".join(f"{p} ({ms / 1000:.1f}s)" for p, ms, _ in a["slow_pages"][:3]),
                "Compress and resize images on these pages, remove unused scripts, and lazy-load content below the fold.")
        direct = next((p for r, _, p in a["referrers"] if r == "Direct / none"), 0)
        search = sum(p for r, _, p in a["referrers"] if any(s in r for s in ("google", "bing", "duckduckgo", "ecosia")))
        if search < 20:
            add(3, "Growth", f"Search engines bring only {search}% of traffic",
                "Organic search is usually the cheapest long-term traffic source.",
                "Fix the SEO items below, add a Google Business Profile, and publish useful content targeting what customers search for.")
        if direct > 60:
            add(3, "Measurement", "Most traffic shows as Direct",
                "Campaign traffic may not be attributed correctly.",
                "Add UTM tags (utm_source, utm_medium, utm_campaign) to links in emails, ads and social posts.")
    else:
        add(3, "Measurement", "No analytics data yet",
            "Without visitor data it's impossible to see what works.",
            f'Add the tracking snippet to the site: <script defer src="{cfg["public_url"]}/t.js" data-site="{site["id"]}"></script>')
    if audit:
        for i in [x for x in audit["issues"] if x["severity"] == "high"][:6]:
            add(1, i["category"], i["title"], f"Found on {i['count']} URL(s).", i["fix"])
        for i in [x for x in audit["issues"] if x["severity"] == "medium"][:6]:
            add(2, i["category"], i["title"], f"Found on {i['count']} URL(s).", i["fix"])
        if audit.get("pagespeed"):
            ps = audit["pagespeed"]
            if (ps.get("lcp_ms") or 0) > 2500:
                add(1, "Speed", f"Largest Contentful Paint is {ps['lcp_ms'] / 1000:.1f}s (target < 2.5s)",
                    "This Core Web Vital is part of Google's ranking.",
                    "Optimise the hero image, preload key fonts and reduce render-blocking CSS/JS.")
    else:
        add(3, "Quality", "No site audit yet", "", "Run an audit: python -m sitewatch audit")
    health = health or {}
    d = health.get("domain")
    if d and d.get("days_left") is not None and d["days_left"] <= 60:
        add(1 if d["days_left"] <= 30 else 2, "Domain", f"Domain {d['domain']} expires in {d['days_left']} days",
            "If a domain lapses, the website and every email address on it stop working.",
            f"Renew it with {d.get('registrar') or 'your registrar'} and switch on auto-renew.")
    dns = health.get("dns")
    if dns:
        for c in dns["checks"]:
            if c["status"] == "bad":
                add(1, "Email & DNS", c["label"] + ": " + c["detail"], "Affects whether your email is delivered or can be spoofed.", c["fix"])
            elif c["status"] == "warn" and c["id"] in ("dmarc", "ns"):
                add(2, "Email & DNS", c["label"] + ": " + c["detail"], "A small gap worth closing.", c["fix"])
        if dns["history"] and time.time() - dns["history"][0]["ts"] < 31 * 86400:
            add(2, "DNS", "DNS records changed this month", "Unexpected changes can mean a hijack or a hosting mistake.",
                "Check the changes listed in the report are ones you or your team made.")
    sm = health.get("sitemap")
    if sm:
        if not sm["sitemap_url"]:
            add(2, "SEO", "No sitemap found", "A sitemap helps search engines find every page.",
                "Generate a sitemap.xml (most website builders and SEO plugins can) and list it in robots.txt.")
        elif sm["broken"]:
            add(1, "SEO", f"{len(sm['broken'])} pages in the sitemap return errors", "Search engines waste time on pages that do not work.",
                "Remove or fix these pages: " + ", ".join(b["url"] for b in sm["broken"][:3]))
    recs.sort(key=lambda r: r["priority"])
    return recs


def render(ctx):
    return env.get_template("report.html").render(**ctx)


def generate(cfg, site, year=None, month=None, pdf=False, email=False):
    if year is None:
        # Default: the month that just ended
        today = dt.date.today()
        year, month = previous_month(today.year, today.month)
    ctx = build(cfg, site, year, month)
    html = render(ctx)
    out_dir = os.path.join(cfg["data_dir"], "reports")
    os.makedirs(out_dir, exist_ok=True)
    base = os.path.join(out_dir, f"{site['id']}-{year}-{month:02d}")
    with open(base + ".html", "w") as f:
        f.write(html)
    paths = {"html": base + ".html"}
    if pdf or email:
        try:
            paths["pdf"] = to_pdf(base + ".html", base + ".pdf")
        except Exception as e:
            log.warning("PDF export unavailable (%s); sending HTML only.", e)
    if email and site.get("report_to"):
        attach = []
        if paths.get("pdf"):
            attach.append((os.path.basename(paths["pdf"]), open(paths["pdf"], "rb").read(), "application/pdf"))
        summary = (f"Website report for {site['name']} – {ctx['period']}\n\n"
                   f"Uptime: {ctx['up']['uptime']:.2f}%\n" if ctx['up']['uptime'] is not None else "")
        alerts.send_email(cfg, site["report_to"], f"Website report – {site['name']} – {ctx['period']}",
                          summary + "\nThe full report is attached.", html=html, attachments=attach)
    return paths


def to_pdf(html_path, pdf_path):
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch()
        page = b.new_page()
        page.goto("file://" + os.path.abspath(html_path))
        page.emulate_media(media="print")
        page.evaluate("document.querySelectorAll('details').forEach(d => d.open = true)")
        page.pdf(path=pdf_path, format="A4", print_background=True,
                 margin={"top": "14mm", "bottom": "14mm", "left": "12mm", "right": "12mm"})
        b.close()
    return pdf_path
