"""Public and account endpoints: plans, contact form, sign up, login, onboarding, team, billing."""
import logging
import os
import time
from collections import defaultdict

from flask import Blueprint, Response, abort, g, jsonify, request, session

from . import accounts, billing, db, mailer, plans, storage
from .ctx import SUPPORT_MINUTES, login_required, need, workspace_required

log = logging.getLogger("sitewatch.auth")
LOGO_MAX = 1536 * 1024
LOGO_TYPES = {b"\x89PNG": "image/png", b"\xff\xd8\xff": "image/jpeg", b"RIFF": "image/webp"}
_hits = defaultdict(list)


def limited(bucket, per_minutes, maximum):
    """True when this caller already used up its attempts (kept in memory, per web process)."""
    ip = request.headers.get("X-Forwarded-For", request.remote_addr or "").split(",")[0].strip()
    k, now = (bucket, ip), time.time()
    _hits[k] = [t for t in _hits[k] if now - t < per_minutes * 60]
    if len(_hits[k]) >= maximum:
        return True
    _hits[k].append(now)
    return False


def blueprint(cfg):
    bp = Blueprint("auth_api", __name__, url_prefix="/api")

    def body():
        return request.get_json(silent=True) or {}

    def sign_in(user, ws_id=None):
        session.clear()
        session.permanent = True
        session["uid"] = user["id"]
        session["ver"] = user["session_ver"]
        if ws_id:
            session["ws"] = ws_id

    def announcement():
        a = db.kv_get("announcement")
        if not a or not g.ws:
            return None
        paying = g.ws["plan_id"] != "free"
        return a["message"] if a["audience"] == "everyone" or (a["audience"] == "paying") == paying else None

    def me_payload():
        mine = accounts.memberships(g.user["id"]) if g.user else []
        return {
            "authenticated": bool(g.user),
            "user": accounts.public_user(g.user) if g.user else None,
            "workspaces": [{"id": w["id"], "name": w["name"], "role": w["role"], "logo_url": w["logo_url"]} for w in mine],
            "workspace": accounts.public_workspace(g.ws, g.role) if g.ws else None,
            "announcement": announcement(),
            "support": {"until": g.impersonating["until"], "reason": g.impersonating["reason"], "mode": g.impersonating["mode"]}
            if g.impersonating else None,
        }

    # ---- public ----------------------------------------------------------
    @bp.get("/plans")
    def public_plans():
        return jsonify(plans.public())

    @bp.post("/contact")
    def contact():
        if limited("contact", 10, 3):
            return jsonify(error="Too many messages. Try again later."), 429
        d = body()
        name, message = (d.get("name") or "").strip(), (d.get("message") or "").strip()
        email = accounts.norm_email(d.get("email"))
        if not name or len(message) < 5:
            raise ValueError("Tell us your name and how we can help.")
        to = os.environ.get("CONTACT_TO") or os.environ.get("ADMIN_EMAIL")
        text = f"From: {name} <{email}>\nCompany: {d.get('company') or '-'}\nTopic: {d.get('topic') or '-'}\n\n{message}"
        ok = mailer.send(to, f"SiteRadar enquiry from {name}", text, reply_to=email) if to else False
        db.exec("INSERT INTO admin_audit(ts, action, detail) VALUES (?,?,?)", (time.time(), "contact", text[:2000]))
        return jsonify(sent=True, emailed=ok)

    @bp.get("/logos/<int:ws_id>")
    def logo(ws_id):
        data = storage.get(f"logo/{ws_id}")
        info = storage.info(f"logo/{ws_id}")
        if not data or not info:
            abort(404)
        return Response(data, mimetype=info["mime"], headers={"Cache-Control": "public, max-age=3600"})

    # ---- sign up and login -----------------------------------------------
    @bp.post("/auth/register")
    def register():
        if limited("register", 60, 10):
            return jsonify(error="Too many sign-ups from this network. Try again later."), 429
        user = accounts.register(body())
        return jsonify(email=user["email"]), 201

    @bp.post("/auth/verify")
    def verify():
        if limited("verify", 15, 20):
            return jsonify(error="Too many attempts. Try again in a few minutes."), 429
        user = accounts.verify_email(body().get("email"), body().get("code"))
        sign_in(user)
        g.user, g.ws, g.role, g.impersonating = user, None, None, None
        return jsonify(me_payload())

    @bp.post("/auth/resend")
    def resend():
        user = accounts.user_by_email((body().get("email") or "").strip())
        if user and not user["email_verified"]:
            accounts.send_code(user, "verify")
        return jsonify(ok=True)

    @bp.post("/auth/login")
    def login():
        if limited("login", 15, 10):
            return jsonify(error="Too many attempts. Try again in 15 minutes.", code="rate"), 429
        user = accounts.login(body().get("email"), body().get("password"))
        sign_in(user)
        g.user, g.impersonating = user, None
        mine = accounts.memberships(user["id"])
        g.ws, g.role = (mine[0], mine[0]["role"]) if mine else (None, None)
        if g.ws:
            session["ws"] = g.ws["id"]
        return jsonify(me_payload())

    @bp.post("/auth/logout")
    def logout():
        session.clear()
        return jsonify(ok=True)

    @bp.get("/auth/me")
    def me():
        return jsonify(me_payload())

    @bp.post("/auth/forgot")
    def forgot():
        if not limited("forgot", 15, 5):
            accounts.request_reset(body().get("email"))
        return jsonify(ok=True)

    @bp.post("/auth/reset")
    def reset():
        if limited("reset", 15, 10):
            return jsonify(error="Too many attempts. Try again later."), 429
        accounts.reset_password(body().get("email"), body().get("code"), body().get("password"))
        return jsonify(ok=True)

    @bp.post("/auth/switch")
    @login_required
    def switch():
        wid = int(body().get("workspace_id") or 0)
        if not accounts.role_in(g.user["id"], wid):
            abort(404)
        session["ws"] = wid
        session.pop("imp", None)
        return jsonify(ok=True)

    @bp.patch("/account/profile")
    @login_required
    def profile():
        user = accounts.update_profile(g.user, body())
        return jsonify(user=accounts.public_user(user))

    @bp.post("/account/email")
    @login_required
    def email_change():
        d = body()
        new = accounts.request_email_change(g.user, d.get("email"), d.get("password"))
        return jsonify(pending_email=new)

    @bp.post("/account/email/confirm")
    @login_required
    def email_confirm():
        user = accounts.confirm_email_change(g.user, body().get("code"))
        return jsonify(user=accounts.public_user(user))

    @bp.post("/account/sessions/logout-others")
    @login_required
    def logout_others():
        session["ver"] = accounts.logout_others(g.user)
        return jsonify(ok=True)

    @bp.get("/account/alert-prefs")
    @login_required
    def prefs_get():
        return jsonify(prefs=accounts.get_prefs(g.user), events=[{"id": k, "label": l, "sub": sub} for k, l, sub in accounts.ALERT_EVENTS])

    @bp.put("/account/alert-prefs")
    @login_required
    def prefs_set():
        return jsonify(prefs=accounts.set_prefs(g.user, body().get("prefs") or {}))

    @bp.post("/account/password")
    @login_required
    def password():
        accounts.change_password(g.user, body().get("current"), body().get("password"))
        return jsonify(ok=True)

    # ---- invitations -------------------------------------------------------
    @bp.get("/invites/<token>")
    def invite_info(token):
        return jsonify(accounts.invite_info(token))

    @bp.post("/invites/<token>/accept")
    def invite_accept(token):
        user, ws_id = accounts.accept_invite(token, g.user, body())
        sign_in(user, ws_id)
        return jsonify(ok=True)

    # ---- onboarding ---------------------------------------------------------
    @bp.post("/onboarding/company")
    @login_required
    def onboarding_company():
        if g.ws and g.role == "owner":
            ws = accounts.update_workspace(g.ws["id"], body())
        elif g.ws:
            raise ValueError("Your account is already set up.")
        else:
            ws = accounts.create_workspace(g.user, body())
            session["ws"] = ws["id"]
        return jsonify(workspace_id=ws["id"])

    def save_logo(ws_id):
        f = request.files.get("logo")
        if not f:
            raise ValueError("Choose an image to upload.")
        data = f.read(LOGO_MAX + 1)
        if len(data) > LOGO_MAX:
            raise ValueError("The logo is larger than 1.5 MB.")
        mime = next((m for sig, m in LOGO_TYPES.items() if data.startswith(sig)), None)
        if not mime:
            raise ValueError("Use a PNG, JPG or WebP image.")
        storage.put(f"logo/{ws_id}", data, mime)
        url = f"{cfg['public_url'].rstrip('/')}/api/logos/{ws_id}?v={int(time.time())}"
        db.exec("UPDATE workspaces SET logo_url=?, logo_name=?, logo_size=? WHERE id=?", (url, (f.filename or "logo")[:80], len(data), ws_id))
        return url

    @bp.post("/onboarding/logo")
    @workspace_required
    @need("admin")
    def onboarding_logo():
        return jsonify(logo_url=save_logo(g.ws["id"]))

    @bp.delete("/onboarding/logo")
    @workspace_required
    @need("admin")
    def logo_remove():
        storage.remove(f"logo/{g.ws['id']}")
        db.exec("UPDATE workspaces SET logo_url=NULL WHERE id=?", (g.ws["id"],))
        return jsonify(ok=True)

    @bp.post("/onboarding/plan")
    @workspace_required
    @need("owner")
    def onboarding_plan():
        d = body()
        try:
            out = billing.checkout(cfg, g.ws, g.user, d.get("plan") or "free", d.get("cycle") or "monthly")
        except RuntimeError as e:
            return jsonify(error=str(e)), 502
        db.exec("UPDATE workspaces SET onboarded=1 WHERE id=?", (g.ws["id"],))   # a paid plan switches on when payment confirms
        return jsonify(out)

    # ---- workspace ----------------------------------------------------------
    @bp.get("/account/workspace")
    @workspace_required
    def workspace_get():
        return jsonify(accounts.public_workspace(g.ws, g.role))

    @bp.patch("/account/workspace")
    @workspace_required
    @need("admin")
    def workspace_update():
        d = {k: v for k, v in body().items() if k in accounts.COMPANY_FIELDS}
        ws = accounts.update_workspace(g.ws["id"], d)
        return jsonify(accounts.public_workspace(ws, g.role))

    @bp.post("/account/workspace/delete")
    @workspace_required
    @need("owner")
    def workspace_delete():
        if g.impersonating:
            raise accounts.AuthError("Not available in a support session.", "forbidden", 403)
        if (body().get("confirm") or "").strip() != g.ws["name"]:
            raise ValueError("Type the workspace name exactly to confirm.")
        accounts.delete_workspace(g.ws["id"])
        session.pop("ws", None)
        return jsonify(ok=True)

    @bp.post("/account/logo")
    @workspace_required
    @need("admin")
    def account_logo():
        return jsonify(logo_url=save_logo(g.ws["id"]))

    # ---- team ---------------------------------------------------------------
    @bp.get("/team")
    @workspace_required
    def team():
        return jsonify(**accounts.team(g.ws["id"]), plan=accounts.public_workspace(g.ws, g.role)["plan"],
                       usage=plans.usage(g.ws["id"]), role=g.role)

    @bp.post("/team/invites")
    @workspace_required
    @need("admin")
    def team_invite():
        accounts.invite(g.ws, g.user, body().get("email"), body().get("role") or "member", body().get("site_ids"))
        return jsonify(accounts.team(g.ws["id"])), 201

    @bp.post("/team/invites/<int:invite_id>/resend")
    @workspace_required
    @need("admin")
    def team_resend(invite_id):
        accounts.resend_invite(g.ws, g.user, invite_id)
        return jsonify(ok=True)

    @bp.delete("/team/invites/<int:invite_id>")
    @workspace_required
    @need("admin")
    def team_cancel(invite_id):
        accounts.cancel_invite(g.ws["id"], invite_id)
        return jsonify(ok=True)

    @bp.patch("/team/members/<int:user_id>")
    @workspace_required
    @need("admin")
    def team_role(user_id):
        accounts.set_role(g.ws, g.user["id"], user_id, body().get("role"), body().get("site_ids") if "site_ids" in body() else False)
        return jsonify(ok=True)

    @bp.delete("/team/members/<int:user_id>")
    @workspace_required
    def team_remove(user_id):
        if user_id != g.user["id"] and accounts.RANK[g.role] < accounts.RANK["admin"]:
            return jsonify(error="You don't have permission to do that.", code="forbidden"), 403
        if user_id == g.user["id"]:
            if g.role == "owner":
                raise ValueError("The owner can't leave. Transfer ownership first or contact support.")
            db.exec("DELETE FROM memberships WHERE workspace_id=? AND user_id=?", (g.ws["id"], user_id))
            session.pop("ws", None)
        else:
            accounts.remove_member(g.ws, g.user["id"], user_id)
        return jsonify(ok=True)

    # ---- billing ------------------------------------------------------------
    @bp.get("/billing")
    @workspace_required
    @need("admin")
    def billing_info():
        ws = g.ws
        used = db.q1("""SELECT COALESCE(SUM(i.size),0) n FROM invoices i JOIN subscriptions s ON s.id=i.subscription_id
                        WHERE s.workspace_id=?""", (ws["id"],))["n"]
        last = db.q1("SELECT method FROM payments WHERE workspace_id=? AND status='success' AND kind IN ('subscription','renewal','retry') ORDER BY paid DESC LIMIT 1", (ws["id"],))
        return jsonify(workspace=accounts.public_workspace(ws, g.role), catalogue=plans.public(),
                       payments=billing.history(ws["id"]), invoices=billing.invoices(ws["id"]), bundles=billing.sms_bundles(),
                       card=ws["paystack_card"], last_method=last["method"] if last else None, comped=ws["comped"],
                       storage={"used_mb": round(used / 1048576, 1), "limit_mb": plans.limits(ws)["storage_mb"]},
                       test_mode=billing.test_mode(), grace_days=billing.GRACE_DAYS)

    @bp.post("/billing/checkout")
    @workspace_required
    @need("owner")
    def billing_checkout():
        d = body()
        channels = {"card": ["card"], "mobile_money": ["mobile_money"]}.get(d.get("channel"))
        try:
            return jsonify(billing.checkout(cfg, g.ws, g.user, d.get("plan"), d.get("cycle") or "monthly", channels))
        except RuntimeError as e:
            return jsonify(error=str(e)), 502

    @bp.post("/billing/sms-topup")
    @workspace_required
    @need("owner")
    def billing_sms():
        try:
            return jsonify(billing.checkout_sms(cfg, g.ws, g.user, body().get("qty")))
        except RuntimeError as e:
            return jsonify(error=str(e)), 502

    @bp.get("/billing/invoices/<reference>.pdf")
    @workspace_required
    @need("admin")
    def billing_invoice(reference):
        html_text, number = billing.invoice_html(g.ws, reference)
        if not html_text:
            abort(404)
        import tempfile
        from . import report
        with tempfile.TemporaryDirectory() as tmp:
            hp = os.path.join(tmp, "invoice.html")
            open(hp, "w").write(html_text)
            try:
                pdf = report.to_pdf(hp, os.path.join(tmp, "invoice.pdf"))
                data = open(pdf, "rb").read()
            except Exception as e:           # no headless browser on this server: serve the printable page instead
                log.warning("Invoice PDF unavailable (%s)", e)
                return Response(html_text, mimetype="text/html")
        return Response(data, mimetype="application/pdf", headers={"Content-Disposition": f'attachment; filename="{number}.pdf"'})

    @bp.get("/billing/verify")
    @workspace_required
    def billing_verify():
        ref = request.args.get("reference", "")
        pay = db.q1("SELECT * FROM payments WHERE reference=? AND workspace_id=?", (ref, g.ws["id"]))
        if not pay:
            abort(404)
        try:
            pay = billing.confirm(cfg, ref)
        except RuntimeError as e:
            return jsonify(error=str(e)), 502
        return jsonify(status=pay["status"], plan=pay["plan_id"])

    @bp.post("/billing/cancel")
    @workspace_required
    @need("owner")
    def billing_cancel():
        billing.cancel(cfg, g.ws)
        return jsonify(ok=True)

    @bp.post("/billing/webhook")
    def billing_webhook():
        ok = billing.webhook(cfg, request.get_data(), request.headers.get("x-paystack-signature"))
        return ("", 200) if ok else ("", 401)

    return bp
