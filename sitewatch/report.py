"""Monthly report: uptime, performance, analytics, audit scores and a prioritised action list."""
import calendar
import datetime as dt
import logging
import os
import re
import shutil
import tempfile
import time
from urllib.parse import urlparse

from jinja2 import Environment, FileSystemLoader, select_autoescape

from . import accounts, alerts, analytics, db, health as health_mod, monitor, plans, storage
from .charts import bar_chart, line_chart, uptime_strip

log = logging.getLogger("sitewatch.report")
env = Environment(loader=FileSystemLoader(os.path.join(os.path.dirname(__file__), "templates")),
                  autoescape=select_autoescape(["html"]))


def _covers(year, month, until_eff, partial):
    """"1–8 November" while the month is running, otherwise "1–30 November"."""
    last = dt.datetime.fromtimestamp(until_eff - 1).day if partial else calendar.monthrange(year, month)[1]
    return f"1–{last} {dt.date(year, month, 1).strftime('%B')}"


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


def brand(site):
    """Company name and logo for the report header; plans without clean reports get a small SiteRadar credit."""
    ws = accounts.workspace(site.get("workspace_id"))
    if not ws:
        return {"name": "", "logo": None, "watermark": False}
    mark = not plans.limits(ws)["clean_reports"]
    return {"name": ws["name"], "logo": ws["logo_url"], "watermark": mark, **({"wm": plans.watermark()} if mark else {})}


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

    brand_info = brand(site)
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
        "site": site, "cfg": cfg, "brand": brand_info,
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
        "client": client_summary(up, a, audit, health, ssl["ssl_days_left"] if ssl else None, recs,
                                 {"visitors": _delta(a.get("visitors"), a_prev.get("visitors"))}, fixed_issues),
        "fmt_ts": lambda ts: dt.datetime.fromtimestamp(ts).strftime("%d %b %H:%M") if ts else "ongoing",
        "host": (urlparse(site["url"]).hostname or site["url"]).removeprefix("www."),
        "initials": "".join(w[0] for w in (brand_info["name"] or site["name"]).split()[:2]).upper() or "SR",
        "covers": _covers(year, month, until_eff, until > time.time()),
        "ssl_date": _long_date((dt.date.today() + dt.timedelta(days=ssl["ssl_days_left"])).isoformat()) if ssl and ssl["ssl_days_left"] is not None else None,
        "domain_date": _long_date(((health or {}).get("domain") or {}).get("expires")) if ((health or {}).get("domain") or {}).get("expires") else None,
        "findings": technical_findings(recs, audit),
        "first_month": not a_prev.get("pageviews"),
    }


