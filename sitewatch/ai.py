"""AI-drafted text for fixes (meta descriptions, titles, image alt text), written by Claude Haiku.

A draft is only a suggestion: the customer reviews it and nothing reaches their website until they approve it. Each draft costs one credit from the
plan's monthly allowance (or from bought credits). A draft that fails costs nothing. Every call records its tokens, so real cost can be checked.
Needs ANTHROPIC_API_KEY in the environment."""
import logging
import os
import time

from . import db, plans

log = logging.getLogger("sitewatch.ai")

MODEL = "claude-haiku-5-5"        # $0.10 in / $0.50 out per million tokens; a draft costs about a twentieth of a cent
MAX_PAGE_CHARS = 6000             # how much of a page the model reads
KINDS = {
    "desc": ("a meta description", "Write one meta description of 120 to 160 characters. It must summarise what the page offers and invite the click."),
    "title": ("a page title", "Write one page title of 30 to 60 characters. Put the main topic first. Add the website name at the end only if it fits."),
    "alt": ("image alt text", "Write alt text for the image in at most 125 characters. Describe what is in the picture for someone who cannot see it. Do not start with 'image of'."),
}
RULES = ("Write in the same language as the page. Use only facts that are on the page; never invent prices, claims or names. "
         "Answer with the text only: no quotes, no label, no explanation.")


class AIError(Exception):
    """Something the customer can be told about."""


def configured():
    return bool(os.environ.get("ANTHROPIC_API_KEY"))


def draft(ws, site_id, kind, page):
    """One draft. `page` has url, title, h1, text and, for alt text, image (a public https address). Returns {text, credits_left}."""
    if kind not in KINDS:
        raise AIError("That kind of text is not supported.")
    if not configured():
        raise AIError("AI drafts are not switched on for this server yet.")
    st = plans.ai_status(ws)
    if st["left"] < 1:
        raise AIError("You have used all your AI drafts for this month. They renew on the 1st, or you can add credits.")

    try:
        import anthropic
    except ImportError:
        raise AIError("AI drafts are not available on this server yet.")
    what, how = KINDS[kind]
    facts = "\n".join(x for x in (f"Address: {page.get('url', '')}", f"Current title: {page.get('title', '')}", f"Main heading: {page.get('h1', '')}") if x.split(": ", 1)[1])
    content = []
    if kind == "alt" and page.get("image"):
        content.append({"type": "image", "source": {"type": "url", "url": page["image"]}})
    content.append({"type": "text", "text": f"Write {what} for this web page.\n\n{facts}\n\nPage text:\n{(page.get('text') or '')[:MAX_PAGE_CHARS]}"})

    client = anthropic.Anthropic(max_retries=2, timeout=30.0)
    try:
        r = client.messages.create(model=MODEL, max_tokens=400, output_config={"effort": "low"}, system=f"{how} {RULES}",
                                   messages=[{"role": "user", "content": content}])
    except anthropic.RateLimitError:
        raise AIError("AI drafts are busy right now. Please try again in a minute.")
    except anthropic.APIStatusError as e:
        log.error("AI draft failed for %s: %s %s", site_id, e.status_code, getattr(e, "message", ""))
        raise AIError("Could not write a draft. Please try again.")
    except anthropic.APIConnectionError:
        raise AIError("Could not reach the AI service. Please try again.")
    text = " ".join(b.text for b in r.content if b.type == "text").strip().strip('"').strip()
    if r.stop_reason == "refusal" or not text:
        raise AIError("Could not write a draft for this page. Write it yourself or try another page.")

    u = r.usage
    db.exec("INSERT INTO ai_usage(workspace_id, site_id, ts, kind, model, input_tokens, output_tokens, credits) VALUES (?,?,?,?,?,?,?,1)",
            (ws["id"], site_id, time.time(), kind, MODEL, u.input_tokens, u.output_tokens))
    if st["quota"] - st["used"] < 1:       # the monthly allowance is spent, so this one comes out of bought credits
        db.exec("UPDATE workspaces SET ai_bonus = GREATEST(ai_bonus - 1, 0) WHERE id=?", (ws["id"],))
    return {"text": text, "credits_left": st["left"] - 1}
