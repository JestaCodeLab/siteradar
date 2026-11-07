"""Paystack billing: checkout, verification, webhooks and renewals.

Cards are charged again automatically each period (Paystack keeps a reusable authorisation). Mobile money cannot be
pulled, so those customers get an email with a payment link before the plan ends. If a renewal fails the workspace
is `past_due` for a week and then `lapsed`, which drops it to Free limits; nothing is deleted.
Set BILLING_TEST_MODE=1 to switch plans without any payment while developing.
"""
import hashlib
import hmac
import json
import logging
import os
import secrets
import time

import requests

from . import accounts, db, discounts, emails, mailer, plans, sites

log = logging.getLogger("sitewatch.billing")
API = "https://api.paystack.co"
PERIOD = {"monthly": 30 * 86400, "yearly": 365 * 86400}
GRACE_DAYS = 7


def configured():
    return bool(os.environ.get("PAYSTACK_SECRET_KEY"))


def test_mode():
    return os.environ.get("BILLING_TEST_MODE") == "1" and not configured()


def _call(method, path, **kw):
    r = requests.request(method, API + path, headers={"Authorization": "Bearer " + os.environ["PAYSTACK_SECRET_KEY"]}, timeout=30, **kw)
    data = r.json() if r.content else {}
    if r.status_code >= 300 or not data.get("status"):
        raise RuntimeError(data.get("message") or f"Paystack error {r.status_code}")
    return data["data"]


def app_url():
    return os.environ.get("APP_URL", "http://localhost:3000").rstrip("/")


def quote(plan_id, cycle, currency="GHS"):
    plan = plans.get(plan_id)
    if not plan or not plan["active"]:
        raise ValueError("That plan is not available.")
    if cycle not in PERIOD:
        raise ValueError("Choose monthly or yearly billing.")
    return plan, plans.price(plan, cycle, currency)


def switch_plan(cfg, ws, plan_id, cycle="monthly", renews=None):
    db.run("UPDATE workspaces SET plan_id=?, cycle=?, plan_status='active', plan_renews=?, pending_plan=NULL, pending_cycle=NULL WHERE id=?",
           (plan_id, cycle, renews, ws["id"]))
    sites.enforce_limit(cfg, accounts.workspace(ws["id"]))


def _start(cfg, ws, user, ref, amount, metadata, channels=None, currency="GHS"):
    """Open a Paystack transaction (or finish at once in test mode) for a payment row that already exists."""
    if test_mode():
        confirm(cfg, ref)
        return {"done": True}
    if not configured():
        raise RuntimeError("Payments are not set up yet. Please contact support.")
    payload = {"email": user["email"], "amount": int(round(amount * 100)), "currency": currency, "reference": ref,
               "callback_url": f"{app_url()}/billing/callback", "metadata": metadata}
    if currency != "GHS":
        payload["channels"] = ["card"]          # mobile money only exists for cedi payments
    elif channels:
        payload["channels"] = channels
    if os.environ.get("PAYSTACK_SUBACCOUNT"):          # payments settle to this subaccount
        payload["subaccount"] = os.environ["PAYSTACK_SUBACCOUNT"]
        payload["bearer"] = os.environ.get("PAYSTACK_FEE_BEARER", "account")    # who pays Paystack's fee: account (us) or subaccount
    data = _call("POST", "/transaction/initialize", json=payload)
    # the site opens access_code in Paystack's popup; url is the fallback if the popup can't load
    return {"access_code": data["access_code"], "url": data["authorization_url"], "reference": ref}


