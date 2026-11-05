"""Site audit: crawls the site and checks SEO, performance, security, accessibility and
best practices. Every finding comes with a plain-language fix.

Optional: if `pagespeed_api_key` is set, Google PageSpeed Insights adds Core Web Vitals
(LCP, CLS, INP) measured from real Chrome users.
"""
import json
import logging
import re
import time
from collections import defaultdict, deque
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urljoin, urlparse, urldefrag

import requests
from bs4 import BeautifulSoup

from . import db

log = logging.getLogger("sitewatch.audit")
UA = "Mozilla/5.0 (compatible; SiteRadar-Audit/1.0)"
SEVERITY_WEIGHT = {"high": 15, "medium": 7, "low": 3}
CATEGORIES = ["SEO", "Performance", "Security", "Accessibility", "Best practices"]

# Each rule: id -> (category, severity, title, how to fix)
RULES = {
    # SEO
    "title_missing": ("SEO", "high", "Pages without a <title>",
        "Give every page a unique, descriptive title of 30–60 characters, with the main keyword near the start."),
    "title_length": ("SEO", "low", "Titles too short or too long",
        "Keep titles 30–60 characters so Google shows them in full and they say clearly what the page is about."),
    "title_duplicate": ("SEO", "medium", "Several pages share the same title",
        "Write a distinct title per page; duplicates make pages compete with each other in search."),
    "desc_missing": ("SEO", "medium", "Pages without a meta description",
        "Add a 120–160 character meta description that summarises the page and invites the click."),
    "desc_length": ("SEO", "low", "Meta descriptions too short or too long",
        "Aim for 70–160 characters; longer text is cut off in search results."),
    "desc_duplicate": ("SEO", "low", "Several pages share the same meta description",
        "Make each description specific to its page."),
    "h1_missing": ("SEO", "medium", "Pages without an H1 heading",
        "Add one H1 per page stating the page's main topic."),
    "h1_multiple": ("SEO", "low", "Pages with more than one H1",
        "Use a single H1 and structure the rest with H2/H3."),
    "canonical_missing": ("SEO", "low", "No canonical URL",
        "Add <link rel=\"canonical\" href=\"…\"> so search engines know the preferred URL and don't index duplicates."),
    "noindex": ("SEO", "high", "Pages blocked from Google (noindex)",
        "Remove the noindex robots tag/header from pages that should appear in search. Ignore if intentional."),
    "thin_content": ("SEO", "low", "Pages with very little text (<250 words)",
        "Expand key pages with useful, original content; thin pages rarely rank."),
    "og_missing": ("SEO", "low", "No social sharing tags (Open Graph)",
        "Add og:title, og:description and og:image so links look good on LinkedIn, Facebook, WhatsApp etc."),
    "schema_missing": ("SEO", "low", "No structured data (schema.org) found",
        "Add JSON-LD structured data (Organization, LocalBusiness, Product, Article, FAQ…) to qualify for rich results."),
    "robots_missing": ("SEO", "medium", "No robots.txt",
        "Create /robots.txt and reference your sitemap in it."),
    "robots_blocks_all": ("SEO", "high", "robots.txt blocks the whole site",
        "Remove 'Disallow: /' for User-agent: * unless the site is intentionally hidden."),
    "sitemap_missing": ("SEO", "medium", "No XML sitemap found",
        "Publish /sitemap.xml listing all indexable pages and submit it in Google Search Console."),
    "broken_internal": ("SEO", "high", "Broken internal links",
        "Fix or redirect (301) the links listed; broken links waste crawl budget and frustrate visitors."),
    "broken_external": ("Best practices", "medium", "Broken outbound links",
        "Update or remove links to external pages that no longer exist."),
    "soft_404": ("SEO", "medium", "Missing pages return status 200 (soft 404)",
        "Configure the server to return HTTP 404 for pages that don't exist."),
    "url_style": ("SEO", "low", "URLs with uppercase letters, underscores or excessive length",
        "Use short, lowercase, hyphen-separated URLs."),
    "redirect_chain": ("Performance", "low", "Internal links pointing at redirects",
        "Link directly to the final URL to save a round-trip."),
    # Performance
    "slow_ttfb": ("Performance", "medium", "Slow server response (>800 ms)",
        "Enable page caching (or a CDN), upgrade hosting, and optimise slow database queries/plugins."),
    "no_compression": ("Performance", "medium", "HTML not compressed",
        "Enable gzip or Brotli compression on the web server."),
    "html_heavy": ("Performance", "low", "Very large HTML (>300 KB)",
        "Reduce inline scripts/styles and page-builder bloat."),
    "too_many_scripts": ("Performance", "low", "Many JavaScript files (>15)",
        "Remove unused plugins/scripts and bundle the rest."),
    "render_blocking": ("Performance", "low", "Render-blocking scripts in <head>",
        "Add defer or async to scripts in the head, or move them to the end of the body."),
    "big_images": ("Performance", "medium", "Large images (>300 KB)",
        "Resize images to their displayed size and compress them; use WebP or AVIF."),
    "no_lazy": ("Performance", "low", "Images not lazy-loaded",
        "Add loading=\"lazy\" to images below the fold."),
    "legacy_images": ("Performance", "low", "No modern image formats used",
        "Serve WebP/AVIF versions of JPG/PNG images (most CMSs have a plugin for this)."),
    "no_cache": ("Performance", "medium", "Static files without browser caching",
        "Set Cache-Control: max-age (e.g. 1 year for versioned CSS/JS/images)."),
    # Security
    "no_https": ("Security", "high", "Site not served over HTTPS",
        "Install a TLS certificate (free via Let's Encrypt) and redirect all traffic to https://."),
    "http_no_redirect": ("Security", "high", "http:// does not redirect to https://",
        "Add a permanent (301) redirect from http to https."),
    "mixed_content": ("Security", "high", "Insecure (http://) resources on HTTPS pages",
        "Load every image, script and stylesheet over https://."),
    "no_hsts": ("Security", "medium", "No HSTS header",
        "Add Strict-Transport-Security: max-age=31536000; includeSubDomains."),
    "no_csp": ("Security", "low", "No Content-Security-Policy",
        "Add a Content-Security-Policy header to limit where scripts can load from (start in report-only mode)."),
    "no_xcto": ("Security", "low", "Missing X-Content-Type-Options",
        "Add X-Content-Type-Options: nosniff."),
    "no_frame": ("Security", "low", "Site can be embedded in other sites (clickjacking)",
        "Add X-Frame-Options: SAMEORIGIN or CSP frame-ancestors 'self'."),
    "no_referrer_policy": ("Security", "low", "Missing Referrer-Policy",
        "Add Referrer-Policy: strict-origin-when-cross-origin."),
    "server_leak": ("Security", "low", "Server reveals software versions",
        "Hide version numbers in the Server / X-Powered-By headers."),
    "exposed_files": ("Security", "high", "Sensitive files publicly accessible",
        "Block public access to these files immediately (and rotate any secrets they contain)."),
    "ssl_expiring": ("Security", "high", "SSL certificate expires soon",
        "Renew the certificate or check that auto-renewal works."),
    # Accessibility
    "img_alt": ("Accessibility", "medium", "Images without alt text",
        "Describe each meaningful image in its alt attribute (use alt=\"\" for decorative images)."),
    "lang_missing": ("Accessibility", "low", "No language set on <html>",
        "Add lang=\"en\" (or nl, de…) to the <html> tag so screen readers pronounce text correctly."),
    "form_labels": ("Accessibility", "medium", "Form fields without labels",
        "Connect a <label> (or aria-label) to every input so screen-reader and voice users can fill in forms."),
    "empty_links": ("Accessibility", "low", "Links or buttons with no text",
        "Give icon-only links/buttons an aria-label describing what they do."),
    # Best practices
    "no_viewport": ("Best practices", "high", "Not mobile-friendly (no viewport tag)",
        "Add <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">."),
    "no_favicon": ("Best practices", "low", "No favicon",
        "Add a favicon so the site is recognisable in browser tabs and bookmarks."),
    "server_errors": ("Best practices", "high", "Pages returning server errors (5xx)",
        "Check server logs for these URLs; they are failing for visitors."),
    "no_analytics_consent": ("Best practices", "low", "No privacy/cookie policy link found",
        "Link a privacy policy from the footer (required under GDPR if you collect any data)."),
}

EXPOSED_PATHS = ["/.git/HEAD", "/.env", "/wp-config.php.bak", "/.DS_Store", "/backup.zip", "/phpinfo.php"]


def _plan_pages(cfg, site):
    from . import accounts, plans
    ws = accounts.workspace((site or {}).get("workspace_id"))
    return plans.limits(ws)["audit_pages"] if ws else int(cfg["audit"]["max_pages"])


class Auditor:
    def __init__(self, cfg, site):
        self.cfg, self.site = cfg, site
        self.base = site["url"]
        self.host = urlparse(self.base).hostname
        self.s = requests.Session()
        self.s.headers["User-Agent"] = UA
        self.timeout = cfg["timeout_seconds"]
        self.findings = defaultdict(list)    # rule -> list of (url, detail)
        self.pages = {}                      # url -> page info
        self.link_sources = defaultdict(set) # target url -> pages linking to it
        self.external = defaultdict(set)
        self.assets = {"img": set(), "static": set()}

    def flag(self, rule, url="", detail=""):
        self.findings[rule].append((url, detail))

    def same_site(self, url):
        h = urlparse(url).hostname or ""
        return h.removeprefix("www.") == (self.host or "").removeprefix("www.")

    def norm(self, url):
        url = urldefrag(url)[0]
        u = urlparse(url)
        if not u.path:
            url = u._replace(path="/").geturl()
        elif url.endswith("/") and u.path != "/":
            url = url[:-1]
        return url

    # -- crawl ----------------------------------------------------------
    def crawl(self):
        max_pages = _plan_pages(self.cfg, self.site)
        queue, seen = deque([self.norm(self.base)]), {self.norm(self.base)}
        while queue and len(self.pages) < max_pages:
            url = queue.popleft()
            for link in self.fetch_page(url):
                if link not in seen and len(seen) < max_pages * 4:
                    seen.add(link)
                    queue.append(link)

    def fetch_page(self, url):
        try:
            t = time.perf_counter()
            r = self.s.get(url, timeout=self.timeout, allow_redirects=True)
            ms = int((time.perf_counter() - t) * 1000)
        except Exception as e:
            self.pages[url] = {"status": None, "error": str(e)[:120]}
            return []
        info = {"status": r.status_code, "ms": ms, "final": r.url, "redirected": bool(r.history)}
        self.pages[url] = info
        ctype = r.headers.get("Content-Type", "")
        if r.status_code >= 400 or "html" not in ctype:
            return []
        if url == self.norm(self.base):
            self.home_headers = r.headers
        self.analyse_html(url, r, ms)
        info.update(self._page_meta)
        return self._page_links

    def analyse_html(self, url, r, ms):
        soup = BeautifulSoup(r.text, "html.parser")
        meta = {}
        # Title & description
        title = (soup.title.string or "").strip() if soup.title and soup.title.string else ""
        meta["title"] = title
        if not title:
            self.flag("title_missing", url)
        elif not 30 <= len(title) <= 60:
            self.flag("title_length", url, f"{len(title)} chars: “{title[:70]}”")
        desc_tag = soup.find("meta", attrs={"name": re.compile("^description$", re.I)})
        desc = (desc_tag.get("content") or "").strip() if desc_tag else ""
        meta["description"] = desc
        if not desc:
            self.flag("desc_missing", url)
        elif not 70 <= len(desc) <= 160:
            self.flag("desc_length", url, f"{len(desc)} chars")
        h1s = soup.find_all("h1")
        if not h1s:
            self.flag("h1_missing", url)
        elif len(h1s) > 1:
            self.flag("h1_multiple", url, f"{len(h1s)} H1s")
        if not soup.find("link", rel=lambda v: v and "canonical" in v):
            self.flag("canonical_missing", url)
        robots_meta = soup.find("meta", attrs={"name": re.compile("^robots$", re.I)})
        if (robots_meta and "noindex" in (robots_meta.get("content") or "").lower()) or \
                "noindex" in r.headers.get("X-Robots-Tag", "").lower():
            self.flag("noindex", url)
        text = soup.get_text(" ", strip=True)
        words = len(text.split())
        meta["words"] = words
        if words < 250:
            self.flag("thin_content", url, f"{words} words")
        if not soup.find("meta", attrs={"property": "og:title"}):
            self.flag("og_missing", url)
        meta["schema"] = bool(soup.find("script", type="application/ld+json"))
        path = urlparse(url).path
        if re.search(r"[A-Z_]", path) or len(path) > 100:
            self.flag("url_style", url)
        # Accessibility / best practice
        html = soup.find("html")
        if not html or not html.get("lang"):
            self.flag("lang_missing", url)
        if not soup.find("meta", attrs={"name": "viewport"}):
            self.flag("no_viewport", url)
        imgs = soup.find_all("img")
        no_alt = [i for i in imgs if i.get("alt") is None]
        if no_alt:
            self.flag("img_alt", url, f"{len(no_alt)} of {len(imgs)} images")
        lazy_candidates = imgs[3:]   # first few are usually above the fold
        if len(lazy_candidates) >= 3 and not any(i.get("loading") == "lazy" for i in lazy_candidates):
            self.flag("no_lazy", url, f"{len(imgs)} images")
        inputs = [i for i in soup.find_all(["input", "select", "textarea"])
                  if i.get("type") not in ("hidden", "submit", "button", "image", "reset")]
        labelled = {l.get("for") for l in soup.find_all("label")}
        unlabelled = [i for i in inputs if not (i.get("id") in labelled or i.get("aria-label")
                      or i.get("aria-labelledby") or i.find_parent("label"))]
        if unlabelled:
            self.flag("form_labels", url, f"{len(unlabelled)} fields")
        empty = [a for a in soup.find_all(["a", "button"])
                 if not a.get_text(strip=True) and not a.get("aria-label") and not a.get("title")
                 and not (a.find("img") and a.find("img").get("alt"))]
        if empty:
            self.flag("empty_links", url, f"{len(empty)} elements")
        # Performance
        if ms > 800:
            self.flag("slow_ttfb", url, f"{ms} ms")
        enc = r.headers.get("Content-Encoding", "")
        if len(r.content) > 1500 and not any(x in enc for x in ("gzip", "br", "zstd", "deflate")):
            self.flag("no_compression", url)
        if len(r.content) > 300_000:
            self.flag("html_heavy", url, f"{len(r.content) // 1024} KB")
        scripts = soup.find_all("script", src=True)
        if len(scripts) > 15:
            self.flag("too_many_scripts", url, f"{len(scripts)} scripts")
        head = soup.find("head")
        if head:
            blocking = [s for s in head.find_all("script", src=True)
                        if not s.has_attr("async") and not s.has_attr("defer") and s.get("type") != "module"]
            if blocking:
                self.flag("render_blocking", url, f"{len(blocking)} scripts")
        # Mixed content
        if url.startswith("https://"):
            insecure = [t.get("src") or t.get("href") for t in soup.find_all(["img", "script", "iframe", "link", "source"])
                        if (t.get("src") or (t.get("href") if t.name == "link" and "stylesheet" in (t.get("rel") or []) else "") or "")
                        .startswith("http://")]
            if insecure:
                self.flag("mixed_content", url, insecure[0])
        # Assets
        for i in imgs:
            src = i.get("src") or ""
            if src and not src.startswith("data:"):
                self.assets["img"].add(urljoin(r.url, src))
        for t in soup.find_all("link", rel=lambda v: v and "stylesheet" in v):
            if t.get("href"):
                self.assets["static"].add(urljoin(r.url, t["href"]))
        for s in scripts:
            self.assets["static"].add(urljoin(r.url, s["src"]))
        meta["favicon"] = bool(soup.find("link", rel=lambda v: v and "icon" in " ".join(v).lower()))
        meta["privacy_link"] = bool(soup.find("a", string=re.compile("privacy|privacybeleid|cookie|datenschutz", re.I))) or \
            bool(soup.find("a", href=re.compile("privacy|cookie", re.I)))
        # Links
        links = []
        for a in soup.find_all("a", href=True):
            href = a["href"].strip()
            if href.startswith(("mailto:", "tel:", "javascript:", "#")):
                continue
            target = self.norm(urljoin(r.url, href))
            if not target.startswith("http"):
                continue
            if self.same_site(target):
                self.link_sources[target].add(url)
                if not re.search(r"\.(pdf|jpe?g|png|gif|webp|svg|zip|docx?|xlsx?|mp4|mp3)$", target, re.I):
                    links.append(target)
            else:
                self.external[target].add(url)
        self._page_meta, self._page_links = meta, links

    # -- site-level checks ----------------------------------------------
    def site_checks(self):
        base = f"{urlparse(self.base).scheme}://{urlparse(self.base).netloc}"
        get = lambda p, **kw: self.s.get(base + p, timeout=self.timeout, **kw)
        # robots / sitemap
        sitemap_urls = [base + "/sitemap.xml", base + "/sitemap_index.xml"]
        try:
            r = get("/robots.txt")
            if r.status_code != 200 or "html" in r.headers.get("Content-Type", ""):
                self.flag("robots_missing", base + "/robots.txt")
            else:
                if re.search(r"User-agent:\s*\*\s*(?:\n(?!User-agent).*)*\nDisallow:\s*/\s*$", r.text, re.I | re.M):
                    self.flag("robots_blocks_all", base + "/robots.txt")
                sitemap_urls = re.findall(r"^Sitemap:\s*(\S+)", r.text, re.I | re.M) + sitemap_urls
        except Exception:
            self.flag("robots_missing", base + "/robots.txt")
        if not any(self._ok(u, xml=True) for u in sitemap_urls[:4]):
            self.flag("sitemap_missing", base + "/sitemap.xml")
        # soft 404
        try:
            r = get("/this-page-should-not-exist-sw-" + str(int(time.time())))
            if r.status_code == 200:
                self.flag("soft_404", r.url)
        except Exception:
            pass
        # HTTPS
        if urlparse(self.base).scheme != "https":
            self.flag("no_https", self.base)
        else:
            try:
                r = requests.get(self.base.replace("https://", "http://", 1), timeout=self.timeout,
                                 allow_redirects=True, headers={"User-Agent": UA})
                if not r.url.startswith("https://"):
                    self.flag("http_no_redirect", self.base.replace("https://", "http://", 1))
            except Exception:
                pass
            try:
                from .monitor import ssl_days_left
                d = ssl_days_left(self.base)
                if d is not None and d <= self.cfg["ssl_warning_days"]:
                    self.flag("ssl_expiring", self.base, f"{d} days left")
            except Exception:
                pass
        # security headers (homepage)
        h = getattr(self, "home_headers", None)
        if h is not None:
            if self.base.startswith("https") and "Strict-Transport-Security" not in h:
                self.flag("no_hsts", self.base)
            csp = h.get("Content-Security-Policy", "")
            if not csp:
                self.flag("no_csp", self.base)
            if h.get("X-Content-Type-Options", "").lower() != "nosniff":
                self.flag("no_xcto", self.base)
            if "X-Frame-Options" not in h and "frame-ancestors" not in csp:
                self.flag("no_frame", self.base)
            if "Referrer-Policy" not in h:
                self.flag("no_referrer_policy", self.base)
            leak = " ".join(filter(None, [h.get("Server"), h.get("X-Powered-By")]))
            if re.search(r"\d+\.\d+", leak):
                self.flag("server_leak", self.base, leak)
        # exposed files
        for p in EXPOSED_PATHS:
            try:
                r = get(p, allow_redirects=False)
                body = r.text[:200]
                if r.status_code == 200 and "html" not in r.headers.get("Content-Type", "") and body.strip():
                    if p == "/.git/HEAD" and "ref:" not in body:
                        continue
                    self.flag("exposed_files", base + p)
            except Exception:
                pass
        # Page-derived site checks
        html_pages = {u: p for u, p in self.pages.items() if "title" in p}
        for key, rule in (("title", "title_duplicate"), ("description", "desc_duplicate")):
            groups = defaultdict(list)
            for u, p in html_pages.items():
                if p.get(key):
                    groups[p[key]].append(u)
            for val, urls in groups.items():
                if len(urls) > 1:
                    for u in urls:
                        self.flag(rule, u, f"“{val[:60]}” used on {len(urls)} pages")
        if html_pages and not any(p.get("schema") for p in html_pages.values()):
            self.flag("schema_missing", self.base)
        if html_pages and not any(p.get("favicon") for p in html_pages.values()):
            try:
                if get("/favicon.ico").status_code != 200:
                    self.flag("no_favicon", self.base)
            except Exception:
                pass
        if html_pages and not any(p.get("privacy_link") for p in html_pages.values()):
            self.flag("no_analytics_consent", self.base)

    def _ok(self, url, xml=False):
        try:
            r = self.s.get(url, timeout=self.timeout)
            return r.status_code == 200 and (not xml or "<urlset" in r.text or "<sitemapindex" in r.text)
        except Exception:
            return False

    def link_checks(self):
        # internal pages that we crawled
        for url, p in self.pages.items():
            st = p.get("status")
            if st is None or st >= 400:
                for src in list(self.link_sources.get(url, []))[:5] or [""]:
                    rule = "server_errors" if st and st >= 500 else "broken_internal"
                    self.flag(rule, url, f"HTTP {st or p.get('error')} — linked from {src or 'start URL'}")
            elif p.get("redirected") and url in self.link_sources and p.get("final", "").rstrip("/") != url.rstrip("/"):
                self.flag("redirect_chain", url, f"→ {p['final']}")
        # internal links not crawled (beyond page limit) + external links: HEAD in parallel
        extra_internal = [u for u in self.link_sources if u not in self.pages][:100]
        external = list(self.external)[:60]

        def status(u):
            try:
                r = self.s.head(u, timeout=10, allow_redirects=True)
                if r.status_code in (403, 405, 429) or r.status_code >= 500:
                    r = self.s.get(u, timeout=10, allow_redirects=True, stream=True)
                    r.close()
                return u, r.status_code
            except Exception:
                return u, None

        with ThreadPoolExecutor(8) as ex:
            for u, st in ex.map(status, extra_internal):
                if st is None or st >= 400:
                    self.flag("broken_internal", u, f"HTTP {st or 'no response'} — linked from {next(iter(self.link_sources[u]))}")
            for u, st in ex.map(status, external):
                # 401/403/429 often mean "bot blocked", not broken
                if st is None or st in (404, 410) or (st and st >= 500):
                    self.flag("broken_external", u, f"{'HTTP ' + str(st) if st else 'unreachable'} — on {next(iter(self.external[u]))}")

    def asset_checks(self):
        imgs = list(self.assets["img"])[:40]
        statics = [u for u in self.assets["static"] if self.same_site(u)][:15]

        def head(u):
            try:
                return u, self.s.head(u, timeout=10, allow_redirects=True)
            except Exception:
                return u, None

        with ThreadPoolExecutor(8) as ex:
            img_results = list(ex.map(head, imgs))
            static_results = list(ex.map(head, statics))
        big = [(u, int(r.headers.get("Content-Length", 0))) for u, r in img_results
               if r is not None and int(r.headers.get("Content-Length", 0) or 0) > 300_000]
        for u, size in sorted(big, key=lambda x: -x[1])[:10]:
            self.flag("big_images", u, f"{size // 1024} KB")
        if imgs and not any(re.search(r"\.(webp|avif)(\?|$)", u, re.I) for u in imgs) and \
                not any(r is not None and re.search("webp|avif", r.headers.get("Content-Type", "")) for _, r in img_results):
            self.flag("legacy_images", self.base, f"{len(imgs)} images checked")
        uncached = [u for u, r in static_results + [x for x in img_results if self.same_site(x[0])][:10]
                    if r is not None and r.status_code == 200 and not re.search(
                        r"max-age=[1-9]|immutable", r.headers.get("Cache-Control", "")) and not r.headers.get("Expires")]
        for u in uncached[:10]:
            self.flag("no_cache", u)

    def _pagespeed(self, strategy):
        key = self.cfg.get("pagespeed_api_key")
        try:
            r = requests.get("https://www.googleapis.com/pagespeedonline/v5/runPagespeed",
                             params={"url": self.base, "strategy": strategy, **({"key": key} if key else {}),
                                     "category": ["performance", "seo", "accessibility", "best-practices"]},
                             timeout=120)
            d = r.json()
            if "lighthouseResult" not in d:
                raise RuntimeError((d.get("error") or {}).get("message", "unexpected response from Google"))
            cats = d["lighthouseResult"]["categories"]
            audits = d["lighthouseResult"]["audits"]
            field = (d.get("loadingExperience") or {}).get("metrics") or {}
            fm = lambda k: (field.get(k) or {}).get("percentile")
            return {
                "scores": {k: round(v["score"] * 100) for k, v in cats.items() if v.get("score") is not None},
                "lcp_ms": fm("LARGEST_CONTENTFUL_PAINT_MS") or audits.get("largest-contentful-paint", {}).get("numericValue"),
                "cls": (fm("CUMULATIVE_LAYOUT_SHIFT_SCORE") / 100 if fm("CUMULATIVE_LAYOUT_SHIFT_SCORE") is not None
                        else audits.get("cumulative-layout-shift", {}).get("numericValue")),
                "inp_ms": fm("INTERACTION_TO_NEXT_PAINT"),
                "field_data": bool(field),
                "opportunities": [a["title"] for a in audits.values()
                                  if a.get("details", {}).get("type") == "opportunity" and (a.get("score") or 1) < 0.9][:6],
            }
        except Exception as e:
            log.warning("PageSpeed Insights (%s) failed: %s", strategy, e)
            return None

    def pagespeed(self):
        """Google PageSpeed for phones and desktops, run side by side. None when no key is set."""
        if not self.cfg.get("pagespeed_api_key"):
            return None
        with ThreadPoolExecutor(2) as ex:
            mobile, desktop = ex.map(self._pagespeed, ("mobile", "desktop"))
        return {"mobile": mobile, "desktop": desktop} if (mobile or desktop) else None

    # -- results --------------------------------------------------------
    def run(self):
        t = time.time()
        self.crawl()
        self.site_checks()
        self.link_checks()
        self.asset_checks()
        ps = self.pagespeed()
        n_pages = max(1, sum(1 for p in self.pages.values() if "title" in p))
        issues = []
        for rule, hits in self.findings.items():
            cat, sev, title, fix = RULES[rule]
            urls = list(dict.fromkeys(h[0] for h in hits))
            issues.append({
                "rule": rule, "category": cat, "severity": sev, "title": title, "fix": fix,
                "count": len(urls), "examples": [{"url": u, "detail": d} for u, d in hits[:8]],
                "share": min(1.0, len(urls) / n_pages),
            })
        order = {"high": 0, "medium": 1, "low": 2}
        issues.sort(key=lambda i: (order[i["severity"]], -i["count"]))
        scores = {}
        for cat in CATEGORIES:
            penalty = sum(SEVERITY_WEIGHT[i["severity"]] * (0.5 + 0.5 * i["share"])
                          for i in issues if i["category"] == cat)
            scores[cat] = max(0, round(100 - penalty))
        scores["Overall"] = round(sum(scores[c] for c in CATEGORIES) / len(CATEGORIES))
        db.run("INSERT INTO audits(site_id, ts, pages, scores, issues, pagespeed) VALUES (?,?,?,?,?,?)",
               (self.site["id"], time.time(), n_pages, json.dumps(scores), json.dumps(issues),
                json.dumps(ps) if ps else None))
        log.info("Audit of %s: %d pages, %d issue types, score %s, %.0fs",
                 self.site["id"], n_pages, len(issues), scores["Overall"], time.time() - t)
        return {"pages": n_pages, "scores": scores, "issues": issues, "pagespeed": ps}


def audit_site(cfg, site):
    return Auditor(cfg, site).run()
