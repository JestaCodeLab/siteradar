"""Tiny dependency-free SVG charts, so reports are self-contained and print well."""
from markupsafe import Markup

W, H, PAD_L, PAD_B, PAD_T = 640, 180, 40, 22, 10


def _nice_max(v):
    if v <= 0:
        return 1
    import math
    mag = 10 ** math.floor(math.log10(v))
    for m in (1, 2, 2.5, 5, 10):
        if v <= m * mag:
            return m * mag
    return 10 * mag


def _axes(ymax, unit=""):
    out = []
    for i in range(5):
        v = ymax * i / 4
        y = PAD_T + (H - PAD_T - PAD_B) * (1 - i / 4)
        out.append(f'<line x1="{PAD_L}" x2="{W}" y1="{y:.1f}" y2="{y:.1f}" class="grid"/>'
                   f'<text x="{PAD_L - 6}" y="{y + 3:.1f}" class="ylab">{v:g}{unit if i == 4 else ""}</text>')
    return "".join(out)


def bar_chart(points, unit=""):
    if not points:
        return Markup("")
    ymax = _nice_max(max(v for _, v in points))
    n = len(points)
    bw = (W - PAD_L) / n
    plot_h = H - PAD_T - PAD_B
    bars = []
    for i, (label, v) in enumerate(points):
        h = plot_h * v / ymax
        x = PAD_L + i * bw
        bars.append(f'<rect x="{x + bw * 0.15:.1f}" y="{PAD_T + plot_h - h:.1f}" width="{bw * 0.7:.1f}" '
                    f'height="{h:.1f}" rx="2" class="bar"><title>{label}: {v}</title></rect>')
        if n <= 31 and (i % max(1, n // 10) == 0):
            bars.append(f'<text x="{x + bw / 2:.1f}" y="{H - 6}" class="xlab">{label}</text>')
    return Markup(f'<svg viewBox="0 0 {W} {H}" class="chart" role="img">{_axes(ymax, unit)}{"".join(bars)}</svg>')


def line_chart(points, unit=""):
    if len(points) < 2:
        return Markup('<p class="muted">Not enough data for a chart yet.</p>')
    ymax = _nice_max(max(v for _, v in points))
    n = len(points)
    plot_h = H - PAD_T - PAD_B
    xs = [PAD_L + 8 + (W - PAD_L - 16) * i / (n - 1) for i in range(n)]
    ys = [PAD_T + plot_h * (1 - v / ymax) for _, v in points]
    path = " ".join(f"{'M' if i == 0 else 'L'}{x:.1f},{y:.1f}" for i, (x, y) in enumerate(zip(xs, ys)))
    area = path + f" L{xs[-1]:.1f},{PAD_T + plot_h} L{xs[0]:.1f},{PAD_T + plot_h} Z"
    labels = "".join(f'<text x="{xs[i]:.1f}" y="{H - 6}" class="xlab">{points[i][0]}</text>'
                     for i in range(0, n, max(1, n // 10)))
    dots = "".join(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="2.5" class="dot"><title>{l}: {v}{unit}</title></circle>'
                   for x, y, (l, v) in zip(xs, ys, points))
    return Markup(f'<svg viewBox="0 0 {W} {H}" class="chart" role="img">{_axes(ymax, unit)}'
                  f'<path d="{area}" class="area"/><path d="{path}" class="line"/>{dots}{labels}</svg>')


def uptime_strip(days):
    """One block per day: green = 100%, amber = degraded, red = major outage, grey = no data."""
    n = len(days)
    bw = W / n
    out = []
    for i, (d, pct) in enumerate(days):
        cls = "nodata" if pct is None else "up" if pct >= 99.9 else "warn" if pct >= 98 else "down"
        tip = f"{d}: no data" if pct is None else f"{d}: {pct:.2f}% of checks OK"
        out.append(f'<rect x="{i * bw + 1:.1f}" y="0" width="{bw - 2:.1f}" height="34" rx="3" class="u-{cls}">'
                   f'<title>{tip}</title></rect>')
    return Markup(f'<svg viewBox="0 0 {W} 34" class="strip" preserveAspectRatio="none" role="img">{"".join(out)}</svg>')
