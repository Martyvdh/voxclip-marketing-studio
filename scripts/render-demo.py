#!/usr/bin/env python3
"""
Een demo waarin het product in beeld blijft.

Het verschil met render-video.py: daar is het venster één shot tussen de
tekstkaarten. Hier staat het er van seconde nul tot het eind, en gebeurt er iets
in: er wordt getypt, de lijst krimpt mee, de Quick-picker komt op, er wordt
gekozen, het staat geplakt. De tekst is bijschrift, niet hoofdzaak.

Dat is wat een tool verkoopt. Niemand downloadt iets omdat er een mooie zin op
een vlak stond.

De grens, want dit tekent de interface: alles hieronder is wat op 18 augustus
2026 in build 0.2.14 echt op het scherm stond. Het zoekveld met die tekst, de
drie filters, de rijen met bron en tijd, de voettekst, en ⌥Space als sneltoets.
Er staat geen knop in die de app niet heeft. Verandert de app, dan verandert dit
mee of het gaat eruit.

Gebruik:
    python3 scripts/render-demo.py uit.mp4
"""

import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

INK = (28, 34, 48)
PAPER = (247, 247, 245)
TEAL = (18, 179, 166)
GREY = (150, 158, 170)
FIELD = (238, 239, 241)

W, H = 1080, 1920
FPS = 30

BOLD = "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf"
REG = "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf"
MONO = "/usr/share/fonts/truetype/liberation2/LiberationMono-Regular.ttf"
GLYPH = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

PAD = 56


def clamp01(x):
    return max(0.0, min(1.0, x))


def ease(t):
    x = clamp01(t)
    return 2 * x * x if x < 0.5 else 1 - (-2 * x + 2) ** 2 / 2


def overshoot(t):
    c1, u = 1.70158, clamp01(t) - 1
    return 1 + (c1 + 1) * u**3 + c1 * u**2


def blend(a, b, t):
    t = clamp01(t)
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


# De Timeline zoals hij er echt uitziet: tekst, bron, hoe lang geleden.
ROWS = [
    ("invoice@voxclip.it", "Chrome · 12m", "RICH TEXT"),
    ("Kerkstraat 12B, 1017 GC Amsterdam", "Notes · 41m", ""),
    ("Call the notary — 3:00", "Notes · 1h", "SPOKE"),
    ("Order #48213 — delivery Thursday", "Mail · 2h", ""),
    ("Meeting moved to 14:30, room 2.", "Notes · 3h", ""),
]