def recommendations(cfg, site, up, a, audit, health=None):
    """Plain-language, prioritised to-do list combining all data sources."""
    recs = []

    def add(priority, area, title, why, action, key=None, count=None, urls=None):
        recs.append({"priority": priority, "area": area, "title": title, "why": why, "action": action, "key": key, "count": count, "urls": urls})

    if up["uptime"] is not None and up["uptime"] < 99.9:
        add(1, "Reliability", f"Improve availability ({up['uptime']:.2f}% uptime)",
            f"The site was down for {up['downtime_minutes']:.0f} minutes across {len(up['incidents'])} incident(s). "
            "Each outage loses visitors and can hurt search rankings.",
            "Review the incident causes below with your host; consider better hosting, a CDN, or server monitoring/auto-restart.", key="uptime")
    if up["avg_ms"] and up["avg_ms"] > 1000:
        add(1 if up["avg_ms"] > 2000 else 2, "Speed", f"Speed up server response (avg {up['avg_ms']} ms)",
            "Visitors start leaving after ~2–3 seconds, and Google uses speed as a ranking signal.",
            "Enable full-page caching, use a CDN, and check for slow plugins or database queries.", key="speed")
    ssl = db.q1("SELECT ssl_days_left FROM checks WHERE site_id=? AND ssl_days_left IS NOT NULL ORDER BY ts DESC LIMIT 1",
                (site["id"],))
    if ssl and ssl["ssl_days_left"] <= cfg["ssl_warning_days"]:
        add(1, "Security", f"SSL certificate expires in {ssl['ssl_days_left']} days",
            "When it expires, browsers show a full-page security warning and most visitors leave.",
            "Renew the certificate now, or check why automatic renewal (e.g. Let's Encrypt/certbot) is not running.", key="ssl")
    if a.get("pageviews"):
        if a["bounce_rate"] >= 70:
            add(2, "Engagement", f"Reduce bounce rate ({a['bounce_rate']}%)",
                "Most visitors leave after one page.",
                f"Strengthen the top entry pages ({', '.join(p for p, _ in a['entry_pages'][:3])}) with a clear "
                "next step: prominent call-to-action, related links, and faster loading.", key="bounce")
        mobile = next((p for d, _, p in a["devices"] if d == "Mobile"), 0)
        if mobile >= 40:
            add(3, "Mobile", f"{mobile}% of visits are on mobile",
                "Mobile experience directly drives results for this site.",
                "Test the key pages on a phone each month: tap targets, form usability, image sizes and load speed.", key="mobile")
        if a["slow_pages"]:
            add(2, "Speed", "Pages that load slowly for real visitors",
                "Measured in visitors' browsers: " + ", ".join(f"{p} ({ms / 1000:.1f}s)" for p, ms, _ in a["slow_pages"][:3]),
                "Compress and resize images on these pages, remove unused scripts, and lazy-load content below the fold.", key="speed")
        direct = next((p for r, _, p in a["referrers"] if r == "Direct / none"), 0)
        search = sum(p for r, _, p in a["referrers"] if any(s in r for s in ("google", "bing", "duckduckgo", "ecosia")))
        if search < 20:
            add(3, "Growth", f"Search engines bring only {search}% of traffic",
                "Organic search is usually the cheapest long-term traffic source.",
                "Fix the SEO items below, add a Google Business Profile, and publish useful content targeting what customers search for.", key="search_low")
        if direct > 60:
            add(3, "Measurement", "Most traffic shows as Direct",
                "Campaign traffic may not be attributed correctly.",
                "Add UTM tags (utm_source, utm_medium, utm_campaign) to links in emails, ads and social posts.", key="direct")
    else:
        add(3, "Measurement", "No analytics data yet",
            "Without visitor data it's impossible to see what works.",
            f'Add the tracking snippet to the site: <script defer src="{cfg["public_url"]}/t.js" data-site="{site["id"]}"></script>', key="no_analytics")
    if audit:
        for i in [x for x in audit["issues"] if x["severity"] == "high"][:6]:
            add(1, i["category"], i["title"], f"Found on {i['count']} URL(s).", i["fix"], count=i["count"], urls=[e["url"] for e in i["examples"][:3]])
        for i in [x for x in audit["issues"] if x["severity"] == "medium"][:6]:
            add(2, i["category"], i["title"], f"Found on {i['count']} URL(s).", i["fix"], count=i["count"], urls=[e["url"] for e in i["examples"][:3]])
        ps = (audit.get("pagespeed") or {}).get("mobile")
        if ps:
            if (ps.get("lcp_ms") or 0) > 2500:
                add(1, "Speed", f"Largest Contentful Paint is {ps['lcp_ms'] / 1000:.1f}s (target < 2.5s)",
                    "This Core Web Vital is part of Google's ranking.",
                    "Optimise the hero image, preload key fonts and reduce render-blocking CSS/JS.", key="speed")
    else:
        add(3, "Quality", "No site audit yet", "", "Run an audit: python -m sitewatch audit")
    health = health or {}
    d = health.get("domain")
    if d and d.get("days_left") is not None and d["days_left"] <= 60:
        add(1 if d["days_left"] <= 30 else 2, "Domain", f"Domain {d['domain']} expires in {d['days_left']} days",
            "If a domain lapses, the website and every email address on it stop working.",
            f"Renew it with {d.get('registrar') or 'your registrar'} and switch on auto-renew.", key="domain")
    dns = health.get("dns")
    if dns:
        for c in dns["checks"]:
            if c["status"] == "bad":
                add(1, "Email & DNS", c["label"] + ": " + c["detail"], "Affects whether your email is delivered or can be spoofed.", c["fix"], key="email")
            elif c["status"] == "warn" and c["id"] in ("dmarc", "ns"):
                add(2, "Email & DNS", c["label"] + ": " + c["detail"], "A small gap worth closing.", c["fix"], key="email")
        if dns["history"] and time.time() - dns["history"][0]["ts"] < 31 * 86400:
            add(2, "DNS", "DNS records changed this month", "Unexpected changes can mean a hijack or a hosting mistake.",
                "Check the changes listed in the report are ones you or your team made.", key="dns_changed")
    sm = health.get("sitemap")
    if sm:
        if not sm["sitemap_url"]:
            add(2, "SEO", "No sitemap found", "A sitemap helps search engines find every page.",
                "Generate a sitemap.xml (most website builders and SEO plugins can) and list it in robots.txt.", key="sitemap")
        elif sm["broken"]:
            add(1, "SEO", f"{len(sm['broken'])} pages in the sitemap return errors", "Search engines waste time on pages that do not work.",
                "Remove or fix these pages: " + ", ".join(b["url"] for b in sm["broken"][:3]), key="sitemap")
    recs.sort(key=lambda r: r["priority"])
    return recs


