"""Subscriptions (domains, hosting, SSL, tools), their invoices and the monthly spend report."""
import calendar
import datetime as dt
import os
import re
import time
import uuid

from . import db, storage

CATEGORIES = ["Domain", "Hosting", "SSL", "SaaS", "Other"]
CYCLES = ("monthly", "yearly")
SOON_DAYS = 30
MAX_PDF_BYTES = 4 * 1024 * 1024   # Vercel rewrites cap request bodies at about 4.5 MB


def _date(s):
    return dt.date.fromisoformat(s)


def add_months(d, n):
    m = d.month - 1 + n
    y, m = d.year + m // 12, m % 12 + 1
    return d.replace(year=y, month=m, day=min(d.day, calendar.monthrange(y, m)[1]))


def effective_renewal(sub, today=None):
    """Next renewal date. Auto-renewing subscriptions roll forward; others stay put and show as expired."""
    today = today or dt.date.today()
    base = _date(sub["next_renewal"])
    d, k = base, 0
    if sub["auto_renew"]:
        stride = 1 if sub["cycle"] == "monthly" else 12
        while d < today:
            k += 1
            d = add_months(base, k * stride)
    return d


def status(sub, today=None):
    today = today or dt.date.today()
    if not sub["active"]:
        return "cancelled"
    d = effective_renewal(sub, today)
    if d < today:
        return "expired"
    return "soon" if (d - today).days <= SOON_DAYS else "active"


def monthly_equivalent(sub):
    return sub["amount"] / (12 if sub["cycle"] == "yearly" else 1)


def _invoice_dict(i):
    return {"id": i["id"], "period": i["period"], "name": i["original_name"], "size": i["size"],
            "uploaded": i["uploaded"], "url": f"/api/invoices/{i['id']}/file"}


def serialise(sub, invoices=None, site_names=None, today=None):
    today = today or dt.date.today()
    d = effective_renewal(sub, today)
    if invoices is None:
        invoices = db.q("SELECT * FROM invoices WHERE subscription_id=? ORDER BY period DESC, id DESC", (sub["id"],))
    cur_period = today.strftime("%Y-%m")
    return {
        "id": sub["id"], "site_id": sub["site_id"],
        "site_name": (site_names or {}).get(sub["site_id"]) if sub["site_id"] else None,
        "name": sub["name"], "category": sub["category"], "provider": sub["provider"],
        "amount": sub["amount"], "currency": sub["currency"], "cycle": sub["cycle"],
        "started": sub["started"], "next_renewal": d.isoformat(), "auto_renew": bool(sub["auto_renew"]),
        "remind_days": sub["remind_days"], "notes": sub["notes"], "active": bool(sub["active"]),
        "status": status(sub, today),
        "invoices": [_invoice_dict(i) for i in invoices],
        "has_current_invoice": any(i["period"] == cur_period for i in invoices),
        "latest_invoice": _invoice_dict(invoices[0]) if invoices else None,
    }


def _names(ws_id):
    return {s["id"]: s["name"] for s in db.q("SELECT id, name FROM sites WHERE workspace_id=?", (ws_id,))}


def list_all(ws_id, site_id=None):
    names = _names(ws_id)
    subs = db.q("SELECT * FROM subscriptions WHERE workspace_id=?" + (" AND site_id=?" if site_id else "") + " ORDER BY created DESC",
                (ws_id, site_id) if site_id else (ws_id,))
    inv = {}
    for i in db.q("""SELECT i.* FROM invoices i JOIN subscriptions s ON s.id=i.subscription_id
                     WHERE s.workspace_id=? ORDER BY i.period DESC, i.id DESC""", (ws_id,)):
        inv.setdefault(i["subscription_id"], []).append(i)
    out = [serialise(s, inv.get(s["id"], []), names) for s in subs]
    order = {"expired": 0, "soon": 1, "active": 2, "cancelled": 3}
    return sorted(out, key=lambda s: (order[s["status"]], s["next_renewal"]))


