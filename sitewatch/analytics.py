"""Privacy-friendly analytics: no cookies, no personal data stored.

Visitors are counted with a daily-rotating hash of (salt, date, site, IP, user-agent), so the
same person is one visitor per day but can't be tracked across days or identified. This is
the same approach used by Plausible/Fathom and generally avoids needing a cookie banner
under GDPR (check with your own legal advisor).
"""
import hashlib
import os
import re
import time
from collections import Counter
from urllib.parse import urlparse, parse_qs

from . import db

TRACKER_JS = r"""(function(){
  var s=document.currentScript, site=s.getAttribute('data-site'), ep=s.src.replace(/\/t\.js.*$/,'/collect');
  if(navigator.doNotTrack==='1') return;
  function send(){
    var nav=performance.getEntriesByType&&performance.getEntriesByType('navigation')[0];
    var d={s:site,p:location.pathname+location.search,r:document.referrer,w:window.innerWidth,
           l:nav?Math.round(nav.loadEventEnd||nav.domContentLoadedEventEnd||0):0};
    var b=JSON.stringify(d);
    if(navigator.sendBeacon){navigator.sendBeacon(ep,new Blob([b],{type:'text/plain'}));}
    else{var x=new XMLHttpRequest();x.open('POST',ep);x.send(b);}
  }
  if(document.readyState==='complete') setTimeout(send,0); else addEventListener('load',function(){setTimeout(send,0);});
  var push=history.pushState; if(push){history.pushState=function(){push.apply(this,arguments);setTimeout(send,0);};
    addEventListener('popstate',send);}
})();"""

BOTS = re.compile(r"bot|crawl|spider|slurp|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python-requests", re.I)


def _salt(data_dir):
    path = os.path.join(data_dir, ".salt")
    if not os.path.exists(path):
        with open(path, "w") as f:
            f.write(os.urandom(16).hex())
    return open(path).read().strip()


def parse_ua(ua):
    ua = ua or ""
    if re.search(r"iPad|Tablet", ua):
        device = "Tablet"
    elif re.search(r"Mobi|Android|iPhone", ua):
        device = "Mobile"
    else:
        device = "Desktop"
    for name, pat in [("Edge", "Edg/"), ("Opera", "OPR/"), ("Samsung Internet", "SamsungBrowser"),
                      ("Chrome", "Chrome/"), ("Firefox", "Firefox/"), ("Safari", "Safari/")]:
        if pat in ua:
            browser = name
            break
    else:
        browser = "Other"
    for name, pat in [("iOS", "iPhone|iPad"), ("Android", "Android"), ("Windows", "Windows"),
                      ("macOS", "Mac OS X"), ("Linux", "Linux")]:
        if re.search(pat, ua):
            os_name = name
            break
    else:
        os_name = "Other"
    return device, browser, os_name


def record_hit(data_dir, site, payload, ip, ua):
    if not ua or BOTS.search(ua):
        return False
    path = str(payload.get("p") or "/")[:500]
    ref = str(payload.get("r") or "")[:500]
    site_host = urlparse(site["url"]).hostname or ""
    ref_host = urlparse(ref).hostname or ""
    ref_host = ref_host[4:] if ref_host.startswith("www.") else ref_host
    if not ref_host or ref_host == site_host.removeprefix("www."):
        ref_host = ""           # internal navigation or direct
    qs = parse_qs(urlparse(path).query)
    day = time.strftime("%Y-%m-%d")
    visitor = hashlib.sha256(f"{_salt(data_dir)}|{day}|{site['id']}|{ip}|{ua}".encode()).hexdigest()[:16]
    device, browser, os_name = parse_ua(ua)
    try:
        width = int(payload.get("w") or 0)
        load_ms = int(payload.get("l") or 0)
    except (TypeError, ValueError):
        width = load_ms = 0
    if device == "Desktop" and 0 < width < 768:
        device = "Mobile"
    db.run("""INSERT INTO hits(site_id, ts, path, referrer, visitor, device, browser, os, screen,
              utm_source, utm_medium, utm_campaign, load_ms) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
           (site["id"], time.time(), urlparse(path).path or "/", ref_host, visitor, device, browser, os_name,
            width, (qs.get("utm_source") or [None])[0], (qs.get("utm_medium") or [None])[0],
            (qs.get("utm_campaign") or [None])[0], load_ms if 0 < load_ms < 120000 else None))
    return True


def summary(site_id, since, until, top=10):
    hits = db.q("SELECT * FROM hits WHERE site_id=? AND ts>=? AND ts<? ORDER BY ts", (site_id, since, until))
    if not hits:
        return {"pageviews": 0, "visitors": 0}
    by_visit = {}
    for h in hits:
        # A "visit" = same daily visitor hash; 30 minutes of inactivity starts a new visit.
        key = h["visitor"]
        v = by_visit.get(key)
        if v and h["ts"] - v[-1][-1]["ts"] < 1800:
            v[-1].append(h)
        else:
            by_visit.setdefault(key, []).append([h])
    visits = [v for lst in by_visit.values() for v in lst]
    bounces = sum(1 for v in visits if len(v) == 1)
    durations = [v[-1]["ts"] - v[0]["ts"] for v in visits if len(v) > 1]
    entry_pages = Counter(v[0]["path"] for v in visits)
    exits = Counter(v[-1]["path"] for v in visits)
    loads = sorted(h["load_ms"] for h in hits if h["load_ms"])
    daily = Counter(time.strftime("%Y-%m-%d", time.localtime(h["ts"])) for h in hits)
    daily_vis = {}
    for h in hits:
        daily_vis.setdefault(time.strftime("%Y-%m-%d", time.localtime(h["ts"])), set()).add(h["visitor"])

    def pct(counter):
        total = sum(counter.values()) or 1
        return [(k, n, round(100 * n / total)) for k, n in counter.most_common(top)]

    return {
        "pageviews": len(hits),
        "visitors": len({(h["visitor"]) for h in hits}),
        "visits": len(visits),
        "pages_per_visit": round(len(hits) / len(visits), 1),
        "bounce_rate": round(100 * bounces / len(visits)),
        "avg_visit_seconds": round(sum(durations) / len(durations)) if durations else 0,
        "median_load_ms": loads[len(loads) // 2] if loads else None,
        "top_pages": Counter(h["path"] for h in hits).most_common(top),
        "entry_pages": entry_pages.most_common(5),
        "exit_pages": exits.most_common(5),
        "referrers": pct(Counter(v[0]["referrer"] or "Direct / none" for v in visits)),
        "devices": pct(Counter(h["device"] for h in hits)),
        "browsers": pct(Counter(h["browser"] for h in hits)),
        "os": pct(Counter(h["os"] for h in hits)),
        "campaigns": Counter(f"{h['utm_source']} / {h['utm_medium'] or '-'} / {h['utm_campaign'] or '-'}"
                             for h in (v[0] for v in visits) if h["utm_source"]).most_common(5),
        "daily": sorted(daily.items()),
        "daily_visitors": sorted((d, len(s)) for d, s in daily_vis.items()),
        "slow_pages": _slow_pages(hits),
    }


def _slow_pages(hits):
    by = {}
    for h in hits:
        if h["load_ms"]:
            by.setdefault(h["path"], []).append(h["load_ms"])
    rows = [(p, sorted(v)[len(v) // 2], len(v)) for p, v in by.items() if len(v) >= 3]
    return sorted([r for r in rows if r[1] > 2500], key=lambda r: -r[1])[:5]
