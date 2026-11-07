"""Discount codes: the super admin makes them, customers type them in at checkout.

A code takes a percentage, or a fixed amount in cedis and in dollars, off a plan's price. It can be limited to some plans and to
monthly or yearly billing, to a date range and to a number of uses. `periods` says how many payments get the discount: 1 is the
first payment only, 0 is every payment for as long as the customer stays, N is the first N payments. The discount lives on the
workspace (coupon_code, coupon_left) so that automatic renewals charge the lower price too.
"""
import json
import re
import time

from . import db, plans


def normalize(code):
    return re.sub(r"[^A-Za-z0-9_-]", "", str(code or "")).upper()


def get(code):
    c = normalize(code)
    return db.q1("SELECT * FROM discount_codes WHERE code=?", (c,)) if c else None


def plan_list(row):
    return json.loads(row["plan_ids"]) if row.get("plan_ids") else None


def amount_off(row, price, currency):
    """What the code takes off a price in `currency`, never more than the price."""
    if row["kind"] == "percent":
        off = round(price * row["percent"] / 100, 2)
    else:
        off = float(row["amount_usd"] if currency == "USD" else row["amount_ghs"])
    return max(0.0, min(float(price), off))


def applies(row, plan_id, cycle):
    allowed = plan_list(row)
    return (allowed is None or plan_id in allowed) and row["cycles"] in ("both", cycle)


def uses(code_id):
    """First-time uses (a renewal that keeps an earlier discount is not a new use)."""
    return db.q1("SELECT COUNT(*) n FROM discount_redemptions WHERE code_id=? AND renewal=0", (code_id,))["n"]


def state(row, now=None):
    """'active', 'disabled', 'scheduled', 'expired' or 'used up'."""
    now = now or time.time()
    if not row["active"]:
        return "disabled"
    if row["starts"] and row["starts"] > now:
        return "scheduled"
    if row["expires"] and row["expires"] < now:
        return "expired"
    if row["max_uses"] is not None and uses(row["id"]) >= row["max_uses"]:
        return "used up"
    return "active"


def check(code, ws, plan_id, cycle, price, currency):
    """Validate a code a customer typed for this purchase. Returns (code row, amount off) or raises ValueError with a plain reason."""
    row = get(code)
    if not row:
        raise ValueError("That code is not valid. Check it and try again.")
    st = state(row)
    if st == "expired":
        raise ValueError("That code has expired.")
    if st == "used up":
        raise ValueError("That code has been used the maximum number of times.")
    if st != "active":
        raise ValueError("That code is not valid. Check it and try again.")
    if not price or price <= 0:
        raise ValueError("Discount codes apply to paid plans only.")
    if not applies(row, plan_id, cycle):
        plan = plans.get(plan_id) or {}
        where = "yearly" if row["cycles"] == "yearly" else "monthly" if row["cycles"] == "monthly" else None
        raise ValueError(f"That code does not apply to the {plan.get('name', plan_id)} plan" + (f" on {cycle} billing." if where and where != cycle else "."))
    off = amount_off(row, price, currency)
    if off <= 0:
        raise ValueError("That code cannot be used for payments in " + ("dollars." if currency == "USD" else "cedis."))
    if db.q1("SELECT 1 FROM discount_redemptions WHERE code_id=? AND workspace_id=? AND renewal=0", (row["id"], ws["id"])):
        raise ValueError("Your workspace has already used that code.")
    return row, off


def describe(row):
    """'20% off', 'GHS 50 off / $5 off'."""
    if row["kind"] == "percent":
        p = row["percent"]
        return f"{p:g}% off"
    return f"{plans.money(row['amount_ghs'], 'GHS')} off" + (f" / {plans.money(row['amount_usd'], 'USD')} off" if row["amount_usd"] else "")


def duration_text(row):
    n = row["periods"]
    return "every payment" if n == 0 else "the first payment" if n == 1 else f"the first {n} payments"


def on_paid(pay):
    """Called once a payment that used a code is confirmed: record the use and, if the discount lasts, keep it on the workspace."""
    row = get(pay.get("discount_code"))
    if not row or db.q1("SELECT 1 FROM discount_redemptions WHERE payment_id=?", (pay["id"],)):
        return
    renewal = pay["kind"] in ("renewal", "retry")
    db.exec("INSERT INTO discount_redemptions(code_id, workspace_id, payment_id, amount_off, currency, renewal, created) VALUES (?,?,?,?,?,?,?)",
            (row["id"], pay["workspace_id"], pay["id"], pay["discount_amount"], pay["currency"], int(renewal), time.time()))
    if not renewal:
        n = row["periods"]
        if n == 0:
            db.exec("UPDATE workspaces SET coupon_code=?, coupon_left=NULL WHERE id=?", (row["code"], pay["workspace_id"]))
        elif n > 1:
            db.exec("UPDATE workspaces SET coupon_code=?, coupon_left=? WHERE id=?", (row["code"], n - 1, pay["workspace_id"]))
    else:
        ws = db.q1("SELECT coupon_code, coupon_left FROM workspaces WHERE id=?", (pay["workspace_id"],))
        if ws and ws["coupon_code"] == row["code"] and ws["coupon_left"] is not None:
            if ws["coupon_left"] <= 1:
                db.exec("UPDATE workspaces SET coupon_code=NULL, coupon_left=NULL WHERE id=?", (pay["workspace_id"],))
            else:
                db.exec("UPDATE workspaces SET coupon_left=coupon_left-1 WHERE id=?", (pay["workspace_id"],))


def renewal_discount(ws, price):
    """(amount off, code) for the workspace's next renewal, from a discount it earned earlier. (0, None) when there is none."""
    code = ws.get("coupon_code")
    if not code or (ws.get("coupon_left") is not None and ws["coupon_left"] <= 0):
        return 0.0, None
    row = get(code)
    if not row or not applies(row, ws["plan_id"], ws["cycle"]):
        return 0.0, None
    off = amount_off(row, price, ws.get("currency") or "GHS")
    return (off, row["code"]) if off > 0 else (0.0, None)
