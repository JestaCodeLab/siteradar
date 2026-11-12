"""AI-drafted text for fixes (meta descriptions, titles, image alt text), written by Claude Haiku.

A draft is only a suggestion: the customer reviews it and nothing reaches their website until they approve it. Each draft costs one credit from the
plan's monthly allowance (or from bought credits). A draft that fails costs nothing. Every call records its tokens, so real cost can be checked.
Needs ANTHROPIC_API_KEY in the environment."""
import logging
import os
import re
import time

from . import db, plans

log = logging.getLogger("sitewatch.ai")

MODEL = "claude-haiku-5-5"        # $0.10 in / $0.50 out per million tokens; a draft costs about a twentieth of a cent
PRICE_IN, PRICE_OUT = 0.10, 0.50  # US dollars per million tokens for Haiku 5.5 (prompts up to 100K tokens)
MAX_PAGE_CHARS = 6000             # how much of a page the model reads
MAX_IMAGES = 6                    # images described per page; one page costs one credit
KINDS = {
    "desc": ("a meta description", "Write one meta description of 120 to 160 characters. It must summarise what the page offers and invite the click."),
    "title": ("a page title", "Write one page title of 30 to 60 characters. Put the main topic first. Add the website name at the end only if it fits."),
    "alt": ("image alt text", "Write alt text for each numbered image in at most 125 characters. Describe what is in the picture for someone who cannot see it. Do not start with 'image of'."),
}
RULES = ("Write in the same language as the page. Use only facts that are on the page; never invent prices, claims or names. "
         "Answer with the text only: no quotes, no label, no explanation.")


def cost_usd(input_tokens, output_tokens):
    return (input_tokens * PRICE_IN + output_tokens * PRICE_OUT) / 1_000_000


class AIError(Exception):
    """Something the customer can be told about. `code` is "credits" when they have none left, so the app can offer a top-up."""
    def __init__(self, message, code=None):
        super().__init__(message)
        self.code = code


def configured():
    return bool(os.environ.get("ANTHROPIC_API_KEY"))


def _facts(page):
    return "\n".join(x for x in (f"Address: {page.get('url', '')}", f"Current title: {page.get('title', '')}", f"Main heading: {page.get('h1', '')}")
                     if x.split(": ", 1)[1])


def _run(ws, site_id, kind, system, content, max_tokens=400):
    """One call to Haiku. Checks the allowance first, records the tokens and spends the credit only when a draft came back."""
    if not configured():
        raise AIError("AI drafts are not switched on for this server yet.")
    st = plans.ai_status(ws)
    if st["left"] < 1:
        raise AIError("You have used all your AI credits for this month. They renew on the 1st, or you can add credits.", "credits")
    try:
        import anthropic
    except ImportError:
        raise AIError("AI drafts are not available on this server yet.")
    client = anthropic.Anthropic(max_retries=2, timeout=40.0)
    try:
        r = client.messages.create(model=MODEL, max_tokens=max_tokens, output_config={"effort": "low"}, system=system,
                                   messages=[{"role": "user", "content": content}])
    except anthropic.RateLimitError:
        raise AIError("AI drafts are busy right now. Please try again in a minute.")
    except anthropic.APIStatusError as e:
        log.error("AI draft failed for %s: %s %s", site_id, e.status_code, getattr(e, "message", ""))
        raise AIError("Could not write a draft. Please try again.")
    except anthropic.APIConnectionError:
        raise AIError("Could not reach the AI service. Please try again.")
    text = " ".join(b.text for b in r.content if b.type == "text").strip()
    if r.stop_reason == "refusal" or not text:
        raise AIError("Could not write a draft for this page. Write it yourself or try another page.")
    u = r.usage
    db.exec("INSERT INTO ai_usage(workspace_id, site_id, ts, kind, model, input_tokens, output_tokens, credits) VALUES (?,?,?,?,?,?,?,1)",
            (ws["id"], site_id, time.time(), kind, MODEL, u.input_tokens, u.output_tokens))
    if st["quota"] - st["used"] < 1:       # the monthly allowance is spent, so this one comes out of bought credits
        db.exec("UPDATE workspaces SET ai_bonus = GREATEST(ai_bonus - 1, 0) WHERE id=?", (ws["id"],))
    return text, st["left"] - 1


def draft(ws, site_id, kind, page):
    """A meta description or a title. `page` has url, title, h1 and text. Returns {text, credits_left}."""
    if kind not in ("desc", "title"):
        raise AIError("That kind of text is not supported.")
    what, how = KINDS[kind]
    content = [{"type": "text", "text": f"Write {what} for this web page.\n\n{_facts(page)}\n\nPage text:\n{(page.get('text') or '')[:MAX_PAGE_CHARS]}"}]
    text, left = _run(ws, site_id, kind, f"{how} {RULES}", content)
    return {"text": text.strip().strip('"').strip(), "credits_left": left}


def draft_alt(ws, site_id, page, images):
    """Alt text for up to MAX_IMAGES images on one page, for one credit. `images` are public https addresses. Returns {alts: [text per image], credits_left}."""
    images = [i for i in images if i.startswith("https://")][:MAX_IMAGES]
    if not images:
        raise AIError("None of the images on this page can be described. They must be served over https.")
    what, how = KINDS["alt"]
    content = []
    for n, src in enumerate(images, 1):
        content += [{"type": "text", "text": f"Image {n}:"}, {"type": "image", "source": {"type": "url", "url": src}}]
    content.append({"type": "text", "text": f"Write alt text for these {len(images)} images from a web page.\n\n{_facts(page)}\n\nPage text:\n{(page.get('text') or '')[:2000]}\n\n"
                                            f"Answer with exactly {len(images)} lines, each starting with the image number and a vertical bar, like: 1|A bride and groom cutting the cake"})
    text, left = _run(ws, site_id, "alt", f"{how} {RULES}", content, max_tokens=600)
    found = {}
    for line in text.splitlines():
        m = re.match(r"\s*(\d+)\s*\|\s*(.+)", line)
        if m:
            found[int(m.group(1))] = m.group(2).strip().strip('"')[:200]
    alts = [{"src": src, "alt": found.get(n, "")} for n, src in enumerate(images, 1)]
    if not any(a["alt"] for a in alts):
        raise AIError("Could not describe these images. Write the alt text yourself or try another page.")
    return {"alts": alts, "credits_left": left}
