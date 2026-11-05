"""Keeps recent warnings and errors in the database so the super admin can see them on Platform health."""
import logging
import time

from . import db


class DBHandler(logging.Handler):
    def emit(self, record):
        if record.levelno < logging.ERROR or record.name.startswith(("psycopg", "waitress", "sitewatch.db")):
            return
        try:
            text = self.format(record).splitlines()[0][:400]
            db.exec("INSERT INTO error_log(ts, source, text) VALUES (?,?,?)", (time.time(), record.name.replace("sitewatch.", ""), text))
            db.exec("DELETE FROM error_log WHERE ts < ?", (time.time() - 14 * 86400,))
        except Exception:        # logging must never break the code that logged
            pass


def install():
    logging.getLogger("sitewatch").addHandler(DBHandler())
