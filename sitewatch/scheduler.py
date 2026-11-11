"""Background scheduler: uptime checks every N minutes, a daily audit, and the monthly report."""
import datetime as dt
from zoneinfo import ZoneInfo
import json
import logging
import os
import threading
import time
from concurrent.futures import ThreadPoolExecutor

from . import accounts, alerts, analytics, auditor, billing, db, emails, health, monitor, plans, report, sites, sub_report, subscriptions

log = logging.getLogger("sitewatch.scheduler")


class Scheduler(threading.Thread):
    def __init__(self, cfg):
        super().__init__(daemon=True)
        self.cfg = cfg
        self.state = db.kv_get("scheduler")
        if self.state is None:
            # first start on Postgres: pick up what the old file-based scheduler had already done today
            old = os.path.join(cfg["data_dir"], "state.json")
            self.state = json.load(open(old)) if os.path.exists(old) else {}
        self.pool = ThreadPoolExecutor(max_workers=8)
        self.health_started = set()
        self.workspaces = {}

    def save(self):
        db.kv_set("scheduler", self.state)

    def due_daily(self, key, hhmm):
        now = dt.datetime.now()
        h, m = map(int, hhmm.split(":"))
        today = now.date().isoformat()
        return now.hour * 60 + now.minute >= h * 60 + m and self.state.get(key) != today

    def interval(self, site):
        ws = self.workspaces.get(site.get("workspace_id"))
        return plans.limits(ws)["interval_minutes"] * 60 if ws else self.cfg["check_interval_minutes"] * 60

    def live_sites(self):
        return [s for s in self.cfg["sites"]
                if not s.get("paused") and not (self.workspaces.get(s.get("workspace_id")) or {}).get("suspended")]

    def run(self):
        log.info("Scheduler started")
        last = {r["site_id"]: r["t"] for r in db.q("SELECT site_id, MAX(ts) t FROM checks GROUP BY site_id")}
        while True:
            try:
                sites.refresh(self.cfg)           # websites added on the web service appear here too
                self.workspaces = {w["id"]: w for w in (accounts.workspace(r["id"]) for r in db.q("SELECT id FROM workspaces"))}
                db.kv_set("heartbeat", {"ts": time.time(), "sites": len(self.cfg["sites"])})
                now = time.time()
                due = [s for s in self.live_sites() if now - last.get(s["id"], 0) >= self.interval(s) - 5]
                for s in due:
                    last[s["id"]] = now
                list(self.pool.map(lambda s: self._safe(monitor.check_site, self.cfg, s), due))
                live = self.live_sites()

                if time.time() - getattr(self, "_tracking_scan", 0) > 600:      # sites that already have the snippet get marked verified without anyone pressing the button
                    self._tracking_scan = time.time()
                    for s in live:
                        self.pool.submit(self._safe, analytics.auto_verify, s)

                if self.due_daily("audit", self.cfg["audit"]["daily_at"]):
                    self.state["audit"] = dt.date.today().isoformat()
                    self.save()
                    for s in live:
                        if s.get("audit"):
                            self.pool.submit(self._safe, auditor.audit_site, self.cfg, s)

                if self.due_daily("health", self.cfg["health"]["daily_at"]):
                    self.state["health"] = dt.date.today().isoformat()
                    self.save()
                    for s in live:
                        self.pool.submit(self._safe, health.run_all, self.cfg, s)
                else:
                    # sites that have never been checked (new) run straight away
                    for s in live:
                        if s["id"] not in self.health_started and health.needs_first_run(self.cfg, s["id"]):
                            self.health_started.add(s["id"])
                            self.pool.submit(self._safe, health.run_all, self.cfg, s)

                today = dt.date.today()
                # monthly reports: each workspace picks its own day and time, in its own time zone
                for ws_id, ws in self.workspaces.items():
                    if ws["suspended"] or (ws.get("created") or 0) > time.time() - 7 * 86400:
                        continue      # a workspace in its first week has no full month to report on yet
                    try:
                        local = dt.datetime.now(ZoneInfo(ws.get("timezone") or "Africa/Accra"))
                    except Exception:
                        local = dt.datetime.now()
                    rkey = f"report-{ws_id}-{local:%Y-%m}"
                    hh, mm = map(int, (ws.get("report_at") or "08:00").split(":"))
                    if local.day >= int(ws.get("report_day") or 1) and local.hour * 60 + local.minute >= hh * 60 + mm and not self.state.get(rkey):
                        self.state[rkey] = True
                        self.save()
                        for s in live:
                            if s.get("workspace_id") == ws_id:
                                if analytics.is_verified(s["id"]):
                                    self.pool.submit(self._safe, report.generate, self.cfg, s, None, None, True, True)
                                else:      # the report needs visitor data, so it waits until the tracking snippet is installed
                                    self.pool.submit(self._safe, self.remind_tracking, ws, s, f"{local:%Y-%m}")
                        if subscriptions.available_months(ws_id):
                            py, pm = report.previous_month(local.year, local.month)
                            self.pool.submit(self._safe, sub_report.email, self.cfg, ws, py, pm)

                if self.due_daily("renewals", "08:00"):
                    self.state["renewals"] = dt.date.today().isoformat()
                    self.save()
                    self.pool.submit(self._safe, self.send_renewal_reminders)
                    self.pool.submit(self._safe, billing.renew_all, self.cfg)
                    self.pool.submit(self._safe, self.purge_old_data)
                    self.pool.submit(self._safe, accounts.purge_deleted)

            except Exception:
                log.exception("Scheduler loop error")
            time.sleep(20)

    def remind_tracking(self, ws, site, month):
        """The monthly report is on hold until the tracking snippet is installed: tell the people who get the report, once a month."""
        kind = f"tracking-reminder:{month}"
        if db.last_alert(site["id"], kind):
            return
        to = accounts.filter_emails(site.get("report_to") or ws.get("alert_emails") or [], "report")
        link = f"{emails.app_url()}/websites/{site['id']}"
        if to:
            alerts.send_email(self.cfg, to, f"Action needed: install the tracking snippet on {site['name']}",
                              f"The monthly report for {site['name']} is on hold because the SiteRadar tracking snippet has not been installed yet. "
                              f"Without it we cannot show visitors, sources or real page speed.\n\n"
                              f"Open {link}, copy the snippet, paste it just before </head> on the website and press Verify installation. "
                              f"The report is sent as soon as the installation is verified.")
        db.log_alert(site["id"], kind, "Monthly report held until the tracking snippet is installed")

    def purge_old_data(self):
        """Drop checks, hits and incidents older than each plan's history window."""
        for ws in self.workspaces.values():
            cutoff = time.time() - plans.limits(ws)["history_months"] * 31 * 86400
            ids = [s["id"] for s in db.q("SELECT id FROM sites WHERE workspace_id=?", (ws["id"],))]
            if ids:
                for table, col in (("checks", "ts"), ("hits", "ts"), ("incidents", "started")):
                    db.exec(f"DELETE FROM {table} WHERE site_id = ANY(?) AND {col} < ?", (ids, cutoff))

    def send_renewal_reminders(self):
        """One email per subscription per renewal date, as many days ahead as its reminder setting says."""
        for ws in self.workspaces.values():
            for s in subscriptions.due_reminders(ws["id"]):
                kind = f"renewal:{s['id']}:{s['next_renewal']}"
                if db.last_alert("", kind):
                    continue
                site = s["site_name"] or "no website"
                days = (dt.date.fromisoformat(str(s["next_renewal"])[:10]) - dt.date.today()).days
                mail = emails.expiry("subscription", ws["name"], s["name"], days, emails.fmt_date(s["next_renewal"]), f"{emails.app_url()}/subscriptions",
                                     site=s["site_name"], amount=f"{s['currency']} {s['amount']:,.2f}", auto_renew=bool(s["auto_renew"]))
                alerts.notify(self.cfg, {"workspace_id": ws["id"]}, f"Renewal coming up: {s['name']} ({site})",
                              f"{s['name']} renews on {s['next_renewal']} for {s['currency']} {s['amount']:.2f}"
                              f"{' (charged automatically)' if s['auto_renew'] else ' (manual renewal needed)'}.", event="renewal", mail=mail)
                db.log_alert("", kind, s["name"])

    @staticmethod
    def _safe(fn, *args):
        try:
            fn(*args)
        except Exception:
            log.exception("Scheduled job %s failed", fn.__name__)