def get(ws_id, sub_id):
    row = db.q1("SELECT * FROM subscriptions WHERE id=? AND workspace_id=?", (sub_id, ws_id))
    return serialise(row, site_names=_names(ws_id)) if row else None


def totals(items):
    """Money per currency for the active subscriptions."""
    month, year = {}, {}
    for s in items:
        if s["status"] == "cancelled":
            continue
        m = s["amount"] / (12 if s["cycle"] == "yearly" else 1)
        month[s["currency"]] = month.get(s["currency"], 0) + m
        year[s["currency"]] = year.get(s["currency"], 0) + m * 12
    return {"monthly": {k: round(v, 2) for k, v in month.items()},
            "yearly": {k: round(v, 2) for k, v in year.items()}}


def summary(ws_id):
    items = list_all(ws_id)
    live = [s for s in items if s["status"] != "cancelled"]
    today = dt.date.today()
    soon = [s for s in live if s["status"] == "soon"]
    due = {}
    for s in soon:
        due[s["currency"]] = due.get(s["currency"], 0) + s["amount"]
    return {
        **totals(items),
        "count": len(live),
        "renewing_soon": len(soon), "due_soon": {k: round(v, 2) for k, v in due.items()},
        "expired": sum(1 for s in live if s["status"] == "expired"),
        "missing_invoices": sum(1 for s in live if not s["invoices"]),
        "today": today.isoformat(),
    }


def validate(ws_id, data, partial=False):
    out = {}
    if not partial or "name" in data:
        out["name"] = (data.get("name") or "").strip()
        if not out["name"]:
            raise ValueError("Give the subscription a name.")
    if not partial or "amount" in data:
        try:
            out["amount"] = round(float(str(data.get("amount")).replace(",", "")), 2)
        except ValueError:
            raise ValueError("Enter the amount as a number, for example 11.99")
        if out["amount"] < 0:
            raise ValueError("The amount can't be negative.")
    if not partial or "cycle" in data:
        out["cycle"] = data.get("cycle")
        if out["cycle"] not in CYCLES:
            raise ValueError("Billing cycle must be monthly or yearly.")
    if not partial or "next_renewal" in data:
        try:
            out["next_renewal"] = _date(data.get("next_renewal")).isoformat()
        except (TypeError, ValueError):
            raise ValueError("Enter the next renewal date.")
    if data.get("started"):
        try:
            out["started"] = _date(data["started"]).isoformat()
        except ValueError:
            raise ValueError("The start date isn't a valid date.")
    elif "started" in data:
        out["started"] = None
    for f in ("category", "provider", "notes"):
        if f in data:
            out[f] = (data[f] or "").strip() or None
    if "currency" in data:
        out["currency"] = (data["currency"] or "USD").strip().upper()[:3]
    if "site_id" in data:
        out["site_id"] = data["site_id"] or None
        if out["site_id"] and not db.q1("SELECT 1 FROM sites WHERE id=? AND workspace_id=?", (out["site_id"], ws_id)):
            raise ValueError("That website doesn't exist.")
    if "auto_renew" in data:
        out["auto_renew"] = int(bool(data["auto_renew"]))
    if "active" in data:
        out["active"] = int(bool(data["active"]))
    if "remind_days" in data:
        out["remind_days"] = max(0, int(data["remind_days"] or 0))
    return out


def create(ws_id, data):
    v = validate(ws_id, data)
    v["workspace_id"] = ws_id
    v.setdefault("currency", "USD")
    v.setdefault("auto_renew", 1)
    v.setdefault("remind_days", 14)
    v.setdefault("active", 1)
    v.setdefault("site_id", None)
    cols = [*v.keys(), "created"]
    sub_id = db.run(f"INSERT INTO subscriptions({', '.join(cols)}) VALUES ({', '.join('?' * len(cols))})",
                    (*v.values(), time.time()))
    return sub_id


def update(ws_id, sub_id, data):
    v = validate(ws_id, data, partial=True)
    if v:
        db.run(f"UPDATE subscriptions SET {', '.join(k + '=?' for k in v)} WHERE id=?", (*v.values(), sub_id))


