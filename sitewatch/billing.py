"""Paystack billing: checkout, verification, webhooks and renewals.

Cards are charged again automatically each period (Paystack keeps a reusable authorisation). Mobile money cannot be
pulled, so those customers get an email with a payment link before the plan ends. If a renewal fails the workspace
is `past_due` for a week and then `lapsed`, which drops it to Free limits; nothing is deleted.
Set BILLING_TEST_MODE=1 to switch plans without any payment while developing.
"""
import hashlib
import hmac
import html
import json
import logging
import os
import secrets
import time

import requests

from . import accounts, db, mailer, plans, sites

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


def quote(plan_id, cycle):
    plan = plans.get(plan_id)
    if not plan or not plan["active"]:
        raise ValueError("That plan is not available.")
    if cycle not in PERIOD:
        raise ValueError("Choose monthly or yearly billing.")
    return plan, plans.price(plan, cycle)


def switch_plan(cfg, ws, plan_id, cycle="monthly", renews=None):
    db.run("UPDATE workspaces SET plan_id=?, cycle=?, plan_status='active', plan_renews=?, pending_plan=NULL, pending_cycle=NULL WHERE id=?",
           (plan_id, cycle, renews, ws["id"]))
    sites.enforce_limit(cfg, accounts.workspace(ws["id"]))


def checkout(cfg, ws, user, plan_id, cycle):
    """Returns {url} to send the customer to, or {done: True} when no payment is needed."""
    plan, amount = quote(plan_id, cycle)
    if amount == 0:
        switch_plan(cfg, ws, plan_id, cycle)
        return {"done": True}
    ref = "sw_" + secrets.token_hex(10)
    db.run("INSERT INTO payments(workspace_id, reference, plan_id, cycle, amount, currency, status, kind, created) VALUES (?,?,?,?,?,?,?,?,?)",
           (ws["id"], ref, plan_id, cycle, amount, "GHS", "pending", "subscription", time.time()))
    if test_mode():
        confirm(cfg, ref)
        return {"done": True}
    if not configured():
        raise RuntimeError("Payments are not set up yet. Please contact support.")
    payload = {"email": user["email"], "amount": int(round(amount * 100)), "currency": "GHS", "reference": ref,
               "callback_url": f"{app_url()}/billing/callback",
               "metadata": {"workspace_id": ws["id"], "plan": plan_id, "cycle": cycle}}
    if os.environ.get("PAYSTACK_SUBACCOUNT"):          # payments settle to this subaccount
        payload["subaccount"] = os.environ["PAYSTACK_SUBACCOUNT"]
        payload["bearer"] = os.environ.get("PAYSTACK_FEE_BEARER", "account")    # who pays Paystack's fee: account (us) or subaccount
    data = _call("POST", "/transaction/initialize", json=payload)
    # the site opens access_code in Paystack's popup; url is the fallback if the popup can't load
    return {"access_code": data["access_code"], "url": data["authorization_url"], "reference": ref}


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
    switch_plan(cfg, ws, pay["plan_id"], pay["cycle"], base + PERIOD[pay["cycle"]])
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
    plan = plans.get(pay["plan_id"])
    renews = time.strftime("%d %B %Y", time.localtime(ws["plan_renews"]))
    body = (f"<p>Thank you. Your <b>{html.escape(plan['name'])}</b> plan ({pay['cycle']}) is active.</p>"
            f"<p>Amount paid: <b>GHS {pay['amount']:,.2f}</b><br>Reference: {pay['reference']}<br>Next renewal: {renews}</p>")
    mailer.send(owner["email"], f"Payment received: SiteWatch {plan['name']}",
                f"Payment of GHS {pay['amount']:,.2f} received for the {plan['name']} plan. Next renewal: {renews}.",
                mailer.layout("Payment received", body, ("Open billing", app_url() + "/billing")))


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
        _notify_owner(ws, "Your SiteWatch plan has ended",
                      "We could not renew your plan, so your account is now on Free limits. Your data is safe. Upgrade any time to restore it.")
        return
    if left > 0 and ws["paystack_auth"] is None and not db.kv_get(flag):
        db.kv_set(flag, True)
        _notify_owner(ws, "Your SiteWatch plan renews soon", "Open billing to pay for the next period by card or mobile money.")
        return
    if left <= 0 and ws["paystack_auth"] and configured() and not db.kv_get(flag):
        db.kv_set(flag, True)
        plan, amount = quote(ws["plan_id"], ws["cycle"])
        ref = "sw_" + secrets.token_hex(10)
        db.run("INSERT INTO payments(workspace_id, reference, plan_id, cycle, amount, currency, status, kind, created) VALUES (?,?,?,?,?,?,?,?,?)",
               (ws["id"], ref, ws["plan_id"], ws["cycle"], amount, "GHS", "pending", "renewal", now))
        _call("POST", "/transaction/charge_authorization", json={
            "authorization_code": ws["paystack_auth"], "email": ws["paystack_email"], "amount": int(round(amount * 100)),
            "currency": "GHS", "reference": ref})
        confirm(cfg, ref)
    elif left <= 0 and ws["plan_status"] == "past_due" and not db.kv_get(flag + ":due"):
        db.kv_set(flag + ":due", True)
        _notify_owner(ws, "Payment needed to keep your SiteWatch plan",
                      f"Your plan period has ended. Pay within {GRACE_DAYS} days to keep your plan.")


def _notify_owner(ws, subject, message):
    owner = accounts.user_by_id(ws["owner_id"]) if ws["owner_id"] else None
    if owner:
        mailer.send(owner["email"], subject, message,
                    mailer.layout(subject, f"<p>{html.escape(message)}</p>", ("Open billing", app_url() + "/billing")))


# ---- support actions used by the super admin ------------------------------------

def send_payment_link(ws):
    """Email the owner a link to pay for the current plan."""
    owner = accounts.user_by_id(ws["owner_id"]) if ws["owner_id"] else None
    if not owner:
        raise ValueError("This workspace has no owner to email.")
    plan = plans.get(ws["plan_id"])
    body = (f"<p>We could not take payment for your <b>{html.escape(plan['name'])}</b> plan. "
            "Open Billing to pay by card or mobile money and keep your plan.</p>")
    mailer.send(owner["email"], "Payment needed to keep your SiteWatch plan",
                f"We could not take payment for your {plan['name']} plan. Open {app_url()}/settings?tab=billing to pay.",
                mailer.layout("Payment needed", body, ("Open billing", app_url() + "/settings?tab=billing")))
    return owner["email"]


def retry_payment(cfg, ws):
    """Charge the saved card again. Without one, send the payment link instead. Returns 'charged', 'failed' or 'link'."""
    if not (configured() and ws["paystack_auth"]):
        send_payment_link(ws)
        return "link"
    plan, amount = quote(ws["plan_id"], ws["cycle"])
    ref = "sw_" + secrets.token_hex(10)
    db.run("INSERT INTO payments(workspace_id, reference, plan_id, cycle, amount, currency, status, kind, created) VALUES (?,?,?,?,?,?,?,?,?)",
           (ws["id"], ref, ws["plan_id"], ws["cycle"], amount, "GHS", "pending", "retry", time.time()))
    try:
        _call("POST", "/transaction/charge_authorization", json={
            "authorization_code": ws["paystack_auth"], "email": ws["paystack_email"], "amount": int(round(amount * 100)),
            "currency": "GHS", "reference": ref})
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
