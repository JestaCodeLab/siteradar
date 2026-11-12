"""Reviewed text changes for a website: an AI draft is shown to the customer, who edits and approves it, and the connector (the WordPress plugin) applies it.

States of one change: draft (written, waiting for the customer), approved (switched on, the plugin has not confirmed), applied (the plugin confirmed),
failed (the plugin could not, with the reason), reverting (undo asked), reverted, skipped. Nothing reaches the website before approval, and the previous
value is kept by the plugin so every change can be undone."""
import re
import secrets
import time
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup

from . import ai, db, events, netguard

FIELDS = {"desc_missing": "desc", "desc_length": "desc", "title_missing": "title", "title_length": "title", "title_duplicate": "title", "img_alt": "alt"}
LABEL = {"desc": "meta description", "title": "page title", "alt": "image alt text"}
KEEP = 300                      # changes remembered per website


def _load(site_id):
    return db.kv_get(f"edits:{site_id}") or {"items": {}}


def _save(site_id, s):
    items = s["items"]
    if len(items) > KEEP:       # forget the oldest finished ones
        done = sorted((i for i in items.values() if i["status"] in ("applied", "reverted", "skipped", "failed")), key=lambda i: i["updated"])
        for i in done[: len(items) - KEEP]:
            items.pop(i["id"], None)
    db.kv_set(f"edits:{site_id}", s)


def _host(u):
    return (urlparse(u).hostname or "").removeprefix("www.").lower()


def read_page(site, url):
    """The parts of a page the model needs. Only pages of the website itself are fetched."""
    if _host(url) != _host(site["url"]):
        raise ai.AIError("That page is not on this website.")
    try:
        r = netguard.get(url, timeout=15, headers={"User-Agent": "SiteRadar/1.0 (+https://siteradar.com)"})
    except Exception:
        raise ai.AIError("Could not open that page to read it.")
    if r.status_code != 200:
        raise ai.AIError(f"That page answered with an error ({r.status_code}).")
    soup = BeautifulSoup(r.text[:1_500_000], "html.parser")
    title = (soup.title.string or "").strip() if soup.title and soup.title.string else ""
    h1 = soup.find("h1")
    desc = soup.find("meta", attrs={"name": re.compile("^description$", re.I)})
    for t in soup(["script", "style", "noscript", "nav", "footer", "header", "form"]):
        t.decompose()
    body = soup.find("main") or soup.body or soup
    text = re.sub(r"\s+", " ", body.get_text(" ")).strip()
    images = []
    for img in soup.find_all("img"):
        src = (img.get("src") or img.get("data-src") or "").strip()
        if src and img.get("alt") is None and not src.startswith("data:") and not src.lower().split("?")[0].endswith(".svg"):
            full = urljoin(r.url, src)
            if full not in images:
                images.append(full)
    return {"url": r.url, "title": title, "h1": h1.get_text(" ", strip=True) if h1 else "", "description": (desc.get("content") or "").strip() if desc else "",
            "text": text, "images": images}


def targets(site_id, rule):
    """The pages the latest audit found this problem on, each with its change if there is one."""
    au = db.latest_audit(site_id)
    issue = next((i for i in (au["issues"] if au else []) if i["rule"] == rule), None)
    items = list(_load(site_id)["items"].values())
    pages = []
    for ex in (issue.get("examples") if issue else None) or []:
        field = FIELDS[rule]
        mine = sorted((i for i in items if i["url"] == ex["url"] and i["field"] == field), key=lambda i: -i["created"])
        pages.append({"url": ex["url"], "detail": ex.get("detail") or "", "item": mine[0] if mine else None})
    return {"field": FIELDS[rule], "label": LABEL[FIELDS[rule]], "count": issue["count"] if issue else 0, "pages": pages}


