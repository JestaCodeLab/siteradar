"""One-click fixes for audit findings, applied by the website's connector (today: the WordPress plugin).

SiteRadar never writes to the customer's website. A fix is a switch in SiteRadar: the plugin reads the list of switched-on fixes the next time
it checks in (SiteRadar also nudges it so that is almost at once), applies them, and reports back what is really active. A fix shows as
"applied" only once the plugin has confirmed it, and every change is recorded in a log. Undo switches it off again.

Only fixes that are the same for the whole website live here. Fixes that need text written per page (titles, meta descriptions, alt text)
come later, with a review step."""
import time

from . import db, events

# audit rule -> (setting the plugin understands, button label, what it does in plain words, needs a confirmation first)
CATALOG = {
    "no_hsts": ("hsts", "Turn on HSTS",
                "Tells browsers to use only the secure https address of this website for the next year. Only turn it on if every page of the website works over https.", True),
    "no_xcto": ("nosniff", "Add the header",
                "Adds X-Content-Type-Options: nosniff, which stops browsers from guessing file types.", False),
    "no_frame": ("frame", "Add the header",
                 "Adds X-Frame-Options: SAMEORIGIN, so other websites cannot show this one inside a frame (clickjacking). Pages of this website can still frame each other.", False),
    "no_referrer_policy": ("referrer", "Add the header",
                           "Adds Referrer-Policy: strict-origin-when-cross-origin, which stops visitors' full page addresses being passed on to other websites.", False),
    "server_leak": ("hide_php", "Hide the PHP version",
                    "Removes the X-Powered-By header that shows the PHP version. If the version is in the Server header instead, your hosting company has to change that.", False),
    "no_viewport": ("viewport", "Add the viewport tag",
                    "Adds the tag that makes pages fit a phone screen. Only turn it on if your theme does not add it.", False),
    "og_missing": ("og", "Add social sharing tags",
                   "Adds Open Graph tags (title, description, image) so links shared on social networks and chat apps look right. Skipped when an SEO plugin already adds them.", False),
    "schema_missing": ("schema", "Add structured data",
                       "Adds schema.org data about your organisation, website and pages for search engines. Skipped when an SEO plugin already adds it.", False),
    "canonical_missing": ("canonical", "Add the canonical tag",
                          "Adds the canonical link tag, which tells search engines the main address of each page. Skipped when an SEO plugin already adds it.", False),
    "robots_missing": ("robots", "Add a robots.txt",
                       "Serves a robots.txt that points search engines to your sitemap. It only works when the request reaches WordPress, so a host that blocks it needs to change that. Skipped when an SEO plugin or a real robots.txt file exists.", False),
    "sitemap_missing": ("sitemap", "Add the sitemap address",
                        "Makes /sitemap.xml lead to the sitemap WordPress already builds at /wp-sitemap.xml. Skipped when an SEO plugin or a real sitemap.xml file exists.", False),
    "no_lazy": ("lazy", "Lazy-load images",
                "Makes images below the first screen load only when a visitor scrolls to them, so pages open faster. The first three images still load straight away. If you use a caching plugin, clear its cache afterwards.", False),
    "mixed_content": ("https_links", "Use secure links",
                      "Changes http:// links to your own website into https:// on every page. It does not change links to other websites, so one of those can still leave this finding open. If you use a caching plugin, clear its cache afterwards.", False),
}
SETTINGS = {v[0] for v in CATALOG.values()}


def _load(site_id):
    s = db.kv_get(f"fixes:{site_id}") or {}
    return {"enabled": s.get("enabled") or {}, "applied": s.get("applied") or {}, "log": s.get("log") or []}


def enabled(site_id):
    """The settings the plugin should have switched on."""
    return sorted(k for k in _load(site_id)["enabled"] if k in SETTINGS)


def report(site_id, active):
    """The plugin says which fixes are really active on the website."""
    s = _load(site_id)
    active = {k for k in (active or []) if k in SETTINGS}
    now = time.time()
    fresh = [k for k in active if k not in s["applied"] and k in s["enabled"]]
    s["applied"] = {k: s["applied"].get(k, now) for k in active}
    db.kv_set(f"fixes:{site_id}", s)
    for k in fresh:
        rule = next(r for r, v in CATALOG.items() if v[0] == k)
        events.record(site_id, "fix", f"The plugin confirmed the fix: {_title(rule)}", "It is now active on the website.", level="ok")


def _title(rule):
    return RULE_NAMES.get(rule, rule)


RULE_NAMES = {"no_hsts": "HSTS header", "no_xcto": "X-Content-Type-Options header", "no_frame": "X-Frame-Options header",
              "no_referrer_policy": "Referrer-Policy header", "server_leak": "hide the PHP version", "no_viewport": "viewport tag",
              "og_missing": "social sharing tags", "schema_missing": "structured data", "canonical_missing": "canonical tag", "robots_missing": "robots.txt",
              "sitemap_missing": "sitemap address", "no_lazy": "lazy-loading images", "mixed_content": "secure links"}


def set_enabled(site_id, rule, on, who=""):
    """Switch a fix on or off. Returns False for a rule that has no fix."""
    if rule not in CATALOG:
        return False
    key = CATALOG[rule][0]
    s = _load(site_id)
    if on:
        s["enabled"][key] = time.time()
    else:
        s["enabled"].pop(key, None)
        s["applied"].pop(key, None)
    s["log"] = ([{"t": time.time(), "who": who, "rule": rule, "action": "apply" if on else "undo"}] + s["log"])[:100]
    db.kv_set(f"fixes:{site_id}", s)
    events.record(site_id, "fix", f"{'Applied' if on else 'Undid'} the fix: {_title(rule)}",
                  "Waiting for the plugin to apply it." if on else "Switched off again.", who=who, level="info" if on else "warn")
    return True


def listing(site_id):
    """Every available fix with where it stands: available, queued (switched on, the plugin has not confirmed yet) or applied."""
    from .auditor import RULES        # the finding's own wording and severity, so a fixed issue can still be listed after the audit stops reporting it
    s = _load(site_id)
    items = {}
    for rule, (key, label, what, confirm) in CATALOG.items():
        state = "applied" if key in s["applied"] and key in s["enabled"] else "queued" if key in s["enabled"] else "available"
        _cat, sev, title, how = RULES.get(rule, ("", "low", rule, ""))
        items[rule] = {"title": title, "severity": sev, "issue_fix": how, "label": label, "what": what, "confirm": confirm, "state": state,
                       "since": s["applied"].get(key) if state == "applied" else s["enabled"].get(key)}
    return items, s["log"][:10]