# What each group of technical findings means for a client:
# (what to do, why it matters, who can help, how long, where the detail is, a short phrase for the summary sentence)
PLAIN = {
    "uptime": ("Get your website staying online", "While your website is down, customers cannot reach you, find your phone number or buy from you, and search engines may rank it lower.",
               "Your hosting provider", "Ask them for the cause and a fix", "pages 4 and 5", "fixing the downtime"),
    "speed": ("Make your website appear faster on phones", "Most visitors use phones, and pages that take more than a few seconds to appear lose people before they see your offer. Google also uses speed when ranking sites.",
              "Your web developer", "About half a day", "pages 4 and 5", "a faster website on phones"),
    "ssl": ("Check your security certificate renews in time", "This certificate keeps your site secure (the padlock in the address bar). If it runs out, browsers warn visitors that your site is “Not secure”. It usually renews automatically, but it is worth confirming.",
            "Your web developer or hosting company", "5 minutes to confirm", "page 5", "confirming your security certificate renews"),
    "email": ("Stop your emails landing in spam", "Email protection settings (called SPF and DMARC) are missing. Without them, email services cannot confirm your messages really come from you, so they are more likely to go to spam, and scammers can more easily pretend to be you.",
              "Whoever manages your domain or email", "About 30 minutes", "page 5", "email protection settings"),
    "domain": ("Renew your domain name", "If it expires, your website and every email address on it stop working.",
               "You, or your domain registrar", "10 minutes, then switch on auto-renew", "page 5", "renewing your domain name"),
    "bounce": ("Give visitors a reason to keep looking", "Many people leave after one page, so fewer of them become customers. A clear next step on your main pages helps.",
               "Your web developer or designer", "About 1 hour", "page 3", "keeping visitors on your site longer"),
    "search_low": ("Bring in more visitors from Google", "Few visitors arrive from search, which is usually the cheapest long-term source of customers.",
                   "Your web developer or marketer", "Ongoing", "page 3", "bringing in more visitors from Google"),
    "sitemap": ("Help Google find all your pages", "A missing or broken page list makes it harder for Google to show everything you offer.",
                "Your web developer", "About 1 hour", "page 5", "fixing your page list for Google"),
    "dns_changed": ("Check the changes to your domain settings", "Some domain settings changed this month. Unexpected changes can mean a mistake, or someone tampering with your domain.",
                    "Your web developer", "10 minutes", "page 5", "checking your domain settings"),
    "no_analytics": ("Start counting your visitors", "Without visitor numbers it is hard to tell what is working and what is not.",
                     "Your web developer", "About 15 minutes", "page 3", "adding visitor counting"),
    "cat:SEO": ("Help Google show the right pages", "Some pages share the same title or are missing headings and descriptions. Google cannot easily tell them apart, so the page you want people to find may show up less often.",
                "Your web developer or content editor", "About 1 hour", "page 4", "a few fixes to help Google show your pages"),
    "cat:Performance": ("Make your pages load faster", "Large images and files that are not saved in the visitor's browser slow pages down.",
                        "Your web developer", "About 2 hours", "page 4", "faster loading pages"),
    "cat:Security": ("Add standard website safety settings", "A few standard safety settings are missing. They are quick for a developer to add.",
                     "Your web developer or host", "About 1 hour", "page 4", "a few safety settings"),
    "cat:Accessibility": ("Make the site easier for everyone to use", "Small gaps make the site harder for people using screen readers or slow connections.",
                          "Your web developer", "About 2 hours", "page 4", "making the site easier for everyone to use"),
    "cat:Best practices": ("Tidy up some technical details", "A few small things need attention to keep the site healthy.",
                           "Your web developer", "About 1 hour", "page 4", "tidying up small technical details"),
}
TAG = {1: ("Fix soon", "#FEF2F2", "#991B1B", "#FEE2E2"), 2: ("Improve", "#FFFBEB", "#92400E", "#FEF3C7"), 3: ("Reminder", "#EFF6FF", "#1E40AF", "#DBEAFE")}
HIDDEN_FROM_PRIORITIES = {"mobile", "direct"}      # observations, not problems


