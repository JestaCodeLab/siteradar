"""Background scheduler: uptime checks every N minutes, a daily audit, and the monthly report."""
import datetime as dt
import json
import logging
import os
import threading
import time
from concurrent.futures import ThreadPoolExecutor

from . import alerts, auditor, db, health, monitor, report, sites, sub_report, subscriptions

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

    def save(self):
        db.kv_set("scheduler", self.state)

    def due_daily(self, key, hhmm):
        now = dt.datetime.now()
        h, m = map(int, hhmm.split(":"))
        today = now.date().isoformat()
        return now.hour * 60 + now.minute >= h * 60 + m and self.state.get(key) != today

    def run(self):
        log.info("Scheduler started for %d site(s)", len(self.cfg["sites"]))
        last_check = 0
        while True:
            try:
                sites.refresh(self.cfg)           # websites added on the web service appear here too
                now = time.time()
                if now - last_check >= self.cfg["check_interval_minutes"] * 60:
                    last_check = now
                    list(self.pool.map(lambda s: monitor.check_site(self.cfg, s), list(self.cfg["sites"])))

                if self.due_daily("audit", self.cfg["audit"]["daily_at"]):
                    self.state["audit"] = dt.date.today().isoformat()
                    self.save()
                    for s in self.cfg["sites"]:
                        if s.get("audit"):
                            self.pool.submit(self._safe, auditor.audit_site, self.cfg, s)

                if self.due_daily("health", self.cfg["health"]["daily_at"]):
                    self.state["health"] = dt.date.today().isoformat()
                    self.save()
                    for s in list(self.cfg["sites"]):
                        self.pool.submit(self._safe, health.run_all, self.cfg, s)
                else:
                    # sites that have never been checked (new, or first start after this feature) run straight away
                    for s in list(self.cfg["sites"]):
                        if s["id"] not in self.health_started and health.needs_first_run(self.cfg, s["id"]):
                            self.health_started.add(s["id"])
                            self.pool.submit(self._safe, health.run_all, self.cfg, s)

                today = dt.date.today()
                rkey = f"report-{today:%Y-%m}"
                if today.day >= int(self.cfg["report"]["day_of_month"]) and \
                        self.due_daily("report_day", self.cfg["report"]["at"]) and not self.state.get(rkey):
                    self.state[rkey] = True
                    self.state["report_day"] = today.isoformat()
                    self.save()
                    for s in self.cfg["sites"]:
                        self.pool.submit(self._safe, report.generate, self.cfg, s, None, None, True, True)

                if self.due_daily("renewals", "08:00"):
                    self.state["renewals"] = dt.date.today().isoformat()
                    self.save()
                    self.pool.submit(self._safe, self.send_renewal_reminders)

                skey = f"subreport-{today:%Y-%m}"
                if today.day >= int(self.cfg["report"]["day_of_month"]) and \
                        self.due_daily("subreport_day", self.cfg["report"]["at"]) and not self.state.get(skey):
                    self.state[skey] = True
                    self.state["subreport_day"] = today.isoformat()
                    self.save()
                    py, pm = report.previous_month(today.year, today.month)
                    self.pool.submit(self._safe, sub_report.email, self.cfg, py, pm)
            except Exception:
                log.exception("Scheduler loop error")
            time.sleep(20)

    def send_renewal_reminders(self):
        """One email per subscription per renewal date, as many days ahead as its reminder setting says."""
        from . import db
        for s in subscriptions.due_reminders():
            kind = f"renewal:{s['id']}:{s['next_renewal']}"
            if db.last_alert("", kind):
                continue
            site = s["site_name"] or "no website"
            alerts.notify(self.cfg, {}, f"Renewal coming up: {s['name']} ({site})",
                          f"{s['name']} renews on {s['next_renewal']} for {s['currency']} {s['amount']:.2f}"
                          f"{' (charged automatically)' if s['auto_renew'] else ' (manual renewal needed)'}.")
            db.log_alert("", kind, s["name"])

    @staticmethod
    def _safe(fn, *args):
        try:
            fn(*args)
        except Exception:
            log.exception("Scheduled job %s failed", fn.__name__)
