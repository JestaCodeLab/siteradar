"""Plans, prices and the limits they impose. Plans live in the database so a super admin can edit them."""
import json
import time

from . import db

ROLES = ("owner", "admin", "member", "viewer")
DEFAULT_DISCOUNT = 20          # yearly billing, percent off; editable by a super admin


def _row(r):
    p = dict(r)
    p["channels"] = json.loads(p["channels"] or "[]")
    for f in ("client_access", "active", "priority_support"):
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


CURRENCIES = ("GHS", "USD")


def currency_for_country(country):
    """Ghana pays in cedis and everywhere else, including an unknown country, in US dollars. Accepts a name ("Ghana") or a code ("GH")."""
    return "GHS" if (country or "").strip().lower() in ("ghana", "gh") else "USD"


def sms_allowed(ws):
    """Text alerts only reach Ghanaian numbers, so only workspaces in Ghana get them."""
    return currency_for_country(ws.get("country")) == "GHS"


def without_sms(plan):
    """The plan as a customer outside Ghana gets it: no text alerts and no monthly texts."""
    return {**plan, "sms": 0, "channels": [c for c in plan["channels"] if c != "sms"]}


def money(amount, currency="GHS"):
    """Plain text amount, whole units unless there are pesewas or cents: GHS 99, USD 8."""
    return f"{currency} {amount:,.0f}" if float(amount).is_integer() else f"{currency} {amount:,.2f}"


def price(plan, cycle, currency="GHS"):
    """Amount to charge for one billing period, in whole units of the currency."""
    m = plan["price_month_usd"] if currency == "USD" else plan["price_month"]
    if cycle == "yearly":
        return round(m * 12 * (1 - yearly_discount() / 100), 2)
    return round(float(m), 2)


def public(currency="GHS"):
    """The plans with their prices in one currency, as the website shows them."""
    d = yearly_discount()
    out = []
    for p in all_plans():
        yearly = price(p, "yearly", currency)
        if currency != "GHS":
            p = without_sms(p)
        out.append({**p, "currency": currency, "price_month": price(p, "monthly", currency), "price_year": yearly, "price_year_month": round(yearly / 12, 2)})
    return {"plans": out, "yearly_discount": d, "currency": currency}


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
    """Plan for a workspace row. A workspace without a paid plan (never subscribed, or lapsed) is locked: it keeps its data but can
    run no websites. A super admin's custom limits win over the plan's."""
    plan = get(ws["plan_id"]) or get("freelance")
    custom = ws.get("limits_override") or {}
    if custom:
        plan = {**plan, **{k: int(v) for k, v in custom.items() if k in OVERRIDABLE and v not in (None, "")}}
    if is_locked(ws):
        plan = {**plan, "sites": 0, "sms": 0, "channels": ["email"]}
    return plan if sms_allowed(ws) else without_sms(plan)


def is_locked(ws):
    """True when the workspace has no paid plan in force: it never subscribed or its plan lapsed or was cancelled. Complimentary plans are never locked."""
    return not ws.get("comped") and ws.get("plan_status") in ("none", "lapsed")


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
    """Texts included each month by the plan."""
    return limits(ws)["sms"]


def sms_left(ws):
    """Texts that can still be sent: what is left of the monthly allowance plus any bought credits."""
    return max(sms_quota(ws) - sms_used(ws["id"]), 0) + (ws.get("sms_bonus") or 0)


class LimitError(ValueError):
    """A plan limit was reached. The API answers 402 so the app can show an upgrade prompt."""