def delete(cfg, sub_id):
    for i in db.q("SELECT * FROM invoices WHERE subscription_id=?", (sub_id,)):
        _remove_file(cfg, i["filename"])
    db.run("DELETE FROM invoices WHERE subscription_id=?", (sub_id,))
    db.run("DELETE FROM subscriptions WHERE id=?", (sub_id,))


# ---- invoices ------------------------------------------------------------

def _legacy(cfg, filename):
    return os.path.join(cfg["data_dir"], "invoices", filename)      # where invoices lived before cloud storage


def _remove_file(cfg, filename):
    storage.remove("invoice/" + filename, _legacy(cfg, filename))


def add_invoice(cfg, sub_id, file_storage, period=None):
    data = file_storage.read(MAX_PDF_BYTES + 1)
    if len(data) > MAX_PDF_BYTES:
        raise ValueError("The PDF is larger than 4 MB.")
    if not data.startswith(b"%PDF"):
        raise ValueError("Only PDF files can be uploaded.")
    period = period or dt.date.today().strftime("%Y-%m")
    if not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", period):
        raise ValueError("Period must look like 2026-10.")
    filename = uuid.uuid4().hex + ".pdf"
    storage.put("invoice/" + filename, data, "application/pdf")
    original = os.path.basename(file_storage.filename or "invoice.pdf")[:120]
    return db.run("INSERT INTO invoices(subscription_id, period, filename, original_name, size, uploaded) VALUES (?,?,?,?,?,?)",
                  (sub_id, period, filename, original, len(data), time.time()))


def invoice_file(cfg, ws_id, invoice_id):
    """(invoice row, PDF bytes) for an invoice in this workspace, else (None, None)."""
    i = db.q1("""SELECT i.* FROM invoices i JOIN subscriptions s ON s.id=i.subscription_id
                 WHERE i.id=? AND s.workspace_id=?""", (invoice_id, ws_id))
    if not i:
        return None, None
    return i, storage.get("invoice/" + i["filename"], _legacy(cfg, i["filename"]))


def delete_invoice(cfg, ws_id, invoice_id):
    i = db.q1("""SELECT i.* FROM invoices i JOIN subscriptions s ON s.id=i.subscription_id
                 WHERE i.id=? AND s.workspace_id=?""", (invoice_id, ws_id))
    if i:
        _remove_file(cfg, i["filename"])
        db.run("DELETE FROM invoices WHERE id=?", (invoice_id,))


# ---- monthly report ------------------------------------------------------

def charge_date(sub, year, month):
    """The day this subscription is charged in the given month, or None."""
    floor = (_date(sub["started"]) if sub["started"] else dt.date.fromtimestamp(sub["created"] or time.time()))
    if (year, month) < (floor.year, floor.month):
        return None
    anchor = _date(sub["next_renewal"])
    if sub["cycle"] == "yearly" and anchor.month != month:
        return None
    if not sub["auto_renew"] and (year, month) != (anchor.year, anchor.month):
        return None
    return dt.date(year, month, min(anchor.day, calendar.monthrange(year, month)[1]))


def available_months(ws_id):
    first = db.q1("SELECT MIN(created) t FROM subscriptions WHERE workspace_id=?", (ws_id,))["t"]
    if not first:
        return []
    d = dt.date.fromtimestamp(first).replace(day=1)
    today = dt.date.today()
    out = []
    while d <= today.replace(day=1):
        out.append(d.strftime("%Y-%m"))
        d = add_months(d, 1)
    return out[::-1]