def _secs(ms):
    return f"{ms / 1000:.2f} seconds" if ms < 1000 else f"{ms / 1000:.1f} seconds"


def score_word(v):
    """The word and colours for a 0-100 score: 90 and over very good, 70 to 89 good, below that needs work."""
    return ("Very good", "#166534", "#DCFCE7") if v >= 90 else ("Good", "#92400E", "#FEF3C7") if v >= 70 else ("Needs work", "#991B1B", "#FEE2E2")


_HEX_ID = re.compile(r"^[0-9a-f]{16,}$")


def friendly_page(path):
    """A readable name for a page address: "/" is the Homepage, "/app/reports/6aef…" is "App reports"."""
    if path in ("", "/"):
        return "Homepage"
    parts = [x for x in path.strip("/").split("/") if x and not _HEX_ID.match(x)]
    return (" ".join(parts).replace("-", " ").replace("_", " ") or "Page").capitalize()


def friendly_source(name):
    n = (name or "").lower()
    if n == "direct / none":
        return "Typed your address or used a bookmark"
    for key, label in (("google", "Google search"), ("bing", "Bing search"), ("duckduckgo", "DuckDuckGo search"), ("facebook", "Facebook"), ("instagram", "Instagram"),
                       ("linkedin", "LinkedIn"), ("twitter", "X (Twitter)"), ("t.co", "X (Twitter)"), ("whatsapp", "WhatsApp")):
        if key in n:
            return label
    return name


def friendly_device(name):
    return {"Mobile": "Phone", "Desktop": "Computer"}.get(name, name)


