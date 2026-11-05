"""Plans, prices and the limits they impose. Plans live in the database so a super admin can edit them."""
import json
import time

from . import db

ROLES = ("owner", "admin", "member", "viewer")
DEFAULT_DISCOUNT = 20          # yearly billing, percent off; editable by a super admin


def _row(r):
    p = dict(r)
    p["channels"] = json.loads(p["channels"] or "[]")
    for f in ("clean_reports", "client_access", "active", "priority_support"):
        p[f] = bool(p[f])
    return p


def all_plans(only_active=True):
    rows = db.q("SELECT * FROM plans" + (" WHERE active=1" if only_active else "") + " ORDER BY sort")
    return [_row(r) for r in rows]


def get(plan_id):
    r = db.q1("SELECT * FROM plans WHERE id=?", (plan_id,))
    return _row(r) if r else None


def yearly_discount():
    v = db.kv_get("platform") or {}
    return float(v.get("yearly_discount", DEFAULT_DISCOUNT))


def price(plan, cycle):
    """Amount in GHS to charge for one billing period."""
    m = plan["price_month"]
    if cycle == "yearly":
        return round(m * 12 * (1 - yearly_discount() / 100), 2)
    return round(m, 2)


def public():
    d = yearly_discount()
    out = []
    for p in all_plans():
        out.append({**p, "price_year": price(p, "yearly"), "price_year_month": round(price(p, "yearly") / 12, 2)})
    return {"plans": out, "yearly_discount": d, "currency": "GHS"}


def usage(ws_id):
    sites = db.q1("SELECT COUNT(*) n FROM sites WHERE workspace_id=?", (ws_id,))["n"]
    members = db.q1("SELECT COUNT(*) n FROM memberships WHERE workspace_id=?", (ws_id,))["n"]
    pending = db.q1("SELECT COUNT(*) n FROM invitations WHERE workspace_id=? AND accepted IS NULL AND expires>?",
                    (ws_id, time.time()))["n"]
    return {"sites": sites, "members": members, "pending_invites": pending, "seats": members + pending,
            "sms": sms_used(ws_id)}


def sms_used(ws_id):
    t = time.localtime()
    start = time.mktime((t.tm_year, t.tm_mon, 1, 0, 0, 0, 0, 0, -1))
    return db.q1("SELECT COUNT(*) n FROM sms_log WHERE workspace_id=? AND ok=1 AND ts>=?", (ws_id, start))["n"]


OVERRIDABLE = ("sites", "members", "sms", "interval_minutes", "history_months", "audit_pages", "storage_mb")


def limits(ws):
    """Plan for a workspace row: a lapsed paid plan falls back to Free, and a super admin's custom limits win."""
    plan = get(ws["plan_id"]) or get("free")
    if ws["plan_status"] == "lapsed" and not ws.get("comped"):
        plan = get("free")
    custom = ws.get("limits_override") or {}
    if custom:
        plan = {**plan, **{k: int(v) for k, v in custom.items() if k in OVERRIDABLE and v not in (None, "")}}
    return plan


def watermark():
    """Text and strength (percent) of the Free plan report watermark, set by the super admin."""
    v = db.kv_get("platform") or {}
    return {"text": v.get("watermark_text") or "Made with SiteWatch", "strength": int(v.get("watermark_strength", 8))}


def check_can_add_site(ws):
    plan, u = limits(ws), usage(ws["id"])
    if u["sites"] >= plan["sites"]:
        raise LimitError(f"Your {plan['name']} plan includes {plan['sites']} website{'s' if plan['sites'] != 1 else ''}. "
                         "Upgrade to add more.")


def check_can_add_seat(ws, role):
    plan, u = limits(ws), usage(ws["id"])
    if role == "viewer" and not plan["client_access"]:
        raise LimitError(f"Client viewer access is not part of the {plan['name']} plan. Upgrade to Growth to share dashboards with clients.")
    if u["seats"] >= plan["members"]:
        raise LimitError(f"Your {plan['name']} plan includes {plan['members']} team member{'s' if plan['members'] != 1 else ''}, "
                         "counting pending invitations. Upgrade to add more.")


def sms_quota(ws):
    return limits(ws)["sms"] + (ws.get("sms_bonus") or 0)


class LimitError(ValueError):
    """A plan limit was reached. The API answers 402 so the app can show an upgrade prompt."""