def draw_window(d, typed: str, rows, highlight=-1, dim=0.0):
    """Het venster. Geeft de y terug waar de lijst ophoudt."""
    x0, x1 = PAD, W - PAD
    ink = blend(PAPER, INK, 1 - dim * 0.75)
    grey = blend(PAPER, GREY, 1 - dim * 0.6)

    d.rounded_rectangle([x0, 120, x0 + 46, 166], radius=12, fill=ink)
    for i, (bx, h) in enumerate([(10, 14), (19, 22), (28, 14)]):
        d.rounded_rectangle(
            [x0 + bx, 143 - h // 2, x0 + bx + 8, 143 + h // 2],
            radius=4,
            fill=TEAL if i == 1 else PAPER,
        )
    d.text((x0 + 60, 126), "VoxClip", font=ImageFont.truetype(BOLD, 34), fill=ink)

    y = 200
    d.rounded_rectangle([x0, y, x1, y + 74], radius=18, fill=blend(PAPER, FIELD, 1 - dim))
    d.ellipse([x0 + 26, y + 26, x0 + 48, y + 48], outline=grey, width=4)
    d.line([x0 + 45, y + 45, x0 + 54, y + 54], fill=grey, width=4)

    if typed:
        d.text((x0 + 72, y + 20), typed, font=ImageFont.truetype(REG, 30), fill=ink)
        tw = d.textlength(typed, font=ImageFont.truetype(REG, 30))
        d.rectangle([x0 + 74 + tw, y + 20, x0 + 77 + tw, y + 54], fill=TEAL)
    else:
        d.text(
            (x0 + 72, y + 20),
            "Search everything you've copied or said",
            font=ImageFont.truetype(REG, 30),
            fill=grey,
        )

    y += 100
    for i, (label, on) in enumerate([("All", True), ("Copied", False), ("Spoke", False)]):
        d.text(
            (x0 + i * 108, y),
            label,
            font=ImageFont.truetype(BOLD if on else REG, 26),
            fill=blend(PAPER, TEAL, 1 - dim) if on else grey,
        )

    y += 58
    d.text((x0, y), "TODAY", font=ImageFont.truetype(BOLD, 20), fill=grey)
    y += 44

    for i, (text, source, kind) in enumerate(rows):
        if i == highlight:
            d.rounded_rectangle([x0 - 12, y - 12, x1 + 12, y + 46], radius=12,
                                fill=blend(PAPER, (232, 246, 244), 1 - dim))
        d.rounded_rectangle([x0, y + 4, x0 + 20, y + 24], radius=5, outline=grey, width=3)
        tx = x0 + 38
        if kind:
            d.text((tx, y + 5), kind, font=ImageFont.truetype(BOLD, 18), fill=grey)
            tx += 112 if kind == "RICH TEXT" else 76
        d.text((tx, y - 2), text, font=ImageFont.truetype(MONO, 28), fill=ink)
        sf = ImageFont.truetype(REG, 22)
        d.text((x1 - d.textlength(source, font=sf), y + 4), source, font=sf, fill=grey)
        y += 78
    return y


def draw_picker(d, rise: float, typed: str, rows, chosen=-1):
    """De Quick-picker: komt van onderen op over het venster heen."""
    h = 620
    top = int(H - (h * overshoot(rise)))
    d.rounded_rectangle([PAD - 20, top, W - PAD + 20, H + 40], radius=28, fill=INK)

    y = top + 46
    d.text((PAD + 8, y), "⌥Space", font=ImageFont.truetype(GLYPH, 26), fill=TEAL)
    d.text(
        (PAD + 8, y + 44),
        typed + "▏",
        font=ImageFont.truetype(REG, 34),
        fill=PAPER,
    )
    y += 112
    d.line([PAD + 8, y, W - PAD - 8, y], fill=(58, 66, 82), width=2)
    y += 26

    for i, (text, source, _kind) in enumerate(rows[:4]):
        if i == chosen:
            d.rounded_rectangle([PAD - 4, y - 10, W - PAD + 4, y + 44], radius=10,
                                fill=(38, 48, 66))
            d.rounded_rectangle([PAD - 4, y - 10, PAD, y + 44], radius=2, fill=TEAL)
        d.text((PAD + 16, y), text, font=ImageFont.truetype(MONO, 26),
               fill=PAPER if i == chosen else (176, 184, 196))
        y += 62


def caption(d, text, alpha, y=H - 250, colour=INK):
    if alpha <= 0.01:
        return
    f = ImageFont.truetype(BOLD, 54)
    parts = []
    buf = ""
    cur = None
    for ch in text:
        want = GLYPH if ch in "⌥⌘⇧" else BOLD
        if want != cur and buf:
            parts.append((buf, cur))
            buf = ""
        cur, buf = want, buf + ch
    if buf:
        parts.append((buf, cur))

    total = sum(d.textlength(p, font=ImageFont.truetype(fp, 54)) for p, fp in parts)
    x = (W - total) / 2
    for p, fp in parts:
        fnt = ImageFont.truetype(fp, 54)
        d.text((x, y), p, font=fnt, fill=blend(PAPER, colour, alpha))
        x += d.textlength(p, font=fnt)


QUERY = "invo"


def frame(t: float) -> Image.Image:
    """t is de tijd in seconden. Eén doorlopende scène."""
    img = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(img)

    # 0.0–1.6  het venster staat er, vol
    # 1.6–3.2  er wordt getypt en de lijst krimpt
    # 3.2–4.2  gefilterd, één rij over
    # 4.2–6.4  de Quick-picker komt op
    # 6.4–7.6  kiezen
    # 7.6–9.0  geplakt

    if t < 1.6:
        draw_window(d, "", ROWS)
        caption(d, "Everything you copy or say.", ease((t - 0.3) / 0.6))

    elif t < 3.4:
        p = (t - 1.6) / 1.8
        n = min(len(QUERY), int(p * len(QUERY) * 1.6))
        typed = QUERY[:n]
        rows = [r for r in ROWS if typed.lower() in r[0].lower()] if typed else ROWS
        draw_window(d, typed, rows)
        caption(d, "Type three letters.", ease((t - 1.8) / 0.5))

    elif t < 4.4:
        rows = [r for r in ROWS if QUERY in r[0].lower()]
        draw_window(d, QUERY, rows)
        caption(d, "There it is.", ease((t - 3.5) / 0.4))

    elif t < 6.6:
        rise = ease((t - 4.4) / 0.5)
        draw_window(d, "", ROWS, dim=0.55 * rise)
        draw_picker(d, rise, "invo", ROWS)
        caption(d, "Or ⌥Space, from any app.", ease((t - 5.0) / 0.5), y=H - 700, colour=PAPER)

    elif t < 7.8:
        draw_window(d, "", ROWS, dim=0.55)
        draw_picker(d, 1.0, "invo", ROWS, chosen=0)
        caption(d, "Pick it.", ease((t - 6.8) / 0.4), y=H - 700, colour=PAPER)

    else:
        draw_window(d, "", ROWS, highlight=0)
        a = ease((t - 8.0) / 0.5)
        caption(d, "Pasted where your cursor was.", a)
        if a > 0.6:
            f = ImageFont.truetype(REG, 30)
            foot = "Free · Mac and Windows · voxclip.it"
            d.text(((W - d.textlength(foot, font=f)) / 2, H - 160), foot, font=f,
                   fill=blend(PAPER, GREY, a))
    return img


def main() -> None:
    out = Path(sys.argv[1] if len(sys.argv) > 1 else "demo.mp4")
    seconds = 9.4
    with tempfile.TemporaryDirectory() as tmp:
        n = int(seconds * FPS)
        for i in range(n):
            frame(i / FPS).save(Path(tmp) / f"{i:05d}.png")
        subprocess.run(
            ["ffmpeg", "-y", "-r", str(FPS), "-i", str(Path(tmp) / "%05d.png"),
             "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18",
             "-movflags", "+faststart", str(out)],
            check=True, capture_output=True,
        )
    print(f"{out}  ({n} frames, {n / FPS:.1f}s)")


if __name__ == "__main__":
    main()