def client_summary(up, a, audit, health, ssl_days, recs, deltas, fixed_issues):
    """The report's front pages in plain words: a verdict, status rows, what went well and the things to do first."""
    n = lambda v, one, many: f"{v} {one if v == 1 else many}"       # noqa: E731
    cards = []
    scores = (audit or {}).get("scores", {})
    ps = ((audit or {}).get("pagespeed") or {}).get("mobile") or {}
    dns_bad = [c for c in ((health or {}).get("dns") or {}).get("checks", []) if c["status"] == "bad"]

    # Online?
    u = up["uptime"]
    if u is None:
        cards.append({"id": "uptime", "status": "none", "label": "Not enough checks yet", "text": "We need a few more checks before we can say how reliable your website is."})
    else:
        st = "good" if u >= 99.9 else "ok" if u >= 99 else "bad"
        inc = len(up["incidents"])
        cards.append({"id": "uptime", "status": st, "label": {"good": "Always online", "ok": "A few interruptions", "bad": "Your website went offline"}[st],
                      "text": (f"Your site was available {'100%' if u >= 99.995 else f'{u:.2f}%'} of the time, with no outages. Customers could always reach you." if not inc else
                               f"Your site was available {u:.2f}% of the time. It went offline {n(inc, 'time', 'times')}, {up['downtime_minutes']:.0f} minutes in total.")})

    # Fast?
    lcp, med, avg = ps.get("lcp_ms"), a.get("median_load_ms"), up.get("avg_ms")
    lvl = lambda v, ok_at, bad_at: 0 if not v else 2 if v > bad_at else 1 if v > ok_at else 0      # noqa: E731
    level = max(lvl(avg, 1000, 2000), lvl(lcp, 2500, 4000), lvl(med, 2500, 4000))
    if avg or lcp or med:
        parts = []
        if lcp:
            parts.append(f"On a phone, your homepage takes about {_secs(lcp)} to fully appear. Under 2.5 seconds is the goal"
                         + (", and every visitor this month used a phone." if (a.get("devices") or [("", 0, 0)])[0][0] == "Mobile" and (a["devices"][0][2] or 0) >= 99 else "."))
        if avg and not lcp:
            parts.append(f"Your server answers our checks in {_secs(avg)}.")
        if med and not lcp:
            parts.append(f"Real visitors waited a typical {_secs(med)} for a page to load.")
        label = ("Fast to load", "Could be faster", "Slow to appear")[level]
        if lcp and lvl(lcp, 2500, 4000):
            label += " on phones"
        cards.append({"id": "speed", "status": ("good", "ok", "bad")[level], "label": label, "text": " ".join(parts)})
    else:
        cards.append({"id": "speed", "status": "none", "label": "Not measured yet", "text": "Speed results appear after the first checks and audit."})

    # Visitors (shown as a tile, not a row)
    if a.get("pageviews"):
        cards.append({"id": "visitors", "status": "info", "label": "", "text": ""})
    else:
        cards.append({"id": "visitors", "status": "none", "label": "", "text": ""})

    # Secure?
    sec = scores.get("Security")
    high_sec = [i for i in (audit or {}).get("issues", []) if i["category"] == "Security" and i["severity"] == "high"]
    st = "bad" if (ssl_days is not None and ssl_days < 14) or high_sec else "ok" if dns_bad or (ssl_days is not None and ssl_days < 30) or (sec is not None and sec < 85) else "good"
    if ssl_days is None and sec is None and not dns_bad:
        cards.append({"id": "security", "status": "none", "label": "Not checked yet", "text": "Security results appear after the first audit."})
    else:
        text = []
        if dns_bad:
            text.append("Email security settings (SPF and DMARC) are missing. Without them, your messages are more likely to be marked as spam, and others can more easily send fake emails in your name.")
        elif (health or {}).get("dns"):
            text.append("Your email protection settings are in place.")
        if ssl_days is not None and not dns_bad:
            text.append(f"Your security certificate is valid for {n(ssl_days, 'more day', 'more days')}.")
        label = "Your emails could land in spam" if dns_bad and st != "bad" else {"good": "Well protected", "ok": "A few safety gaps", "bad": "Needs attention"}[st]
        cards.append({"id": "security", "status": st, "label": label, "text": " ".join(text) or "No problems found."})

    # Easy to find on Google?
    seo = scores.get("SEO")
    if seo is None:
        cards.append({"id": "search", "status": "none", "label": "Not checked yet", "text": "This appears after the first audit."})
    else:
        st = "good" if seo >= 85 else "ok" if seo >= 60 else "bad"
        k = sum(1 for i in audit["issues"] if i["category"] == "SEO")
        cards.append({"id": "search", "status": st, "label": {"good": "Easy to find on Google", "ok": "Room to improve on Google", "bad": "Hard to find on Google"}[st],
                      "text": f"We looked at {n(audit['pages'], 'page', 'pages')}. " + (f"{n(k, 'thing could', 'things could')} be improved so your pages show up better in search." if k else "Nothing needs fixing.")})

    # The things to do, grouped by what they mean to the client
    groups = {}
    for r in recs:
        if r.get("key") in HIDDEN_FROM_PRIORITIES:
            continue
        gid = r["key"] if r.get("key") in PLAIN else ("cat:" + r["area"] if "cat:" + r["area"] in PLAIN else None)
        if gid is None:
            continue
        g = groups.setdefault(gid, {"id": gid, "priority": r["priority"], "count": 0})
        g["priority"] = min(g["priority"], r["priority"])
        g["count"] += 1
    if ssl_days is not None and ssl_days <= 60 and "ssl" not in groups:
        groups["ssl"] = {"id": "ssl", "priority": 3, "count": 0}
    ordered = sorted(groups.values(), key=lambda g: (g["priority"], -g["count"]))
    todo = []
    for g in ordered[:4]:
        title, why, who, time_, where, short = PLAIN[g["id"]]
        tag = TAG[g["priority"]]
        todo.append({"title": title, "why": why, "who": who, "time": time_, "where": where, "short": short, "level": g["priority"], "tag": tag[0], "bg": tag[1], "fg": tag[2], "pill": tag[3]})
    if any(t["short"].startswith("confirming") for t in todo) and ssl_days is not None:
        for t in todo:
            if t["short"].startswith("confirming"):
                t["title"] = f"Check your security certificate renews in time (it expires in {ssl_days} days)"

    # Verdict and the short version
    judged = [c["status"] for c in cards if c["status"] in ("good", "ok", "bad")]
    bad, ok = judged.count("bad"), judged.count("ok")
    tone = "bad" if bad else "ok" if ok else "good"
    overall = scores.get("Overall")
    # How the site is doing overall, worded to follow "and": "is in very good health", "is in good health" or "needs some attention".
    health_word = None if overall is None else "is in very good health" if overall >= 90 else "is in good health" if overall >= 70 else "needs some attention"
    if u is not None and u >= 99.9:
        first = "Your website stayed online all month" + (f" and {health_word}" if health_word else "") + "."
    elif u is not None:
        first = f"Your website was online {u:.2f}% of the time" + (f" and {health_word}" if health_word else "") + "."
    else:
        first = f"Your website {health_word}." if health_word else "We are still gathering data about your website."
    steps = [t["short"] for t in todo if t["level"] <= 2][:3]
    if steps:
        joined = steps[0] if len(steps) == 1 else ", ".join(steps[:-1]) + " and " + steps[-1]
        second = f" {joined[0].upper()}{joined[1:]} {'is' if len(steps) == 1 else 'are'} the next step{'' if len(steps) == 1 else 's'}."
    elif todo:
        second = " There are a few suggestions on page 2, none of them urgent."
    else:
        second = " Nothing needs your attention right now."

    # What is working well
    wins = []
    if u is not None and u >= 99.9:
        wins.append(f"Online {'100% of the time' if u >= 99.995 else f'{u:.2f}% of the time'}")
    if avg and avg <= 500:
        wins.append(f"Your server answers quickly ({_secs(avg)})")
    for cat, text in (("Accessibility", "Easy to use for everyone"), ("Best practices", "Built to modern web standards")):
        v = scores.get(cat)
        if v is not None and v >= 90:
            wins.append(f"{text} ({'accessibility ' if cat == 'Accessibility' else ''}{v}/100)")
    desk = (((audit or {}).get("pagespeed") or {}).get("desktop") or {})
    if desk.get("lcp_ms") and desk["lcp_ms"] <= 2500:
        wins.append(f"Fast on computers ({_secs(desk['lcp_ms'])})")
    d = (health or {}).get("domain") or {}
    if d.get("days_left") is not None and d["days_left"] > 90 and d.get("expires"):
        wins.append(f"Domain name safe until {_month_year(d['expires'])}")
    sm = (health or {}).get("sitemap") or {}
    if sm.get("sitemap_url") and not sm.get("broken") and sm.get("total"):
        wins.append(f"All {sm['total']} pages Google knows about work")
    if a.get("visitors") and (deltas.get("visitors") or 0) > 0:
        wins.append(f"Visitors grew {deltas['visitors']}% on last month")
    if fixed_issues:
        wins.append(f"{n(len(fixed_issues), 'problem', 'problems')} from last time {'was' if len(fixed_issues) == 1 else 'were'} fixed")
    return {"cards": cards, "tone": tone, "short": first + second, "todo": todo, "wins": wins[:6],
            "overall": overall, "overall_word": score_word(overall)[0] if overall is not None else None, "more": max(0, len(recs) - sum(1 for r in recs if r.get("key") not in HIDDEN_FROM_PRIORITIES))}


