"""Writes every email with sample values to a folder, to look at in a browser: python -m sitewatch.email_preview [folder]"""
import html
import os
import sys

from . import emails

SITE = {"id": "shop", "name": "Shop", "url": "https://shop.example.com"}


def samples():
    return {
        "verify": emails.verify_code("Ama", "482913"),
        "reset": emails.reset_code("Ama", "730196"),
        "welcome": emails.welcome("Ama"),
        "invite": emails.invite("Acme Ltd", "Kofi Mensah", "admin", "https://www.siteradar.com/invite/abc123", 7, "ama@acme.test"),
        "payment-received": emails.payment_received("Ama", "Acme Ltd", "Growth", "yearly", "GHS 2,870", "Mobile money (MTN MoMo)",
                                                    "sw_4f9c2a71d0e8b3", "6 November 2026", "6 November 2027"),
        "plan-renews-soon": emails.billing_notice("soon", "Ama", "Acme Ltd", "Growth", renews="9 November 2026", amount="GHS 299"),
        "payment-needed": emails.billing_notice("due", "Ama", "Acme Ltd", "Growth", renews="6 November 2026", amount="GHS 299"),
        "plan-ended": emails.billing_notice("ended", "Ama", "Acme Ltd", "Growth", renews="13 November 2026"),
        "expiry-ssl": emails.expiry("ssl", "Acme Ltd", "shop.example.com", 28, "4 December 2026", "https://www.siteradar.com/websites/shop"),
        "expiry-ssl-urgent": emails.expiry("ssl", "Acme Ltd", "shop.example.com", 3, "9 November 2026", "https://www.siteradar.com/websites/shop"),
        "expiry-domain": emails.expiry("domain", "Acme Ltd", "example.com", 30, "31 January 2027", "https://www.siteradar.com/websites/shop", registrar="Namecheap"),
        "expiry-domain-expired": emails.expiry("domain", "Acme Ltd", "example.com", -2, "4 November 2026", "https://www.siteradar.com/websites/shop", registrar="Namecheap"),
        "renewal-subscription": emails.expiry("subscription", "Acme Ltd", "Hosting (Hetzner)", 7, "13 November 2026", "https://www.siteradar.com/subscriptions",
                                              site="shop.example.com", amount="GHS 480.00", auto_renew=False),
        "alert-down": emails.alert("Acme Ltd", "DOWN: Shop", "https://shop.example.com failed 2 checks in a row.\nReason: HTTP 503\nDashboard: https://www.siteradar.com/websites/shop", "down", SITE),
        "alert-up": emails.alert("Acme Ltd", "RECOVERED: Shop is back up", "https://shop.example.com is responding again (HTTP 200, 412 ms).\nDowntime: 19 minutes.\nCause was: HTTP 503", "up", SITE),
        "alert-dns": emails.alert("Acme Ltd", "DNS changed for example.com", "The DNS records for example.com changed:\n- MX: mail.old.com → mail.new.com\n\nIf you did not make this change, check with your DNS provider straight away.", "dns", SITE),
        "alert-test": emails.alert("Acme Ltd", "SiteRadar test alert", "If you can read this, alerts are working."),
    }


def main(out="email-preview"):
    os.makedirs(out, exist_ok=True)
    rows = []
    for name, mail in samples().items():
        with open(os.path.join(out, name + ".html"), "w", encoding="utf-8") as f:
            f.write(mail.html)
        with open(os.path.join(out, name + ".txt"), "w", encoding="utf-8") as f:
            f.write(f"Subject: {mail.subject}\n\n{mail.text}")
        rows.append(f'<li><a href="{name}.html">{name}</a> · <a href="{name}.txt">text</a> · {html.escape(mail.subject)}</li>')
    with open(os.path.join(out, "index.html"), "w", encoding="utf-8") as f:
        f.write("<!doctype html><meta charset=utf-8><title>SiteRadar emails</title><ul style='font:16px/2 system-ui'>" + "".join(rows) + "</ul>")
    print(f"Wrote {len(rows)} emails to {out}/index.html")


if __name__ == "__main__":
    main(*sys.argv[1:2])