def write_draft(ws, site, rule, url, who):
    """Read the page and have the AI write one change for it. Costs one credit."""
    field = FIELDS[rule]
    page = read_page(site, url)
    item = {"id": secrets.token_hex(6), "rule": rule, "field": field, "url": url, "status": "draft", "who": who, "created": time.time(), "updated": time.time(),
            "current": page["description"] if field == "desc" else page["title"] if field == "title" else ""}
    if field == "alt":
        r = ai.draft_alt(ws, site["id"], page, page["images"])
        item["alts"] = r["alts"]
    else:
        r = ai.draft(ws, site["id"], field, page)
        item["text"] = r["text"]
    s = _load(site["id"])
    s["items"][item["id"]] = item
    _save(site["id"], s)
    events.record(site["id"], "ai", f"AI wrote a {LABEL[field]} draft", url, who=who)
    return item, r["credits_left"]


def _get(s, item_id):
    item = s["items"].get(item_id)
    if not item:
        raise ValueError("That change was not found. Reload the page.")
    return item


def edit(site_id, item_id, text=None, alts=None):
    s = _load(site_id)
    item = _get(s, item_id)
    if item["status"] != "draft":
        raise ValueError("Only a draft can be edited.")
    if item["field"] == "alt":
        have = {a["src"] for a in item.get("alts", [])}
        item["alts"] = [{"src": a["src"], "alt": (a["alt"] or "").strip()[:200]} for a in (alts or []) if a.get("src") in have]
    else:
        item["text"] = (text or "").strip()[: 320 if item["field"] == "desc" else 120]
    item["updated"] = time.time()
    _save(site_id, s)
    return item


def set_status(site_id, item_id, status, who):
    """approve -> approved, skip -> skipped, undo -> reverting (only after the plugin applied it)."""
    s = _load(site_id)
    item = _get(s, item_id)
    ok = {"approved": ("draft", "failed"), "skipped": ("draft", "failed"), "reverting": ("applied", "approved")}[status]
    if item["status"] not in ok:
        raise ValueError("That change cannot be changed now.")
    if status == "approved" and ((item["field"] == "alt" and not any(a["alt"] for a in item.get("alts", []))) or (item["field"] != "alt" and not item.get("text"))):
        raise ValueError("Write the text first.")
    item["status"], item["updated"], item["error"] = status, time.time(), ""
    _save(site_id, s)
    events.record(site_id, "ai", {"approved": "Approved a", "skipped": "Skipped a", "reverting": "Asked to undo a"}[status] + f" {LABEL[item['field']]} change",
                  item["url"], who=who, level="warn" if status == "reverting" else "info")
    return item


def pending(site_id):
    """What the plugin should apply (or take back) the next time it checks in."""
    out = []
    for i in _load(site_id)["items"].values():
        if i["status"] == "approved":
            out.append({"id": i["id"], "field": i["field"], "url": i["url"], "revert": False, **({"alts": [a for a in i["alts"] if a["alt"]]} if i["field"] == "alt" else {"text": i["text"]})})
        elif i["status"] == "reverting":
            out.append({"id": i["id"], "field": i["field"], "url": i["url"], "revert": True, "previous": i.get("previous"), **({"alts": i.get("applied_alts", [])} if i["field"] == "alt" else {})})
    return out[:20]


def report(site_id, results):
    """The plugin says what it did: [{id, ok, previous, applied_alts, error}]."""
    s = _load(site_id)
    for r in results[:50]:
        item = s["items"].get(str(r.get("id")))
        if not item:
            continue
        was = item["status"]
        if was not in ("approved", "reverting"):
            continue
        if r.get("ok"):
            item["status"] = "applied" if was == "approved" else "reverted"
            if was == "approved":
                item["previous"] = r.get("previous")
                item["applied_alts"] = [a for a in (r.get("applied_alts") or []) if isinstance(a, dict)][:MAX_ALTS]
        else:
            item["status"] = "failed" if was == "approved" else "applied"
            item["error"] = str(r.get("error") or "The plugin could not apply it.")[:200]
        item["updated"] = time.time()
        events.record(site_id, "ai", f"The plugin {'applied' if r.get('ok') and was == 'approved' else 'undid' if r.get('ok') else 'could not apply'} a {LABEL[item['field']]} change",
                      item["url"] + ("" if r.get("ok") else f" ({item['error']})"), level="ok" if r.get("ok") else "warn")
    _save(site_id, s)


MAX_ALTS = 10