def _month_year(iso):
    try:
        return dt.date.fromisoformat(iso[:10]).strftime("%B %Y")
    except ValueError:
        return iso


def _long_date(iso):
    try:
        d = dt.date.fromisoformat(str(iso)[:10])
        return f"{d.day} {d.strftime('%b %Y')}"
    except ValueError:
        return str(iso)


def technical_findings(recs, audit):
    """Every finding for the developer's page, most serious first: the recommendations, then the low-severity audit items."""
    sev = {1: "High", 2: "Medium", 3: "Low"}
    rows = [{"sev": sev[r["priority"]], "title": r["title"], "area": r["area"], "count": r.get("count"), "fix": r["action"], "urls": r.get("urls") or []} for r in recs]
    seen = {r["title"] for r in rows}
    for i in (audit or {}).get("issues", []):
        if i["title"] not in seen:
            rows.append({"sev": "Low" if i["severity"] == "low" else i["severity"].capitalize(), "title": i["title"], "area": i["category"], "count": i["count"], "fix": i["fix"],
                         "urls": [e["url"] for e in i["examples"][:3]]})
    order = {"High": 0, "Medium": 1, "Low": 2}
    rows.sort(key=lambda r: order.get(r["sev"], 3))
    return rows


env.globals.update(friendly_page=friendly_page, friendly_source=friendly_source, friendly_device=friendly_device, score_word=score_word)


