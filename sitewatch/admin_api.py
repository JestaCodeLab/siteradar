"""Super admin area: overview, customers, plans and prices, payments, platform health and support sessions."""
import csv
import datetime as dt
import io
import json
import os
import time

from flask import Blueprint, Response, abort, g, jsonify, request, session

from . import accounts, billing, db, mailer, plans, sites, sms, storage
from .ctx import SUPPORT_MINUTES, super_required

PLAN_COLORS = {"free": "#C9CFD8", "starter": "#9DB4F5", "growth": "#6B4FE0", "scale": "#2B1C77"}
AUDIENCES = ("everyone", "paying", "free")
METHODS = ["Card", "MTN MoMo", "Telecel Cash", "AirtelTigo Money"]


def audit(action, ws_id=None, detail=""):
    db.exec("INSERT INTO admin_audit(ts, admin_id, workspace_id, action, detail) VALUES (?,?,?,?,?)",
            (time.time(), g.user["id"], ws_id, action, detail[:1000]))


def _month_start(ts=None):
    d = dt.datetime.fromtimestamp(ts or time.time()).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    return d.timestamp()


def _status(w):
    if w["suspended"]:
        return "Suspended"
    if w["plan_status"] == "past_due":
        return "Past due"
    if w["plan_status"] == "lapsed":
        return "Lapsed"
    return "Free" if w["plan_id"] == "free" else "Active"


def csv_response(name, header, rows):
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(header)
    w.writerows(rows)
    return Response(buf.getvalue(), mimetype="text/csv", headers={"Content-Disposition": f'attachment; filename="{name}.csv"'})


