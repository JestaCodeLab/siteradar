"""A small fake website with deliberate problems, for testing SiteRadar locally.

  python demo/demo_site.py 9000          # start it
  touch demo/DOWN                        # make it return 503 (simulate outage)
  rm demo/DOWN                           # bring it back
"""
import os
import sys
from flask import Flask, Response

app = Flask(__name__)
DOWN = os.path.join(os.path.dirname(__file__), "DOWN")
TRACK = '<script defer src="http://127.0.0.1:8080/t.js" data-site="bakery"></script>'
LOREM = ("Fresh sourdough baked every morning with organic flour from local mills. " * 12)


def page(title, body, desc=True, extra_head=""):
    d = '<meta name="description" content="Artisan bakery in Boskoop with sourdough, pastries and custom cakes, baked fresh daily.">' if desc else ""
    return f"""<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>{title}</title>{d}
<script src="/static/app.js"></script>{extra_head}{TRACK}</head><body>
<nav><a href="/">Home</a> <a href="/About_Us">About</a> <a href="/menu">Menu</a> <a href="/contact">Contact</a>
<a href="/blog/old-post">Blog</a> <a href="https://example.com/this-is-gone-404"><i class="icon"></i></a></nav>
{body}<footer><a href="/privacy">Privacy policy</a></footer></body></html>"""


@app.before_request
def maybe_down():
    if os.path.exists(DOWN):
        return Response("Service Unavailable", 503)


@app.get("/")
def home():
    return page("Bakery", f"<h1>Welcome to De Bakkerij</h1><img src='/static/hero.jpg'><p>{LOREM}</p>"
                "<h1>Our story</h1><form><input name='email' placeholder='Email'><button>Subscribe</button></form>")


@app.get("/About_Us")
def about():
    return page("About us | De Bakkerij – artisan sourdough in Boskoop", f"<h1>About us</h1><p>{LOREM * 2}</p>"
                "<img src='/static/team.jpg' alt='Our team'>", desc=False)


@app.get("/menu")
def menu():
    imgs = "".join(f"<img src='/static/bread{i}.jpg'>" for i in range(6))
    return page("Menu | De Bakkerij – artisan sourdough in Boskoop", f"<h1>Menu</h1>{imgs}<p>Short menu.</p>")


@app.get("/contact")
def contact():
    return page("Contact | De Bakkerij – artisan sourdough in Boskoop",
                "<h1>Contact</h1><p>Call us.</p><img src='http://127.0.0.1:9000/static/map.png' alt='map'>")


@app.get("/privacy")
def privacy():
    return page("Privacy | De Bakkerij – artisan sourdough in Boskoop", f"<h1>Privacy</h1><p>{LOREM}</p>")


@app.get("/static/<name>")
def static_file(name):
    if name.endswith(".js"):
        return Response("console.log('hi')", mimetype="application/javascript")
    size = 450_000 if name == "hero.jpg" else 40_000
    return Response(b"\xff\xd8" + b"0" * size, mimetype="image/jpeg")


if __name__ == "__main__":
    app.run(port=int(sys.argv[1]) if len(sys.argv) > 1 else 9000)
