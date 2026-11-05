"""Monthly subscription report: HTML, PDF and email."""
import logging
import os

from . import alerts, plans, report, subscriptions

log = logging.getLogger("sitewatch.sub_report")


def money(d):
    return " · ".join(f"{cur} {amt:,.2f}" for cur, amt in d.items()) or "—"


def generate(cfg, ws, year, month, pdf=False):
    ctx = subscriptions.build_report(ws['id'], year, month)
    html = report.env.get_template("subscription_report.html").render(r=ctx, money=money, cfg=cfg, ws=ws, watermark=not plans.limits(ws)["clean_reports"])
    out_dir = os.path.join(cfg["data_dir"], "reports")
    os.makedirs(out_dir, exist_ok=True)
    base = os.path.join(out_dir, f"subscriptions-{ws['id']}-{year}-{month:02d}")
    with open(base + ".html", "w") as f:
        f.write(html)
    paths = {"html": base + ".html", "context": ctx}
    if pdf:
        try:
            paths["pdf"] = report.to_pdf(base + ".html", base + ".pdf")
        except Exception as e:
            log.warning("PDF export unavailable (%s)", e)
    return paths


def email(cfg, ws, year, month):
    to = ws["alert_emails"]
    if not to:
        return False
    paths = generate(cfg, ws, year, month, pdf=True)
    r = paths["context"]
    attach = []
    if paths.get("pdf"):
        attach.append((os.path.basename(paths["pdf"]), open(paths["pdf"], "rb").read(), "application/pdf"))
    text = (f"Subscription report for {r['label']}\n\nSpent: {money(r['total'])}\n"
            f"Due in {r['next_label']}: {money(r['next_total'])}\n")
    if r["actions"]:
        text += "\nWhat to do next:\n" + "\n".join(f"- {a['text']}" for a in r["actions"]) + "\n"
    return alerts.send_email(cfg, to, f"Subscription report – {r['label']}", text + "\nThe full report is attached.",
                             html=open(paths["html"]).read(), attachments=attach)
