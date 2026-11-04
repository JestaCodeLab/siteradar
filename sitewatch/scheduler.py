"""Background scheduler: uptime checks every N minutes, a daily audit, and the monthly report."""
import datetime as dt
import json
import logging
import os
import threading
import time
from concurrent.futures import ThreadPoolExecutor

from . import auditor, monitor, report

log = logging.getLogger("sitewatch.scheduler")


class Scheduler(threading.Thread):
    def __init__(self, cfg):
        super().__init__(daemon=True)
        self.cfg = cfg
        self.state_path = os.path.join(cfg["data_dir"], "state.json")
        self.state = json.load(open(self.state_path)) if os.path.exists(self.state_path) else {}
        self.pool = ThreadPoolExecutor(max_workers=8)

    def save(self):
        with open(self.state_path, "w") as f:
            json.dump(self.state, f)

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
                now = time.time()
                if now - last_check >= self.cfg["check_interval_minutes"] * 60:
                    last_check = now
                    list(self.pool.map(lambda s: monitor.check_site(self.cfg, s), self.cfg["sites"]))

                if self.due_daily("audit", self.cfg["audit"]["daily_at"]):
                    self.state["audit"] = dt.date.today().isoformat()
                    self.save()
                    for s in self.cfg["sites"]:
                        if s.get("audit"):
                            self.pool.submit(self._safe, auditor.audit_site, self.cfg, s)

                today = dt.date.today()
                rkey = f"report-{today:%Y-%m}"
                if today.day >= int(self.cfg["report"]["day_of_month"]) and \
                        self.due_daily("report_day", self.cfg["report"]["at"]) and not self.state.get(rkey):
                    self.state[rkey] = True
                    self.state["report_day"] = today.isoformat()
                    self.save()
                    for s in self.cfg["sites"]:
                        self.pool.submit(self._safe, report.generate, self.cfg, s, None, None, True, True)
            except Exception:
                log.exception("Scheduler loop error")
            time.sleep(20)

    @staticmethod
    def _safe(fn, *args):
        try:
            fn(*args)
        except Exception:
            log.exception("Scheduled job %s failed", fn.__name__)
