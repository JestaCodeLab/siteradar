"""Best-effort extraction of provider, amount and date from an invoice PDF. The user always confirms the result."""
import datetime as dt
import io
import re

AMOUNT = re.compile(r"(?P<cur>USD|EUR|GBP|GHS|\$|€|£|GH₵|₵)?\s?(?P<num>\d{1,3}(?:,\d{3})*\.\d{2})\b")
TOTAL_WORDS = re.compile(r"(grand total|amount due|total due|total paid|amount paid|total)", re.I)
SYMBOLS = {"$": "USD", "€": "EUR", "£": "GBP", "₵": "GHS", "GH₵": "GHS"}
DATE_FORMATS = ("%Y-%m-%d", "%d %B %Y", "%B %d, %Y", "%b %d, %Y", "%d %b %Y", "%d/%m/%Y", "%m/%d/%Y")
DATE_RES = [r"\d{4}-\d{2}-\d{2}", r"\d{1,2} [A-Za-z]{3,9} \d{4}", r"[A-Za-z]{3,9} \d{1,2}, \d{4}", r"\d{1,2}/\d{1,2}/\d{4}"]


def extract_text(data):
    from pypdf import PdfReader
    reader = PdfReader(io.BytesIO(data))
    return "\n".join((p.extract_text() or "") for p in reader.pages[:3])


def parse(data):
    try:
        text = extract_text(data)
    except Exception:
        return {"readable": False}
    result = {"readable": bool(text.strip())}
    lines = [l.strip() for l in text.splitlines() if l.strip()]

    best = None
    for l in lines:
        m = AMOUNT.search(l)
        if m and TOTAL_WORDS.search(l):
            best = m
    if not best:
        nums = [(float(m.group("num").replace(",", "")), m) for m in AMOUNT.finditer(text)]
        best = max(nums, key=lambda t: t[0])[1] if nums else None
    if best:
        result["amount"] = float(best.group("num").replace(",", ""))
        cur = best.group("cur")
        if cur:
            result["currency"] = SYMBOLS.get(cur, cur)

    for rx in DATE_RES:
        m = re.search(rx, text)
        if not m:
            continue
        for fmt in DATE_FORMATS:
            try:
                result["date"] = dt.datetime.strptime(m.group(0), fmt).date().isoformat()
                break
            except ValueError:
                pass
        if "date" in result:
            break

    if lines:
        result["provider"] = lines[0][:60]
    return result
