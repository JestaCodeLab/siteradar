"""Command line:

  python -m sitewatch serve              dashboard + scheduler (the normal way to run it)
  python -m sitewatch check              run one uptime check of every site
  python -m sitewatch audit [site-id]    run an SEO/performance/security audit now
  python -m sitewatch report [site-id] [--month 2026-09] [--pdf] [--email]
  python -m sitewatch snippet            print the analytics snippet for each site
  python -m sitewatch test-alert         send a test alert through your channels
"""
import argparse
import logging
import sys

from . import alerts, auditor, db, monitor, report, sites
from .config import get_site, load


def main(argv=None):
    p = argparse.ArgumentParser(prog="sitewatch", description="Website monitoring, analytics, audits and reports.")
    p.add_argument("-c", "--config", default="config.yaml")
    sub = p.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("serve")
    s.add_argument("--host", default="0.0.0.0")
    s.add_argument("--port", type=int, default=8080)
    s.add_argument("--no-scheduler", action="store_true")
    sub.add_parser("check")
    a = sub.add_parser("audit")
    a.add_argument("site", nargs="?")
    r = sub.add_parser("report")
    r.add_argument("site", nargs="?")
    r.add_argument("--month", help="YYYY-MM (default: last month)")
    r.add_argument("--pdf", action="store_true")
    r.add_argument("--email", action="store_true", help="email to the site's report_to list")
    sub.add_parser("snippet")
    sub.add_parser("test-alert")
    args = p.parse_args(argv)

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    cfg = load(args.config)
    db.init(cfg["data_dir"])
    sites.init(cfg)

    def pick(site_id):
        if not site_id:
            return cfg["sites"]
        site = get_site(cfg, site_id)
        if not site:
            sys.exit(f"Unknown site '{site_id}'. Known: {', '.join(x['id'] for x in cfg['sites'])}")
        return [site]

    if args.cmd == "serve":
        from .web import create_app
        if not args.no_scheduler:
            from .scheduler import Scheduler
            Scheduler(cfg).start()
        app = create_app(cfg)
        try:
            from waitress import serve
            print(f"SiteWatch running on http://{args.host}:{args.port}")
            serve(app, host=args.host, port=args.port, threads=8)
        except ImportError:
            app.run(host=args.host, port=args.port, threaded=True)
    elif args.cmd == "check":
        for sid, res in monitor.check_all(cfg).items():
            mark = "UP  " if res["ok"] else "DOWN"
            print(f"{mark} {sid:24} {res['status_code'] or '-':>4} {str(res['response_ms'] or '-'):>6} ms  "
                  f"ssl:{res['ssl_days_left'] if res['ssl_days_left'] is not None else '-':>4}d  {res['error'] or ''}")
    elif args.cmd == "audit":
        for site in pick(args.site):
            res = auditor.audit_site(cfg, site)
            print(f"\n{site['name']}: {res['pages']} pages · score {res['scores']['Overall']}  "
                  + "  ".join(f"{k} {v}" for k, v in res["scores"].items() if k != "Overall"))
            for i in res["issues"]:
                print(f"  [{i['severity']:6}] {i['title']} ({i['count']})")
    elif args.cmd == "report":
        y = m = None
        if args.month:
            y, m = map(int, args.month.split("-"))
        for site in pick(args.site):
            paths = report.generate(cfg, site, y, m, pdf=args.pdf, email=args.email)
            print(f"{site['name']}: " + ", ".join(paths.values()))
    elif args.cmd == "snippet":
        for site in cfg["sites"]:
            print(f"{site['name']}:\n  <script defer src=\"{cfg['public_url']}/t.js\" data-site=\"{site['id']}\"></script>\n")
    elif args.cmd == "test-alert":
        ok = alerts.notify(cfg, cfg["sites"][0] if cfg["sites"] else {}, "SiteWatch test alert",
                           "If you can read this, alerts are working.")
        print("Sent." if ok else "No channel delivered the alert — check the alerts section of config.yaml.")


if __name__ == "__main__":
    main()