def checkout(cfg, ws, user, plan_id, cycle, channels=None, code=None):
    """Returns {url} to send the customer to, or {done: True} when no payment is needed. `code` is a discount code the customer typed."""
    cur = ws["currency"]
    plan, amount = quote(plan_id, cycle, cur)
    row, off = None, 0.0
    if code:
        row, off = discounts.check(code, ws, plan_id, cycle, amount, cur)       # raises ValueError with a plain reason when it does not apply
        amount = round(amount - off, 2)
    if amount == 0 and not row:
        switch_plan(cfg, ws, plan_id, cycle)
        return {"done": True}
    ref = "sw_" + secrets.token_hex(10)
    pid = db.run("INSERT INTO payments(workspace_id, reference, plan_id, cycle, amount, currency, status, kind, created, discount_code, discount_amount) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                 (ws["id"], ref, plan_id, cycle, amount, cur, "pending", "subscription", time.time(), row["code"] if row else None, off))
    if amount == 0:                       # a code that takes the whole price off: nothing to charge
        return _activate_free(cfg, ws, pid, plan_id, cycle)
    return _start(cfg, ws, user, ref, amount, {"workspace_id": ws["id"], "plan": plan_id, "cycle": cycle, **({"discount": row["code"]} if row else {})}, channels, cur)


def _activate_free(cfg, ws, pay_id, plan_id, cycle):
    """Put a plan in place for a period that costs nothing (a 100% discount), keeping a payment record with the code on it."""
    now = time.time()
    db.exec("UPDATE payments SET status='success', paid=?, channel='discount', method='Discount code' WHERE id=?", (now, pay_id))
    pay = db.q1("SELECT * FROM payments WHERE id=?", (pay_id,))
    switch_plan(cfg, ws, plan_id, cycle, now + PERIOD[cycle])
    db.exec("UPDATE workspaces SET onboarded=1 WHERE id=?", (ws["id"],))
    discounts.on_paid(pay)
    return {"done": True}


def renewal_quote(ws):
    """(plan, amount to charge, amount off, code) for the workspace's next renewal, with any discount it earned earlier."""
    plan, price = quote(ws["plan_id"], ws["cycle"], ws["currency"])
    off, code = discounts.renewal_discount(ws, price)
    return plan, round(price - off, 2), off, code


def confirm(cfg, reference):
    """Apply a payment once Paystack says it succeeded. Safe to call twice (callback and webhook both do)."""
    pay = db.q1("SELECT * FROM payments WHERE reference=?", (reference,))
    if not pay:
        raise ValueError("Unknown payment reference.")
    if pay["status"] == "success":
        return pay
    data = {}
    if not test_mode():
        data = _call("GET", f"/transaction/verify/{reference}")
        if data.get("status") != "success":
            if data.get("status") in ("failed", "abandoned"):
                db.exec("UPDATE payments SET status=? WHERE id=?", (data["status"], pay["id"]))
            return db.q1("SELECT * FROM payments WHERE id=?", (pay["id"],))
        if int(data.get("amount", 0)) < int(round(pay["amount"] * 100)):
            log.error("Payment %s paid %s but %s was due", reference, data.get("amount"), pay["amount"])
            return pay
    ws = accounts.workspace(pay["workspace_id"])
    now = time.time()
    base = ws["plan_renews"] if ws["plan_id"] == pay["plan_id"] and ws["plan_renews"] and ws["plan_renews"] > now else now
    auth = data.get("authorization") or {}
    db.exec("UPDATE payments SET status='success', paid=?, channel=?, method=? WHERE id=?",
            (now, data.get("channel") or "test", method_label(data.get("channel"), auth), pay["id"]))
    if auth.get("reusable") and auth.get("channel") == "card":
        db.exec("UPDATE workspaces SET paystack_auth=?, paystack_email=?, paystack_card=? WHERE id=?",
                (auth["authorization_code"], (data.get("customer") or {}).get("email"),
                 f"{auth.get('brand', 'Card')} ending {auth.get('last4', '')}", ws["id"]))
    elif data.get("channel") == "mobile_money":
        db.exec("UPDATE workspaces SET paystack_auth=NULL, paystack_card=NULL WHERE id=?", (ws["id"],))
    if pay["kind"] == "sms":
        db.exec("UPDATE workspaces SET sms_bonus=sms_bonus+? WHERE id=?", (int(pay["plan_id"][3:]), ws["id"]))
        return db.q1("SELECT * FROM payments WHERE id=?", (pay["id"],))
    switch_plan(cfg, ws, pay["plan_id"], pay["cycle"], base + PERIOD[pay["cycle"]])
    db.exec("UPDATE workspaces SET onboarded=1 WHERE id=?", (ws["id"],))      # paying for a plan also completes onboarding
    discounts.on_paid(db.q1("SELECT * FROM payments WHERE id=?", (pay["id"],)))
    _receipt(accounts.workspace(ws["id"]), pay)
    return db.q1("SELECT * FROM payments WHERE id=?", (pay["id"],))


def method_label(channel, auth):
    if channel == "mobile_money":
        bank = (auth or {}).get("bank") or ""
        return {"MTN": "MTN MoMo", "TGO": "Telecel Cash", "ATL": "AirtelTigo Money"}.get(bank.upper(), bank or "Mobile money")
    return "Card" if channel == "card" else (channel or "Test payment").replace("_", " ").title()


def _receipt(ws, pay):
    owner = accounts.user_by_id(ws["owner_id"]) if ws["owner_id"] else None
    if not owner:
        return
    pay = db.q1("SELECT * FROM payments WHERE id=?", (pay["id"],)) or pay          # the row as saved, with the payment method filled in
    plan = plans.get(pay["plan_id"])
    renews = emails.fmt_date(time.strftime("%Y-%m-%d", time.localtime(ws["plan_renews"])))
    paid_on = emails.fmt_date(time.strftime("%Y-%m-%d", time.localtime(pay.get("paid") or time.time())))
    cur = pay["currency"] or "GHS"
    mail = emails.payment_received(owner["first_name"], ws["name"], plan["name"], pay["cycle"], plans.money(pay["amount"], cur),
                                   pay.get("method") or method_label(pay.get("channel"), None), pay["reference"], paid_on, renews,
                                   discount=f"-{plans.money(pay['discount_amount'], cur)} ({pay['discount_code']})" if pay.get("discount_amount") else None)
    mailer.send(owner["email"], mail.subject, mail.text, mail.html)


def webhook(cfg, raw, signature):
    if not configured():
        return False
    expected = hmac.new(os.environ["PAYSTACK_SECRET_KEY"].encode(), raw, hashlib.sha512).hexdigest()
    if not hmac.compare_digest(expected, signature or ""):
        return False
    db.kv_set("last_webhook", {"ts": time.time()})
    event = json.loads(raw)
    if event.get("event") == "charge.success":
        ref = (event.get("data") or {}).get("reference")
        if ref and db.q1("SELECT 1 FROM payments WHERE reference=?", (ref,)):
            confirm(cfg, ref)
    return True


def history(ws_id):
    return db.q("SELECT reference, plan_id, cycle, amount, currency, status, channel, created, paid FROM payments "
                "WHERE workspace_id=? ORDER BY created DESC LIMIT 50", (ws_id,))


def cancel(cfg, ws):
    """Back to Free straight away. The paid period is not refunded."""
    db.exec("UPDATE workspaces SET paystack_auth=NULL, paystack_card=NULL WHERE id=?", (ws["id"],))
    db.exec("INSERT INTO admin_audit(ts, workspace_id, action, detail) VALUES (?,?,?,?)",
            (time.time(), ws["id"], "plan.cancel", f"Owner cancelled the {ws['plan_id']} plan"))
    switch_plan(cfg, ws, "free", "monthly")


def renew_all(cfg):
    now = time.time()
    for r in db.q("SELECT id FROM workspaces WHERE plan_id!='free' AND comped=0 AND plan_renews IS NOT NULL"):
        ws = accounts.workspace(r["id"])
        try:
            _renew(cfg, ws, now)
        except Exception:
            log.exception("Renewal failed for workspace %s", ws["id"])


def _renew(cfg, ws, now):
    left = ws["plan_renews"] - now
    flag = f"renewal-notice:{ws['id']}:{int(ws['plan_renews'])}"
    if left > 3 * 86400:
        return
    if left <= 0 and ws["plan_status"] == "active":
        db.exec("UPDATE workspaces SET plan_status='past_due' WHERE id=?", (ws["id"],))
    if left < -GRACE_DAYS * 86400:
        db.exec("UPDATE workspaces SET plan_status='lapsed' WHERE id=?", (ws["id"],))
        db.exec("INSERT INTO admin_audit(ts, workspace_id, action, detail) VALUES (?,?,?,?)",
                (now, ws["id"], "plan.lapsed", "Plan lapsed after a failed renewal"))
        sites.enforce_limit(cfg, accounts.workspace(ws["id"]))
        _notify_owner(ws, "ended")
        return
    if left > 0 and ws["paystack_auth"] is None and not db.kv_get(flag):
        db.kv_set(flag, True)
        _notify_owner(ws, "soon")
        return
    if left <= 0 and ws["paystack_auth"] and configured() and not db.kv_get(flag):
        db.kv_set(flag, True)
        plan, amount, off, code = renewal_quote(ws)
        ref = "sw_" + secrets.token_hex(10)
        pid = db.run("INSERT INTO payments(workspace_id, reference, plan_id, cycle, amount, currency, status, kind, created, discount_code, discount_amount) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                     (ws["id"], ref, ws["plan_id"], ws["cycle"], amount, ws["currency"], "pending", "renewal", now, code, off))
        if amount <= 0:                   # the discount covers the whole renewal: extend the plan without charging the card
            base = ws["plan_renews"] if ws["plan_renews"] and ws["plan_renews"] > now else now
            db.exec("UPDATE payments SET status='success', paid=?, channel='discount', method='Discount code' WHERE id=?", (now, pid))
            switch_plan(cfg, ws, ws["plan_id"], ws["cycle"], base + PERIOD[ws["cycle"]])
            discounts.on_paid(db.q1("SELECT * FROM payments WHERE id=?", (pid,)))
            return
        _call("POST", "/transaction/charge_authorization", json={
            "authorization_code": ws["paystack_auth"], "email": ws["paystack_email"], "amount": int(round(amount * 100)),
            "currency": ws["currency"], "reference": ref})
        confirm(cfg, ref)
    elif left <= 0 and ws["plan_status"] == "past_due" and not db.kv_get(flag + ":due"):
        db.kv_set(flag + ":due", True)
        _notify_owner(ws, "due")


def _notify_owner(ws, tone):
    """Tell the owner about their plan: tone is 'soon' (renews in a few days), 'due' (payment did not go through) or 'ended'."""
    owner = accounts.user_by_id(ws["owner_id"]) if ws["owner_id"] else None
    if not owner:
        return
    plan = plans.get(ws["plan_id"])
    renews = emails.fmt_date(time.strftime("%Y-%m-%d", time.localtime(ws["plan_renews"]))) if ws["plan_renews"] else None
    amount = None
    if tone != "ended":
        try:
            amount = plans.money(renewal_quote(ws)[1], ws["currency"] or "GHS")
        except Exception:
            pass
    mail = emails.billing_notice(tone, owner["first_name"], ws["name"], plan["name"], renews, amount, GRACE_DAYS)
    mailer.send(owner["email"], mail.subject, mail.text, mail.html)


# ---- support actions used by the super admin ------------------------------------

def send_payment_link(ws):
    """Email the owner a link to pay for the current plan."""
    owner = accounts.user_by_id(ws["owner_id"]) if ws["owner_id"] else None
    if not owner:
        raise ValueError("This workspace has no owner to email.")
    _notify_owner(ws, "due")
    return owner["email"]


def retry_payment(cfg, ws):
    """Charge the saved card again. Without one, send the payment link instead. Returns 'charged', 'failed' or 'link'."""
    if not (configured() and ws["paystack_auth"]):
        send_payment_link(ws)
        return "link"
    plan, amount, off, code = renewal_quote(ws)
    ref = "sw_" + secrets.token_hex(10)
    db.run("INSERT INTO payments(workspace_id, reference, plan_id, cycle, amount, currency, status, kind, created, discount_code, discount_amount) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
           (ws["id"], ref, ws["plan_id"], ws["cycle"], amount, ws["currency"], "pending", "retry", time.time(), code, off))
    try:
        _call("POST", "/transaction/charge_authorization", json={
            "authorization_code": ws["paystack_auth"], "email": ws["paystack_email"], "amount": int(round(amount * 100)),
            "currency": ws["currency"], "reference": ref})
    except RuntimeError:
        db.exec("UPDATE payments SET status='failed' WHERE reference=?", (ref,))
        return "failed"
    return "charged" if confirm(cfg, ref)["status"] == "success" else "failed"


def refund(reference, amount=None):
    """Refund a successful payment (all of it unless an amount is given)."""
    pay = db.q1("SELECT * FROM payments WHERE reference=?", (reference,))
    if not pay or pay["status"] != "success":
        raise ValueError("Only a successful payment can be refunded.")
    amount = round(float(amount or pay["amount"]), 2)
    if amount <= 0 or amount > pay["amount"] - (pay["refunded"] or 0):
        raise ValueError("That is more than is left to refund.")
    if not test_mode():
        _call("POST", "/refund", json={"transaction": reference, "amount": int(round(amount * 100))})
    db.exec("UPDATE payments SET refunded=COALESCE(refunded,0)+?, status=? WHERE id=?",
            (amount, "refunded" if amount >= pay["amount"] - (pay["refunded"] or 0) else "success", pay["id"]))
    return amount


# ---- SMS top-ups and invoices ---------------------------------------------------------

DEFAULT_BUNDLES = [{"qty": 100, "price": 20}, {"qty": 500, "price": 90}, {"qty": 1000, "price": 160}]


def sms_bundles():
    """Prices are set by a super admin (Plans and pricing). The defaults are placeholders until they are."""
    return (db.kv_get("platform") or {}).get("sms_bundles") or DEFAULT_BUNDLES


def checkout_sms(cfg, ws, user, qty):
    bundle = next((b for b in sms_bundles() if b["qty"] == int(qty)), None)
    if not bundle:
        raise ValueError("That bundle is not available.")
    plan = plans.limits(ws)
    if "sms" not in plan["channels"]:
        raise plans.LimitError("SMS alerts are part of the Growth plan and above.")
    ref = "sw_" + secrets.token_hex(10)
    db.run("INSERT INTO payments(workspace_id, reference, plan_id, cycle, amount, currency, status, kind, created) VALUES (?,?,?,?,?,?,?,?,?)",
           (ws["id"], ref, f"sms{bundle['qty']}", "once", float(bundle["price"]), "GHS", "pending", "sms", time.time()))
    return _start(cfg, ws, user, ref, float(bundle["price"]), {"workspace_id": ws["id"], "sms": bundle["qty"]})


def invoice_number(pay):
    return f"INV-{pay['id']:04d}"


def describe(pay):
    if pay["kind"] == "sms":
        return f"{pay['plan_id'][3:]} SMS alert bundle"
    plan = plans.get(pay["plan_id"]) or {"name": pay["plan_id"]}
    return f"{plan['name']} plan, {pay['cycle']}"


def invoices(ws_id):
    rows = db.q("SELECT * FROM payments WHERE workspace_id=? AND status IN ('success','refunded') ORDER BY COALESCE(paid, created) DESC", (ws_id,))
    return [{"reference": p["reference"], "number": invoice_number(p), "date": p["paid"] or p["created"], "description": describe(p), "amount": p["amount"]} for p in rows]


def invoice_html(ws, reference):
    from .report import env
    pay = db.q1("SELECT * FROM payments WHERE reference=? AND workspace_id=? AND status IN ('success','refunded')", (reference, ws["id"]))
    if not pay:
        return None, None
    owner = accounts.user_by_id(ws["owner_id"]) if ws["owner_id"] else None
    html_text = env.get_template("invoice.html").render(
        number=invoice_number(pay), company=ws["name"], email=owner["email"] if owner else "", logo=ws["logo_url"], reference=reference,
        date=time.strftime("%d %B %Y", time.localtime(pay["paid"] or pay["created"])), description=describe(pay), amount=f"{pay['amount']:,.2f}", method=pay["method"])
    return html_text, invoice_number(pay)