def build_report(ws_id, year, month):
    names = _names(ws_id)
    period = f"{year}-{month:02d}"
    today = dt.date.today()
    subs = db.q("SELECT * FROM subscriptions WHERE active=1 AND workspace_id=?", (ws_id,))
    invoices = {}
    for i in db.q("""SELECT i.* FROM invoices i JOIN subscriptions s ON s.id=i.subscription_id
                     WHERE i.period=? AND s.workspace_id=?""", (period, ws_id)):
        invoices.setdefault(i["subscription_id"], i)

    charges, by_site, by_cat, total = [], {}, {}, {}
    for s in subs:
        d = charge_date(s, year, month)
        if not d or status(s) == "expired":
            continue
        inv = invoices.get(s["id"])
        site = names.get(s["site_id"], "No website")
        charges.append({"date": d.isoformat(), "subscription_id": s["id"], "name": s["name"], "site": site,
                        "category": s["category"] or "Other", "amount": s["amount"], "currency": s["currency"],
                        "invoice": _invoice_dict(inv) if inv else None, "future": d > today})
        cur = s["currency"]
        total[cur] = total.get(cur, 0) + s["amount"]
        by_site.setdefault(cur, {}).setdefault(site, 0)
        by_site[cur][site] += s["amount"]
        by_cat.setdefault(cur, {}).setdefault(s["category"] or "Other", 0)
        by_cat[cur][s["category"] or "Other"] += s["amount"]
    charges.sort(key=lambda c: c["date"])

    ny, nm = (year + (month == 12), month % 12 + 1)
    upcoming = []
    for s in subs:
        d = charge_date(s, ny, nm)
        if d:
            upcoming.append({"date": d.isoformat(), "name": s["name"], "site": names.get(s["site_id"], "No website"),
                             "amount": s["amount"], "currency": s["currency"]})
    upcoming.sort(key=lambda u: u["date"])
    up_total = {}
    for u in upcoming:
        up_total[u["currency"]] = up_total.get(u["currency"], 0) + u["amount"]

    py, pm = (year - (month == 1), 12 if month == 1 else month - 1)
    prev_total = {}
    for s in subs:
        if charge_date(s, py, pm):
            prev_total[s["currency"]] = prev_total.get(s["currency"], 0) + s["amount"]

    items = list_all(ws_id)
    actions = []
    for s in items:
        if s["status"] == "expired":
            actions.append({"level": "urgent", "text": f"{s['name']} ({s['site_name'] or 'no website'}) expired on "
                            f"{s['next_renewal']}. Renew it, or mark it cancelled if it is no longer needed."})
    for c in charges:
        if not c["future"] and not c["invoice"]:
            actions.append({"level": "soon", "text": f"Upload the {dt.date(year, month, 1):%B} invoice for "
                            f"{c['name']} ({c['site']}), {c['currency']} {c['amount']:.2f}."})

    rnd = lambda d: {k: round(v, 2) for k, v in d.items()}
    return {
        "period": period, "label": dt.date(year, month, 1).strftime("%B %Y"),
        "generated": dt.datetime.now().strftime("%d %B %Y, %H:%M"),
        "in_progress": (year, month) == (today.year, today.month),
        "total": rnd(total), "previous_total": rnd(prev_total), "next_total": rnd(up_total),
        "next_label": dt.date(ny, nm, 1).strftime("%B"),
        "active_count": sum(1 for s in items if s["status"] in ("active", "soon")),
        "expired_count": sum(1 for s in items if s["status"] == "expired"),
        "charges": charges, "invoices_on_file": sum(1 for c in charges if c["invoice"]),
        "invoices_due": sum(1 for c in charges if not c["future"]),
        "by_site": {c: sorted(v.items(), key=lambda kv: -kv[1]) for c, v in by_site.items()},
        "by_category": {c: sorted(v.items(), key=lambda kv: -kv[1]) for c, v in by_cat.items()},
        "upcoming": upcoming, "actions": actions,
    }


def due_reminders(ws_id, today=None):
    """Active subscriptions whose renewal is within their reminder window."""
    today = today or dt.date.today()
    out = []
    for s in list_all(ws_id):
        if s["status"] in ("cancelled", "expired") or not s["remind_days"]:
            continue
        d = _date(s["next_renewal"])
        if 0 <= (d - today).days <= s["remind_days"]:
            out.append(s)
    return out
