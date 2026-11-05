"""Super admin area: customers, plans and prices, payments, platform health and support sessions."""
import json
import time

from flask import Blueprint, abort, g, jsonify, request, session

from . import accounts, billing, db, mailer, plans, sites, sms, storage
from .ctx import SUPPORT_MINUTES, super_required


def audit(action, ws_id=None, detail=""):
    db.exec("INSERT INTO admin_audit(ts, admin_id, workspace_id, action, detail) VALUES (?,?,?,?,?)",
            (time.time(), g.user["id"], ws_id, action, detail[:1000]))


def blueprint(cfg):
    bp = Blueprint("admin_api", __name__, url_prefix="/api/admin")

    def body():
        return request.get_json(silent=True) or {}

    @bp.before_request
    def guard():
        if request.path.endswith("/support/stop"):
            return None
        return super_required(lambda: None)()

    def customer_row(w):
        owner = accounts.user_by_id(w["owner_id"]) if w["owner_id"] else None
        u = plans.usage(w["id"])
        return {"id": w["id"], "name": w["name"], "plan_id": w["plan_id"], "plan_status": w["plan_status"], "cycle": w["cycle"],
                "suspended": w["suspended"], "comped": w["comped"], "created": w["created"], "sites": u["sites"], "members": u["members"],
                "owner": {"name": f"{owner['first_name']} {owner['last_name']}".strip(), "email": owner["email"],
                          "last_login": owner["last_login"]} if owner else None,
                "renews": w["plan_renews"]}

    @bp.get("/overview")
    def overview():
        now = time.time()
        month_ago = now - 30 * 86400
        paid = db.q("SELECT plan_id, cycle FROM workspaces WHERE plan_id!='free' AND comped=0 AND plan_status IN ('active','past_due')")
        catalogue = {p["id"]: p for p in plans.all_plans(False)}
        mrr = sum(plans.price(catalogue[w["plan_id"]], w["cycle"]) / (12 if w["cycle"] == "yearly" else 1) for w in paid if w["plan_id"] in catalogue)
        signups = db.q("""SELECT to_char(to_timestamp(created) AT TIME ZONE ?, 'YYYY-MM-DD') d, COUNT(*) n FROM workspaces
                          WHERE created>? GROUP BY d ORDER BY d""", (db.TZ, month_ago))
        by_plan = db.q("SELECT plan_id, COUNT(*) n FROM workspaces GROUP BY plan_id")
        return jsonify(
            customers=db.q1("SELECT COUNT(*) n FROM workspaces")["n"], paying=len(paid), mrr=round(mrr, 2),
            new30=db.q1("SELECT COUNT(*) n FROM workspaces WHERE created>?", (month_ago,))["n"],
            sites=db.q1("SELECT COUNT(*) n FROM sites")["n"],
            revenue30=db.q1("SELECT COALESCE(SUM(amount),0) s FROM payments WHERE status='success' AND paid>?", (month_ago,))["s"],
            past_due=db.q1("SELECT COUNT(*) n FROM workspaces WHERE plan_status='past_due'")["n"],
            signups=signups, by_plan={r["plan_id"]: r["n"] for r in by_plan}, currency="GHS")

    @bp.get("/customers")
    def customers():
        q = (request.args.get("q") or "").strip().lower()
        plan = request.args.get("plan")
        status = request.args.get("status")
        page = max(int(request.args.get("page", 1)), 1)
        where, args = [], []
        if q:
            where.append("(lower(w.name) LIKE ? OR EXISTS (SELECT 1 FROM users u WHERE u.id=w.owner_id AND lower(u.email) LIKE ?))")
            args += [f"%{q}%", f"%{q}%"]
        if plan:
            where.append("w.plan_id=?"); args.append(plan)
        if status == "suspended":
            where.append("w.suspended=1")
        elif status:
            where.append("w.plan_status=?"); args.append(status)
        clause = (" WHERE " + " AND ".join(where)) if where else ""
        total = db.q1(f"SELECT COUNT(*) n FROM workspaces w{clause}", args)["n"]
        rows = db.q(f"SELECT w.* FROM workspaces w{clause} ORDER BY w.created DESC LIMIT 25 OFFSET ?", (*args, (page - 1) * 25))
        return jsonify(total=total, page=page, customers=[customer_row(accounts._ws(r)) for r in rows])

    def ws_or_404(ws_id):
        return accounts.workspace(ws_id) or abort(404, "Unknown customer")

    @bp.get("/customers/<int:ws_id>")
    def customer(ws_id):
        w = ws_or_404(ws_id)
        now = time.time()
        return jsonify(
            customer=customer_row(w), workspace=accounts.public_workspace(w), notes=w["notes"], sms_bonus=w["sms_bonus"],
            card=w["paystack_card"], team=accounts.team(ws_id), payments=billing.history(ws_id),
            sites=[{"id": s["id"], "name": s["name"], "url": s["url"], "paused": s["paused"]} for s in sites.list_ws(ws_id)],
            sms_30d=db.q1("SELECT COUNT(*) n FROM sms_log WHERE workspace_id=? AND ok=1 AND ts>?", (ws_id, now - 30 * 86400))["n"],
            audit=db.q("SELECT ts, action, detail FROM admin_audit WHERE workspace_id=? ORDER BY ts DESC LIMIT 20", (ws_id,)))

    @bp.patch("/customers/<int:ws_id>")
    def customer_update(ws_id):
        w, d = ws_or_404(ws_id), body()
        changes = []
        if "plan_id" in d:
            p = plans.get(d["plan_id"]) or abort(400, "Unknown plan")
            cycle = d.get("cycle") or w["cycle"]
            days = int(d.get("extend_days") or (365 if cycle == "yearly" else 30))
            billing.switch_plan(cfg, w, p["id"], cycle, None if p["id"] == "free" else time.time() + days * 86400)
            changes.append(f"plan -> {p['id']} ({cycle}, {days} days)")
        for f in ("comped", "suspended"):
            if f in d:
                db.exec(f"UPDATE workspaces SET {f}=? WHERE id=?", (int(bool(d[f])), ws_id))
                changes.append(f"{f} -> {bool(d[f])}")
        if "sms_bonus" in d:
            db.exec("UPDATE workspaces SET sms_bonus=? WHERE id=?", (max(0, int(d["sms_bonus"])), ws_id))
            changes.append(f"sms_bonus -> {d['sms_bonus']}")
        if "notes" in d:
            db.exec("UPDATE workspaces SET notes=? WHERE id=?", (str(d["notes"] or "")[:2000], ws_id))
            changes.append("notes edited")
        sites.enforce_limit(cfg, accounts.workspace(ws_id))
        audit("customer.update", ws_id, "; ".join(changes))
        return customer(ws_id)

    # ---- support sessions (impersonation) ------------------------------------
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
        audit("support.start", ws_id, f"{mode}: {reason}")
        return jsonify(ok=True, until=until, mode=mode)

    @bp.post("/support/stop")
    def support_stop():
        imp = session.pop("imp", None)
        if imp and g.user:
            audit("support.stop", imp["ws"])
        return jsonify(ok=True)

    # ---- plans and prices -----------------------------------------------------
    @bp.get("/plans")
    def plans_list():
        out = []
        for p in plans.all_plans(False):
            out.append({**p, "customers": db.q1("SELECT COUNT(*) n FROM workspaces WHERE plan_id=?", (p["id"],))["n"]})
        return jsonify(plans=out, yearly_discount=plans.yearly_discount())

    @bp.patch("/plans/<plan_id>")
    def plan_update(plan_id):
        plans.get(plan_id) or abort(404)
        d, sets, args = body(), [], []
        for f in ("name", "tagline"):
            if f in d:
                sets.append(f"{f}=?"); args.append(str(d[f])[:120])
        for f in ("price_month", "sites", "members", "interval_minutes", "sms", "history_months", "sort"):
            if f in d:
                v = float(d[f])
                if v < 0:
                    raise ValueError(f"{f} can't be negative.")
                sets.append(f"{f}=?"); args.append(v if f == "price_month" else int(v))
        for f in ("clean_reports", "client_access", "active"):
            if f in d:
                sets.append(f"{f}=?"); args.append(int(bool(d[f])))
        if "channels" in d:
            sets.append("channels=?"); args.append(json.dumps([c for c in d["channels"] if c in ("email", "chat", "sms")]))
        if sets:
            db.run(f"UPDATE plans SET {', '.join(sets)} WHERE id=?", (*args, plan_id))
        audit("plan.update", None, f"{plan_id}: {d}")
        return plans_list()

    @bp.patch("/settings")
    def settings_update():
        d = body()
        if "yearly_discount" in d:
            v = float(d["yearly_discount"])
            if not 0 <= v <= 90:
                raise ValueError("The yearly discount must be between 0 and 90 percent.")
            db.kv_set("platform", {**(db.kv_get("platform") or {}), "yearly_discount": v})
            audit("settings.discount", None, str(v))
        return plans_list()

    # ---- payments, health, audit ----------------------------------------------
    @bp.get("/payments")
    def payments():
        rows = db.q("""SELECT p.*, w.name workspace FROM payments p JOIN workspaces w ON w.id=p.workspace_id
                       ORDER BY p.created DESC LIMIT 100""")
        return jsonify(payments=rows, failed=sum(1 for r in rows if r["status"] in ("failed", "abandoned")))

    @bp.get("/health")
    def platform_health():
        now = time.time()
        beat = db.kv_get("heartbeat") or {}
        db_ok = bool(db.q1("SELECT 1 ok"))
        return jsonify(
            database=db_ok, worker={"last_beat": beat.get("ts"), "ok": bool(beat.get("ts") and now - beat["ts"] < 120),
                                    "sites": beat.get("sites")},
            checks_last_hour=db.q1("SELECT COUNT(*) n FROM checks WHERE ts>?", (now - 3600,))["n"],
            failed_checks_last_hour=db.q1("SELECT COUNT(*) n FROM checks WHERE ts>? AND ok=0", (now - 3600,))["n"],
            open_incidents=db.q1("SELECT COUNT(*) n FROM incidents WHERE ended IS NULL")["n"],
            sms_sent_24h=db.q1("SELECT COUNT(*) n FROM sms_log WHERE ok=1 AND ts>?", (now - 86400,))["n"],
            sms_failed_24h=db.q1("SELECT COUNT(*) n FROM sms_log WHERE ok=0 AND ts>?", (now - 86400,))["n"],
            sms_wallet=sms.balance(),
            integrations={"email": mailer.configured(), "storage": storage.cloud_enabled(), "payments": billing.configured(),
                          "sms": sms.configured(), "pagespeed": bool(cfg.get("pagespeed_api_key"))})

    @bp.get("/audit")
    def audit_log():
        return jsonify(events=db.q("""SELECT a.ts, a.action, a.detail, a.workspace_id, u.email admin FROM admin_audit a
                                      LEFT JOIN users u ON u.id=a.admin_id WHERE a.action != 'contact'
                                      ORDER BY a.ts DESC LIMIT 200"""))

    @bp.get("/messages")
    def messages():
        return jsonify(messages=db.q("SELECT ts, detail FROM admin_audit WHERE action='contact' ORDER BY ts DESC LIMIT 100"))

    return bp