def blueprint(cfg):
    bp = Blueprint("admin_api", __name__, url_prefix="/api/admin")

    def body():
        return request.get_json(silent=True) or {}

    @bp.before_request
    def guard():
        if request.path.endswith("/support/stop"):
            return None
        return super_required(lambda: None)()

    catalogue = lambda: {p["id"]: p for p in plans.all_plans(False)}

    def mrr_of(w, cat=None):
        cat = cat or catalogue()
        if w["plan_id"] == "free" or w["comped"] or w["plan_status"] not in ("active", "past_due") or w["plan_id"] not in cat:
            return 0.0
        return plans.price(cat[w["plan_id"]], w["cycle"]) / (12 if w["cycle"] == "yearly" else 1)

    def owner_of(w):
        return accounts.user_by_id(w["owner_id"]) if w["owner_id"] else None

    def customer_row(w, cat=None):
        owner, u = owner_of(w), plans.usage(w["id"])
        plan = plans.limits(w)
        return {"id": w["id"], "name": w["name"], "plan_id": w["plan_id"], "plan_name": (plans.get(w["plan_id"]) or {}).get("name", w["plan_id"]),
                "plan_status": w["plan_status"], "cycle": w["cycle"], "suspended": w["suspended"], "comped": w["comped"],
                "status": _status(w), "created": w["created"], "sites": u["sites"], "sites_limit": plan["sites"],
                "members": u["members"], "members_limit": plan["members"], "mrr": round(mrr_of(w, cat), 2), "renews": w["plan_renews"],
                "owner": {"name": f"{owner['first_name']} {owner['last_name']}".strip(), "email": owner["email"], "phone": owner["phone"],
                          "last_login": owner["last_login"]} if owner else None}

    def all_workspaces():
        return [accounts._ws(r) for r in db.q("SELECT * FROM workspaces ORDER BY created DESC")]

    # ---- attention and summary ---------------------------------------------------
    def health_services():
        now = time.time()
        beat = db.kv_get("heartbeat") or {}
        state = db.kv_get("scheduler") or {}
        out = []
        out.append({"name": "Web app and API", "status": "Operational", "tone": "ok", "detail": "Responding normally."})
        age = now - beat["ts"] if beat.get("ts") else None
        if age is None:
            out.append({"name": "Check scheduler", "status": "Down", "tone": "bad", "detail": "No heartbeat yet. Is the worker service running?"})
        elif age < 120:
            out.append({"name": "Check scheduler", "status": "Operational", "tone": "ok", "detail": f"Last full round finished {int(age)} seconds ago, watching {beat.get('sites', 0)} websites."})
        else:
            out.append({"name": "Check scheduler", "status": "Delayed" if age < 900 else "Down", "tone": "warn" if age < 900 else "bad",
                        "detail": f"Last heartbeat {int(age / 60)} minutes ago."})
        h, m = map(int, cfg["audit"]["daily_at"].split(":"))
        late = dt.datetime.now().hour * 60 + dt.datetime.now().minute > h * 60 + m + 60
        ran = state.get("audit") == dt.date.today().isoformat()
        out.append({"name": "Nightly audits", "status": "Delayed" if (late and not ran) else "Operational", "tone": "warn" if (late and not ran) else "ok",
                    "detail": "Tonight's audits have not started yet." if (late and not ran) else (f"Last run {state['audit']}." if state.get("audit") else "Waiting for the first run.")})
        shots = db.q1("SELECT COUNT(*) n FROM assets WHERE key LIKE 'shot/%' AND ts>?", (now - 86400,))["n"]
        out.append({"name": "Homepage preview worker", "status": "Operational", "tone": "ok", "detail": f"{shots} previews taken in the last 24 hours."})
        codes = db.q1("SELECT COUNT(*) n FROM email_codes WHERE created>?", (now - 86400,))["n"]
        out.append({"name": "Email sending", "status": "Operational" if mailer.configured() else "Not configured", "tone": "ok" if mailer.configured() else "warn",
                    "detail": f"{codes} verification codes sent in the last 24 hours." if mailer.configured() else "Set RESEND_API_KEY to send email."})
        bal = sms.balance()
        if not sms.configured():
            out.append({"name": "SMS gateway", "status": "Not configured", "tone": "warn", "detail": "Set FLOCKTEXT_API_KEY to send text messages."})
        elif bal is None:
            out.append({"name": "SMS gateway", "status": "Unreachable", "tone": "bad", "detail": "FlockText did not answer. Check the API key."})
        else:
            per_day = db.q1("SELECT COUNT(*) n FROM sms_log WHERE ok=1 AND ts>?", (now - 7 * 86400,))["n"] / 7
            days = f"about {int(bal / per_day)} days at the current rate" if per_day else "no recent sending"
            out.append({"name": "SMS gateway", "status": "Low credit" if bal < 200 else "Operational", "tone": "warn" if bal < 200 else "ok",
                        "detail": f"FlockText balance {bal:,} credits, {days}."})
        hook = db.kv_get("last_webhook") or {}
        if not billing.configured():
            out.append({"name": "Payment webhooks", "status": "Not configured", "tone": "warn", "detail": "Set PAYSTACK_SECRET_KEY and add the webhook in Paystack."})
        else:
            out.append({"name": "Payment webhooks", "status": "Operational", "tone": "ok",
                        "detail": f"Last event received {int((now - hook['ts']) / 60)} minutes ago." if hook.get("ts") else "No events received yet."})
        out.append({"name": "Google PageSpeed quota", "status": "Operational" if cfg.get("pagespeed_api_key") else "No API key", "tone": "ok" if cfg.get("pagespeed_api_key") else "warn",
                    "detail": "API key connected." if cfg.get("pagespeed_api_key") else "Add PAGESPEED_API_KEY to show Core Web Vitals."})
        return out, bal

    def attention():
        now = time.time()
        items = []
        failed = db.q("SELECT amount FROM payments WHERE status IN ('failed','abandoned') AND created>?", (now - 14 * 86400,))
        if failed:
            items.append({"tag": "Payment", "tone": "bad", "title": f"{len(failed)} failed payment{'s' if len(failed) != 1 else ''}",
                          "sub": f"GHS {sum(f['amount'] for f in failed):,.0f} at risk. Retry or email the customers.", "href": "/admin/payments"})
        services, bal = health_services()
        for s in services:
            if s["tone"] != "ok" and s["status"] != "Not configured":
                items.append({"tag": "SMS" if "SMS" in s["name"] else "System", "tone": "warn" if s["tone"] == "warn" else "bad",
                              "title": f"{s['name']}: {s['status'].lower()}", "sub": s["detail"], "href": "/admin/health"})
        susp = db.q1("SELECT COUNT(*) n FROM workspaces WHERE suspended=1")["n"]
        if susp:
            items.append({"tag": "Support", "tone": "muted", "title": f"{susp} suspended workspace{'s' if susp != 1 else ''}", "sub": "Check whether they are waiting on you.", "href": "/admin/customers?tab=suspended"})
        return items

    @bp.get("/summary")
    def summary():
        n = db.q1("SELECT COUNT(*) n FROM workspaces")["n"]
        failed = db.q1("SELECT COUNT(*) n FROM payments WHERE status IN ('failed','abandoned') AND created>?", (time.time() - 14 * 86400,))["n"]
        local = "localhost" in str(cfg.get("public_url", ""))
        return jsonify(customers=n, failed_payments=failed, attention=len(attention()), env="Local" if local else "Production")

    @bp.get("/notifications")
    def notifications():
        """What needs attention now, plus what happened in the last week (signups, failed payments, messages)."""
        week = time.time() - 7 * 86400
        events = []
        for w in db.q("SELECT id, name, plan_id, created FROM workspaces WHERE created>? ORDER BY created DESC LIMIT 10", (week,)):
            events.append({"ts": w["created"], "tag": "Signup", "tone": "ok", "title": f"{w['name']} signed up", "sub": f"{w['plan_id'].title()} plan", "href": f"/admin/customers/{w['id']}"})
        for p in db.q("""SELECT p.created, p.amount, p.workspace_id, w.name FROM payments p JOIN workspaces w ON w.id=p.workspace_id
                         WHERE p.status IN ('failed','abandoned') AND p.created>? ORDER BY p.created DESC LIMIT 10""", (week,)):
            events.append({"ts": p["created"], "tag": "Payment", "tone": "bad", "title": f"Payment from {p['name']} failed", "sub": f"GHS {p['amount']:,.2f}", "href": f"/admin/customers/{p['workspace_id']}"})
        for m in db.q("SELECT ts, detail FROM admin_audit WHERE action='contact' AND ts>? ORDER BY ts DESC LIMIT 10", (week,)):
            first = (m["detail"] or "").splitlines()[0].replace("From:", "").strip()
            events.append({"ts": m["ts"], "tag": "Message", "tone": "purple", "title": f"New message from {first.split('<')[0].strip() or 'a visitor'}", "sub": "Contact form", "href": "/admin/activity?tab=messages"})
        events.sort(key=lambda e: -e["ts"])
        return jsonify(attention=attention(), events=events[:15])

    @bp.get("/search")
    def search():
        q = (request.args.get("q") or "").strip().lower()
        if len(q) < 2:
            return jsonify(results=[])
        like = f"%{q}%"
        rows = db.q("""SELECT DISTINCT w.* FROM workspaces w LEFT JOIN users u ON u.id=w.owner_id LEFT JOIN sites s ON s.workspace_id=w.id
                       WHERE lower(w.name) LIKE ? OR lower(u.email) LIKE ? OR lower(s.url) LIKE ? OR lower(s.name) LIKE ? LIMIT 8""", (like, like, like, like))
        out = []
        for r in rows:
            w = accounts._ws(r); o = owner_of(w)
            out.append({"id": w["id"], "name": w["name"], "email": o["email"] if o else "", "plan": (plans.get(w["plan_id"]) or {}).get("name", "")})
        return jsonify(results=out)

    # ---- overview ----------------------------------------------------------------------
    @bp.get("/overview")
    def overview():
        now = time.time()
        period = request.args.get("period", "30d")
        today = dt.date.today()
        start = {"30d": now - 30 * 86400, "month": _month_start(), "90d": now - 90 * 86400,
                 "year": dt.datetime(today.year, 1, 1).timestamp()}.get(period, now - 30 * 86400)
        label = {"30d": "in the last 30 days", "month": "this month", "90d": "in the last 90 days", "year": "this year"}.get(period, "in the last 30 days")
        cat = catalogue()
        ws_list = all_workspaces()
        paying = [w for w in ws_list if mrr_of(w, cat) > 0]
        mrr = sum(mrr_of(w, cat) for w in paying)
        by = {}
        for w in ws_list:
            b = by.setdefault(w["plan_id"], {"count": 0, "mrr": 0.0}); b["count"] += 1; b["mrr"] += mrr_of(w, cat)
        total = max(1, len(ws_list))
        by_plan = [{"id": p["id"], "name": p["name"], "count": by.get(p["id"], {}).get("count", 0), "mrr": round(by.get(p["id"], {}).get("mrr", 0), 2),
                    "pct": round(100 * by.get(p["id"], {}).get("count", 0) / total, 1), "color": PLAN_COLORS.get(p["id"], "#9DB4F5")} for p in cat.values()]
        days = max(1, int((now - start) / 86400) + 1)
        series = {r["d"]: r["n"] for r in db.q("""SELECT to_char(to_timestamp(created) AT TIME ZONE ?, 'YYYY-MM-DD') d, COUNT(*) n FROM workspaces
                                                   WHERE created>=? GROUP BY d""", (db.TZ, start))}
        days_list = [(dt.date.fromtimestamp(start) + dt.timedelta(days=i)) for i in range(days) if dt.date.fromtimestamp(start) + dt.timedelta(days=i) <= today]
        signups = [{"d": d.isoformat(), "n": series.get(d.isoformat(), 0)} for d in days_list]
        failed = db.q("SELECT amount FROM payments WHERE status IN ('failed','abandoned') AND created>?", (start,))
        cancellations = db.q1("SELECT COUNT(*) n FROM admin_audit WHERE action IN ('plan.cancel','plan.lapsed') AND ts>?", (start,))["n"]
        recent = []
        for w in ws_list[:5]:
            o = owner_of(w)
            recent.append({"id": w["id"], "name": w["name"], "plan": (plans.get(w["plan_id"]) or {}).get("name", ""), "created": w["created"],
                           "owner": f"{o['first_name']} {o['last_name']}".strip() + f" · {o['email']}" if o else ""})
        new_in_period = sum(1 for w in ws_list if w["created"] >= start)
        return jsonify(period=period, label=label, customers=len(ws_list), new=new_in_period, paying=len(paying), paying_pct=round(100 * len(paying) / total),
                       mrr=round(mrr, 2), cancellations=cancellations, failed=len(failed), failed_amount=round(sum(f["amount"] for f in failed), 2),
                       signups=signups, by_plan=by_plan, recent=recent, attention=attention(), currency="GHS", first_day=signups[0]["d"] if signups else None)

    # ---- customers ----------------------------------------------------------------------
    def filtered_customers():
        q = (request.args.get("q") or "").strip().lower()
        tab, plan, sort = request.args.get("tab", "all"), request.args.get("plan", ""), request.args.get("sort", "newest")
        cat = catalogue()
        rows = [customer_row(w, cat) for w in all_workspaces()]
        counts = {"all": len(rows), "paid": sum(1 for r in rows if r["plan_id"] != "free"), "free": sum(1 for r in rows if r["plan_id"] == "free"),
                  "past_due": sum(1 for r in rows if r["status"] in ("Past due", "Lapsed")), "suspended": sum(1 for r in rows if r["suspended"])}
        if tab == "paid": rows = [r for r in rows if r["plan_id"] != "free"]
        elif tab == "free": rows = [r for r in rows if r["plan_id"] == "free"]
        elif tab == "past_due": rows = [r for r in rows if r["status"] in ("Past due", "Lapsed")]
        elif tab == "suspended": rows = [r for r in rows if r["suspended"]]
        if plan: rows = [r for r in rows if r["plan_id"] == plan]
        if q: rows = [r for r in rows if q in r["name"].lower() or (r["owner"] and q in (r["owner"]["email"] + r["owner"]["name"]).lower())]
        if sort == "revenue": rows.sort(key=lambda r: -r["mrr"])
        elif sort == "sites": rows.sort(key=lambda r: -r["sites"])
        return rows, counts

    @bp.get("/customers")
    def customers():
        rows, counts = filtered_customers()
        page = max(int(request.args.get("page", 1)), 1)
        return jsonify(total=len(rows), page=page, per_page=10, counts=counts, customers=rows[(page - 1) * 10: page * 10])

    @bp.get("/customers.csv")
    def customers_csv():
        rows, _ = filtered_customers()
        return csv_response("customers", ["Workspace", "Owner", "Email", "Plan", "Websites", "Team", "Status", "MRR (GHS)", "Joined"],
                            [[r["name"], r["owner"]["name"] if r["owner"] else "", r["owner"]["email"] if r["owner"] else "", r["plan_name"], r["sites"], r["members"],
                              r["status"], r["mrr"], dt.date.fromtimestamp(r["created"]).isoformat()] for r in rows])

    def ws_or_404(ws_id):
        return accounts.workspace(ws_id) or abort(404, "Unknown customer")

    def trail(ws):
        events = []
        for a in db.q("SELECT a.ts, a.action, a.detail, u.first_name FROM admin_audit a LEFT JOIN users u ON u.id=a.admin_id WHERE a.workspace_id=? ORDER BY a.ts DESC LIMIT 30", (ws["id"],)):
            who = a["first_name"] or "System"
            text = {"support.start": f"{who} viewed the workspace as owner. {a['detail']}", "support.stop": f"{who} ended the support session",
                    "support.mode": f"{who} changed the support session: {a['detail']}", "note": f"{who} added an internal note",
                    "customer.update": f"{who} updated the account: {a['detail']}", "payment.link": f"{who} sent a payment link to the owner",
                    "payment.retry": f"{who} retried the payment ({a['detail']})", "payment.refund": f"{who} refunded GHS {a['detail']}",
                    "plan.cancel": a["detail"], "plan.lapsed": a["detail"]}.get(a["action"], f"{who}: {a['action']} {a['detail']}")
            events.append({"ts": a["ts"], "text": text, "tone": "bad" if a["action"] == "plan.lapsed" else "purple" if a["action"] != "plan.cancel" else "muted"})
        for p in db.q("SELECT * FROM payments WHERE workspace_id=? AND status IN ('success','failed','abandoned','refunded') ORDER BY created DESC LIMIT 10", (ws["id"],)):
            ok = p["status"] in ("success", "refunded")
            events.append({"ts": p["paid"] or p["created"], "tone": "ok" if ok else "bad",
                           "text": (f"Owner chose the {p['plan_id'].title()} plan and paid GHS {p['amount']:,.0f}" if p["kind"] == "subscription" else f"Renewal of GHS {p['amount']:,.0f} paid")
                           if ok else f"Payment of GHS {p['amount']:,.0f} failed"})
        for s in db.q("SELECT name, url, created FROM sites WHERE workspace_id=? ORDER BY created DESC LIMIT 5", (ws["id"],)):
            events.append({"ts": s["created"], "tone": "ok", "text": f"Owner added website {s['url'].split('//')[-1]}"})
        events.append({"ts": ws["created"], "tone": "muted", "text": "Workspace created"})
        events.sort(key=lambda e: -e["ts"])
        return events[:12]

    @bp.get("/customers/<int:ws_id>")
    def customer(ws_id):
        w = ws_or_404(ws_id)
        cat = catalogue()
        row = customer_row(w, cat)
        now = time.time()
        plan = plans.limits(w)
        site_rows = sites.list_ws(ws_id)
        ids = [s["id"] for s in site_rows]
        site_out = []
        for s in site_rows:
            last = db.q1("SELECT ts, ok FROM checks WHERE site_id=? ORDER BY ts DESC LIMIT 1", (s["id"],))
            inc = db.open_incident(s["id"])
            site_out.append({"id": s["id"], "name": s["name"], "url": s["url"], "paused": s["paused"], "last_check": last["ts"] if last else None,
                             "status": "paused" if s["paused"] else "down" if inc else "up" if last and last["ok"] else "unknown"})
        checks = db.q1("SELECT COUNT(*) n FROM checks WHERE site_id = ANY(?) AND ts>?", (ids, _month_start()))["n"] if ids else 0
        used_bytes = db.q1("""SELECT COALESCE(SUM(i.size),0) n FROM invoices i JOIN subscriptions s ON s.id=i.subscription_id WHERE s.workspace_id=?""", (ws_id,))["n"]
        pays = db.q("SELECT * FROM payments WHERE workspace_id=? ORDER BY created DESC LIMIT 30", (ws_id,))
        revenue = sum((p["amount"] - (p["refunded"] or 0)) for p in pays if p["status"] in ("success", "refunded"))
        failed_recent = next((p for p in pays if p["status"] in ("failed", "abandoned")), None)
        base = cat.get(w["plan_id"])
        nxt = (dt.datetime.fromtimestamp(w["plan_renews"]).strftime("%-d %b %Y") if w["plan_renews"] else "None")
        if w["plan_status"] == "past_due":
            nxt += " (payment failed)"
        team = accounts.team(ws_id)
        return jsonify(
            customer=row, limits_override=w["limits_override"], base_limits={k: base[k] for k in plans.OVERRIDABLE} if base else {},
            owner=row["owner"], billing=[
                {"k": "Plan", "v": f"{plan['name']}, billed {w['cycle']}"},
                {"k": "Price", "v": "Free" if not base or base["price_month"] == 0 else f"GHS {plans.price(base, w['cycle']):,.2f} / {'year' if w['cycle'] == 'yearly' else 'month'}"},
                {"k": "Next renewal", "v": nxt}, {"k": "Payment method", "v": w["paystack_card"] or ("Mobile money or one-off card" if w["plan_id"] != "free" else "None")},
                {"k": "Revenue so far", "v": f"GHS {revenue:,.2f}"},
                {"k": "Discount or override", "v": "Complimentary" if w["comped"] else ("Custom limits" if w["limits_override"] else "None")}],
            usage=[{"label": "Websites", "text": f"{row['sites']} of {plan['sites']}", "pct": row["sites"] / max(plan["sites"], 1)},
                   {"label": "Team members", "text": f"{team['members'].__len__()} of {plan['members']}", "pct": len(team["members"]) / max(plan["members"], 1)},
                   {"label": "Checks run this month", "text": f"{checks:,}", "pct": min(1, checks / 50000)},
                   {"label": "Invoice storage", "text": f"{used_bytes / 1048576:.0f} MB of {plan['storage_mb']:,} MB", "pct": used_bytes / max(plan["storage_mb"] * 1048576, 1)}],
            sites=site_out, team=team, plan_limit_team=plan["members"],
            payments=[{"reference": p["reference"], "plan_id": p["plan_id"], "cycle": p["cycle"], "amount": p["amount"], "status": p["status"],
                       "method": p["method"], "created": p["created"], "paid": p["paid"], "refunded": p["refunded"]} for p in pays],
            failed=({"ts": failed_recent["created"], "amount": failed_recent["amount"], "plan_id": failed_recent["plan_id"]}
                    if failed_recent and w["plan_status"] in ("past_due", "lapsed") else None),
            notes=[{"ts": n["ts"], "admin": n["first_name"] or "Admin", "text": n["detail"]} for n in db.q(
                "SELECT a.ts, a.detail, u.first_name FROM admin_audit a LEFT JOIN users u ON u.id=a.admin_id WHERE a.workspace_id=? AND a.action='note' ORDER BY a.ts DESC LIMIT 20", (ws_id,))],
            audit=trail(w), grace_days=billing.GRACE_DAYS, plans=[{"id": p["id"], "name": p["name"]} for p in cat.values()])

    @bp.patch("/customers/<int:ws_id>")
    def customer_update(ws_id):
        w, d = ws_or_404(ws_id), body()
        changes = []
        if "plan_id" in d:
            p = plans.get(d["plan_id"]) or abort(400, "Unknown plan")
            cycle = d.get("cycle") or w["cycle"]
            days = int(d.get("extend_days") or (365 if cycle == "yearly" else 30))
            billing.switch_plan(cfg, w, p["id"], cycle, None if p["id"] == "free" else time.time() + days * 86400)
            changes.append(f"plan {p['id']} ({cycle}, {days} days)")
        if "free_days" in d:
            days = max(1, int(d["free_days"]))
            base = max(w["plan_renews"] or 0, time.time())
            db.exec("UPDATE workspaces SET plan_renews=?, plan_status='active' WHERE id=?", (base + days * 86400, ws_id))
            changes.append(f"free period of {days} days")
        for f in ("comped", "suspended"):
            if f in d:
                db.exec(f"UPDATE workspaces SET {f}=? WHERE id=?", (int(bool(d[f])), ws_id))
                changes.append(f"{f} {bool(d[f])}")
        if "limits_override" in d:
            clean = {k: int(v) for k, v in (d["limits_override"] or {}).items() if k in plans.OVERRIDABLE and v not in (None, "")}
            db.exec("UPDATE workspaces SET limits_override=? WHERE id=?", (json.dumps(clean) if clean else None, ws_id))
            changes.append(f"custom limits {clean or 'removed'}")
        sites.enforce_limit(cfg, accounts.workspace(ws_id))
        audit("customer.update", ws_id, "; ".join(changes))
        return customer(ws_id)

    @bp.post("/customers/<int:ws_id>/notes")
    def add_note(ws_id):
        ws_or_404(ws_id)
        text = (body().get("text") or "").strip()
        if not text:
            raise ValueError("Write a note first.")
        audit("note", ws_id, text[:900])
        return customer(ws_id)

    @bp.post("/customers/<int:ws_id>/payment-link")
    def payment_link(ws_id):
        to = billing.send_payment_link(ws_or_404(ws_id))
        audit("payment.link", ws_id, to)
        return jsonify(sent_to=to)

    @bp.post("/customers/<int:ws_id>/retry-payment")
    def retry_payment(ws_id):
        out = billing.retry_payment(cfg, ws_or_404(ws_id))
        audit("payment.retry", ws_id, out)
        return jsonify(result=out)

    @bp.post("/customers/<int:ws_id>/refund")
    def refund(ws_id):
        ws_or_404(ws_id)
        d = body()
        amount = billing.refund(d.get("reference"), d.get("amount") or None)
        audit("payment.refund", ws_id, f"{amount:.2f} on {d.get('reference')}")
        return customer(ws_id)

    # ---- support sessions (impersonation) ----------------------------------------------------
    @bp.post("/customers/<int:ws_id>/support")
    def support_start(ws_id):
        ws_or_404(ws_id)
        d = body()
        reason = (d.get("reason") or "").strip()
        if len(reason) < 10:
            raise ValueError("Write a reason of at least 10 characters. It goes in the audit log.")
        mode = "edit" if d.get("mode") == "edit" else "view"
        until = time.time() + SUPPORT_MINUTES * 60
        session["imp"] = {"ws": ws_id, "until": until, "reason": reason, "mode": mode}
        audit("support.start", ws_id, f"{'Full access' if mode == 'edit' else 'View only'}. Reason: {reason}")
        return jsonify(ok=True, until=until, mode=mode)

    @bp.post("/support/mode")
    def support_mode():
        imp = session.get("imp")
        if not imp or imp["until"] < time.time():
            raise ValueError("No support session is open.")
        mode = "edit" if body().get("mode") == "edit" else "view"
        session["imp"] = {**imp, "mode": mode}
        audit("support.mode", imp["ws"], "full access" if mode == "edit" else "view only")
        return jsonify(ok=True, mode=mode)

    @bp.post("/support/stop")
    def support_stop():
        imp = session.pop("imp", None)
        if imp and g.user:
            audit("support.stop", imp["ws"])
        return jsonify(ok=True)

    # ---- plans and prices ----------------------------------------------------------------------
    def plans_payload():
        counts = {r["plan_id"]: r["n"] for r in db.q("SELECT plan_id, COUNT(*) n FROM workspaces GROUP BY plan_id")}
        wm = plans.watermark()
        return {"plans": [{**p, "customers": counts.get(p["id"], 0)} for p in plans.all_plans(False)], "yearly_discount": plans.yearly_discount(),
                "watermark_text": wm["text"], "watermark_strength": wm["strength"], "methods": METHODS, "currency": "GHS"}

    @bp.get("/plans")
    def plans_list():
        return jsonify(plans_payload())

    @bp.put("/plans")
    def plans_save():
        d = body()
        s = d.get("settings") or {}
        if "yearly_discount" in s:
            v = float(s["yearly_discount"])
            if not 0 <= v <= 60:
                raise ValueError("The yearly discount must be between 0 and 60 percent.")
        if "watermark_strength" in s and int(s["watermark_strength"]) not in (8, 15, 25):
            raise ValueError("Choose Light, Medium or Strong for the watermark.")
        for p in d.get("plans") or []:
            plans.get(p.get("id")) or abort(400, "Unknown plan")
            sets, args = [], []
            for f in ("price_month",):
                if f in p:
                    v = float(p[f])
                    if v < 0: raise ValueError("Prices can't be negative.")
                    sets.append(f"{f}=?"); args.append(v)
            for f in ("sites", "members", "interval_minutes", "sms", "history_months", "audit_pages", "storage_mb"):
                if f in p:
                    v = int(float(p[f]))
                    if v < 0 or (f in ("sites", "members", "interval_minutes") and v < 1):
                        raise ValueError(f"{f.replace('_', ' ')} must be at least 1." if f in ("sites", "members", "interval_minutes") else "Limits can't be negative.")
                    sets.append(f"{f}=?"); args.append(v)
            for f in ("clean_reports", "client_access", "active", "priority_support"):
                if f in p:
                    sets.append(f"{f}=?"); args.append(int(bool(p[f])))
            if "channels" in p:
                sets.append("channels=?"); args.append(json.dumps([c for c in p["channels"] if c in ("email", "chat", "sms")]))
            if sets:
                db.run(f"UPDATE plans SET {', '.join(sets)} WHERE id=?", (*args, p["id"]))
        if s:
            cur = db.kv_get("platform") or {}
            for k in ("yearly_discount", "watermark_text", "watermark_strength"):
                if k in s:
                    cur[k] = s[k] if k == "watermark_text" else float(s[k])
            cur["watermark_text"] = (cur.get("watermark_text") or "Made with SiteWatch")[:60]
            db.kv_set("platform", cur)
        audit("plans.save", None, json.dumps(d)[:900])
        return jsonify(plans_payload())

    # ---- payments ---------------------------------------------------------------------------------
    LABEL = {"success": "Paid", "failed": "Failed", "abandoned": "Failed", "pending": "Pending", "refunded": "Refunded"}

    def payment_rows(status=None):
        rows = db.q("""SELECT p.*, w.name workspace FROM payments p JOIN workspaces w ON w.id=p.workspace_id ORDER BY p.created DESC LIMIT 500""")
        out = []
        for p in rows:
            label = LABEL.get(p["status"], p["status"])
            if status and status != "all" and label.lower() != status:
                continue
            out.append({**p, "label": label, "method": p["method"] or (p["channel"] or "").replace("_", " ").title() or "—"})
        return out

    @bp.get("/payments")
    def payments():
        now = time.time()
        month = _month_start()
        allp = payment_rows()
        ok = [p for p in allp if p["status"] in ("success", "refunded") and (p["paid"] or p["created"]) >= month]
        failed_all = [p for p in allp if p["status"] in ("failed", "abandoned")]
        recent_failed = [p for p in failed_all if p["created"] > now - 14 * 86400]
        momo = [p for p in ok if p["channel"] == "mobile_money"]
        refunds = sum((p["refunded"] or 0) for p in allp if (p["refunded"] or 0) and (p["paid"] or p["created"]) >= month)
        counts = {k: sum(1 for p in allp if p["label"].lower() == k) for k in ("paid", "failed", "pending", "refunded")}
        status = request.args.get("status", "all")
        return jsonify(
            tiles={"collected": round(sum(p["amount"] - (p["refunded"] or 0) for p in ok), 2), "successful": len(ok), "failed": len(recent_failed),
                   "at_risk": round(sum(p["amount"] for p in recent_failed), 2), "refunds": round(refunds, 2),
                   "momo_pct": round(100 * len(momo) / len(ok)) if ok else 0},
            counts=counts, followup=[{"reference": p["reference"], "workspace_id": p["workspace_id"], "workspace": p["workspace"], "plan": p["plan_id"],
                                      "method": p["method"], "amount": p["amount"], "created": p["created"], "status": p["status"]} for p in recent_failed[:10]],
            payments=[{k: p[k] for k in ("reference", "workspace", "workspace_id", "plan_id", "cycle", "amount", "method", "label", "created", "paid")}
                      for p in payment_rows(status)[:100]])

    @bp.get("/payments.csv")
    def payments_csv():
        return csv_response("payments", ["Date", "Customer", "Plan", "Amount (GHS)", "Method", "Status", "Reference"],
                            [[dt.datetime.fromtimestamp(p["paid"] or p["created"]).strftime("%Y-%m-%d %H:%M"), p["workspace"], p["plan_id"], p["amount"],
                              p["method"], p["label"], p["reference"]] for p in payment_rows(request.args.get("status"))])

    @bp.post("/payments/<reference>/retry")
    def payment_retry(reference):
        p = db.q1("SELECT workspace_id FROM payments WHERE reference=?", (reference,)) or abort(404)
        out = billing.retry_payment(cfg, ws_or_404(p["workspace_id"]))
        audit("payment.retry", p["workspace_id"], out)
        return jsonify(result=out)

    @bp.post("/payments/<reference>/email")
    def payment_email(reference):
        p = db.q1("SELECT workspace_id FROM payments WHERE reference=?", (reference,)) or abort(404)
        to = billing.send_payment_link(ws_or_404(p["workspace_id"]))
        audit("payment.link", p["workspace_id"], to)
        return jsonify(sent_to=to)

    # ---- health, announcement, audit ----------------------------------------------------------------
    @bp.get("/health")
    def platform_health():
        now = time.time()
        services, bal = health_services()
        sites_live = db.q1("SELECT COUNT(*) n FROM sites WHERE paused=0")["n"]
        per_min = db.q1("SELECT COUNT(*) n FROM checks WHERE ts>?", (now - 600,))["n"] / 10
        failed_hour = db.q1("SELECT COUNT(*) n FROM checks WHERE ts>? AND ok=0", (now - 3600,))["n"]
        today0 = dt.datetime.combine(dt.date.today(), dt.time()).timestamp()
        audits_queued = db.q1("""SELECT COUNT(*) n FROM sites s WHERE s.paused=0 AND s.audit=1 AND
                                 COALESCE((SELECT MAX(ts) FROM audits a WHERE a.site_id=s.id), 0) < ?""", (today0,))["n"]
        db_bytes = db.q1("SELECT pg_database_size(current_database()) n")["n"]
        cap_gb = float(os.environ.get("DB_CAPACITY_GB", "10"))
        day = int(cfg["report"]["day_of_month"]); t = dt.date.today()
        nxt = dt.date(t.year + (t.month == 12), t.month % 12 + 1, day) if t.day >= day else dt.date(t.year, t.month, day)
        return jsonify(
            services=services,
            volume=[{"label": "Uptime checks per minute", "value": f"{per_min:,.0f}", "pct": min(100, per_min / 20)},
                    {"label": "Active websites monitored", "value": f"{sites_live:,}", "pct": min(100, sites_live / 10)},
                    {"label": "Failed checks (last hour)", "value": f"{failed_hour:,}", "pct": min(100, failed_hour / max(per_min * 60, 1) * 100), "tone": "warn"},
                    {"label": "Audits queued", "value": f"{audits_queued:,}", "pct": min(100, audits_queued)},
                    {"label": "Database size", "value": f"{db_bytes / 1073741824:.1f} GB of {cap_gb:g} GB", "pct": min(100, db_bytes / 1073741824 / cap_gb * 100)}],
            messages=[{"k": "Alert emails", "v": str(db.q1("SELECT COUNT(*) n FROM incidents WHERE started>?", (today0,))["n"] + db.q1("SELECT COUNT(*) n FROM alerts_sent WHERE ts>?", (today0,))["n"])},
                      {"k": "SMS alerts", "v": str(db.q1("SELECT COUNT(*) n FROM sms_log WHERE ok=1 AND ts>?", (today0,))["n"])},
                      {"k": "Verification codes sent", "v": str(db.q1("SELECT COUNT(*) n FROM email_codes WHERE created>?", (today0,))["n"])},
                      {"k": "Monthly reports queued", "v": f"0 (next run {nxt.strftime('%-d %b')})"}],
            errors=db.q("SELECT ts, source, text FROM error_log ORDER BY ts DESC LIMIT 8"),
            announcement=db.kv_get("announcement"), sms_wallet=bal)

    @bp.post("/announcement")
    def announce():
        d = body()
        msg = (d.get("message") or "").strip()
        if not msg:
            raise ValueError("Write the message to show.")
        aud = d.get("audience") if d.get("audience") in AUDIENCES else "everyone"
        db.kv_set("announcement", {"message": msg[:300], "audience": aud, "ts": time.time()})
        audit("announcement", None, f"{aud}: {msg[:200]}")
        return jsonify(announcement=db.kv_get("announcement"))

    @bp.delete("/announcement")
    def announce_clear():
        db.kv_set("announcement", None)
        audit("announcement.clear")
        return jsonify(ok=True)

    @bp.get("/activity")
    def activity():
        """One feed of what people did on the platform: accounts, billing, team, websites, admin actions and messages."""
        kind = request.args.get("type", "all")
        before = float(request.args.get("before") or time.time() + 1)
        limit = 60
        ev = []

        def add(ts, typ, tone, title, detail="", ws_id=None, ws=None):
            ev.append({"ts": ts, "type": typ, "tone": tone, "title": title, "detail": detail, "workspace_id": ws_id, "workspace": ws})

        want = lambda t: kind in ("all", t)
        if want("accounts"):
            for u in db.q("SELECT id, email, first_name, last_name, created, last_login FROM users WHERE created<? ORDER BY created DESC LIMIT ?", (before, limit)):
                add(u["created"], "accounts", "ok", f"{u['first_name']} {u['last_name']} created an account".strip(), u["email"])
            for u in db.q("SELECT email, first_name, last_name, last_login FROM users WHERE last_login IS NOT NULL AND last_login<? ORDER BY last_login DESC LIMIT ?", (before, limit)):
                add(u["last_login"], "accounts", "muted", f"{u['first_name']} {u['last_name']} logged in".strip(), u["email"])
            for w in db.q("SELECT id, name, created FROM workspaces WHERE created<? ORDER BY created DESC LIMIT ?", (before, limit)):
                add(w["created"], "accounts", "ok", f"Workspace {w['name']} was created", "", w["id"], w["name"])
        if want("billing"):
            for p in db.q("""SELECT p.*, w.name wname FROM payments p JOIN workspaces w ON w.id=p.workspace_id WHERE COALESCE(p.paid,p.created)<? ORDER BY COALESCE(p.paid,p.created) DESC LIMIT ?""", (before, limit)):
                ok = p["status"] in ("success", "refunded")
                add(p["paid"] or p["created"], "billing", "ok" if ok else "bad" if p["status"] in ("failed", "abandoned") else "warn",
                    f"{'Payment of' if ok else 'Payment attempt of'} GHS {p['amount']:,.2f} {'received' if ok else p['status']}", f"{p['plan_id'].title()} plan, {p['cycle']}", p["workspace_id"], p["wname"])
            for a in db.q("""SELECT a.*, w.name wname FROM admin_audit a LEFT JOIN workspaces w ON w.id=a.workspace_id
                             WHERE a.action IN ('plan.cancel','plan.lapsed') AND a.ts<? ORDER BY a.ts DESC LIMIT ?""", (before, limit)):
                add(a["ts"], "billing", "bad" if a["action"] == "plan.lapsed" else "warn", a["detail"], "", a["workspace_id"], a["wname"])
        if want("team"):
            for i in db.q("""SELECT i.*, w.name wname, u.first_name FROM invitations i JOIN workspaces w ON w.id=i.workspace_id LEFT JOIN users u ON u.id=i.invited_by
                             WHERE i.created<? ORDER BY i.created DESC LIMIT ?""", (before, limit)):
                add(i["created"], "team", "purple", f"{i['first_name'] or 'Someone'} invited {i['email']} as {i['role']}", "", i["workspace_id"], i["wname"])
                if i["accepted"] and i["accepted"] < before:
                    add(i["accepted"], "team", "ok", f"{i['email']} joined as {i['role']}", "", i["workspace_id"], i["wname"])
        if want("websites"):
            for st in db.q("SELECT s.name, s.url, s.created, s.workspace_id, w.name wname FROM sites s JOIN workspaces w ON w.id=s.workspace_id WHERE s.created<? ORDER BY s.created DESC LIMIT ?", (before, limit)):
                add(st["created"], "websites", "ok", f"Website {st['url'].split('//')[-1]} was added", st["name"], st["workspace_id"], st["wname"])
            for st in db.q("""SELECT i.site_id, i.started, i.cause, s.name, s.workspace_id, w.name wname FROM incidents i JOIN sites s ON s.id=i.site_id JOIN workspaces w ON w.id=s.workspace_id
                              WHERE i.started<? ORDER BY i.started DESC LIMIT ?""", (before, limit)):
                add(st["started"], "websites", "bad", f"{st['name']} went down", st["cause"] or "", st["workspace_id"], st["wname"])
        if want("admin"):
            for a in db.q("""SELECT a.*, u.first_name, w.name wname FROM admin_audit a LEFT JOIN users u ON u.id=a.admin_id LEFT JOIN workspaces w ON w.id=a.workspace_id
                             WHERE a.action NOT IN ('contact','plan.cancel','plan.lapsed') AND a.ts<? ORDER BY a.ts DESC LIMIT ?""", (before, limit)):
                who = a["first_name"] or "An admin"
                title = {"support.start": f"{who} started a support session", "support.stop": f"{who} ended a support session", "support.mode": f"{who} changed the support session",
                         "note": f"{who} added an internal note", "customer.update": f"{who} updated an account", "payment.link": f"{who} sent a payment link",
                         "payment.retry": f"{who} retried a payment", "payment.refund": f"{who} refunded a payment", "plans.save": f"{who} changed plans and pricing",
                         "announcement": f"{who} published a banner", "announcement.clear": f"{who} removed the banner"}.get(a["action"], f"{who}: {a['action']}")
                add(a["ts"], "admin", "purple", title, a["detail"] if a["action"] != "plans.save" else "", a["workspace_id"], a["wname"])
        if want("messages"):
            for m in db.q("SELECT ts, detail FROM admin_audit WHERE action='contact' AND ts<? ORDER BY ts DESC LIMIT ?", (before, limit)):
                first = (m["detail"] or "").splitlines()[0].replace("From:", "").strip()
                add(m["ts"], "messages", "purple", f"Message from {first.split('<')[0].strip() or 'a visitor'}", "\n".join((m["detail"] or "").splitlines()[1:])[:300])
        ev.sort(key=lambda e: -e["ts"])
        page = ev[:limit]
        return jsonify(events=page, more=len(ev) > limit, next=page[-1]["ts"] if page else None)

    @bp.get("/audit")
    def audit_log():
        return jsonify(events=db.q("""SELECT a.ts, a.action, a.detail, a.workspace_id, u.email admin FROM admin_audit a
                                      LEFT JOIN users u ON u.id=a.admin_id WHERE a.action != 'contact'
                                      ORDER BY a.ts DESC LIMIT 200"""))

    @bp.get("/messages")
    def messages():
        return jsonify(messages=db.q("SELECT ts, detail FROM admin_audit WHERE action='contact' ORDER BY ts DESC LIMIT 100"))

    return bp