def render(ctx):
    return env.get_template("report.html").render(**ctx)


def generate(cfg, site, year=None, month=None, pdf=False, email=False):
    if year is None:
        # Default: the month that just ended
        today = dt.date.today()
        year, month = previous_month(today.year, today.month)
    ctx = build(cfg, site, year, month)
    html = render(ctx)
    key = f"report/{site['id']}-{year}-{month:02d}"
    paths = publish(key, html, pdf or email, site.get("workspace_id"))
    if email:        # the scheduler's monthly run: remembered, so the Reports page can tell automatic reports from ones made by hand
        db.log_alert(site["id"], f"report:{year}-{month:02d}", "Monthly report created automatically")
    to = site.get("report_to") or (accounts.workspace(site.get("workspace_id")) or {}).get("alert_emails") or []
    to = accounts.filter_emails(to, "report")
    if email and to:
        attach = []
        if paths.get("pdf"):
            attach.append((os.path.basename(paths["pdf"]), paths["pdf_bytes"], "application/pdf"))
        c = ctx["client"]
        summary = f"Website report for {site['name']} – {ctx['period']}\n\n{c['short']}\n"
        if c["todo"]:
            summary += "\nWhat to do first:\n" + "\n".join(f"{i}. {t['title']} ({t['who']})" for i, t in enumerate(c["todo"], 1)) + "\n"
        alerts.send_email(cfg, to, f"Website report – {site['name']} – {ctx['period']}",
                          summary + "\nThe full report is attached.", html=html, attachments=attach)
    return paths


def publish(key, html, pdf=False, workspace_id=None):
    """Save a rendered report to file storage (Cloudinary when set up) as `key`.html and, when asked, `key`.pdf.
    Chromium needs a real file to print, so the PDF is made in a throwaway folder that is removed afterwards.
    Returns {"html": key, "pdf": key, "pdf_bytes": bytes}; the pdf entries are left out when it could not be made."""
    out = {"html": key + ".html"}
    storage.put(out["html"], html.encode("utf-8"), "text/html", workspace_id=workspace_id)
    if pdf:
        tmp = tempfile.mkdtemp(prefix="siteradar-report-")
        try:
            src = os.path.join(tmp, "report.html")
            with open(src, "w", encoding="utf-8") as f:
                f.write(html)
            to_pdf(src, os.path.join(tmp, "report.pdf"))
            with open(os.path.join(tmp, "report.pdf"), "rb") as f:
                data = f.read()
            storage.put(key + ".pdf", data, "application/pdf", workspace_id=workspace_id)
            out.update(pdf=key + ".pdf", pdf_bytes=data)
        except Exception as e:
            log.warning("PDF export unavailable (%s); sending HTML only.", e)
        finally:
            shutil.rmtree(tmp, ignore_errors=True)
    return out


def to_pdf(html_path, pdf_path):
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch()
        page = b.new_page()
        page.goto("file://" + os.path.abspath(html_path))
        page.emulate_media(media="print")
        page.evaluate("document.querySelectorAll('details').forEach(d => d.open = true)")
        page.pdf(path=pdf_path, format="A4", print_background=True, prefer_css_page_size=True,
                 margin={"top": "0", "bottom": "0", "left": "0", "right": "0"})
        b.close()
    return pdf_path
