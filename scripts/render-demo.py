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
#
# Nooit een volledig adres met huisnummer. Wat er in een demo staat wordt door
# duizenden mensen bekeken en bevroren in een bestand dat je niet meer terug kunt
# halen; een straat met een nummer erbij is dan iemands voordeur. Postcodes en
# huisnummers dus niet, ook niet verzonnen — die bestaan meestal echt.
ROWS = [
    ("invoice@voxclip.it", "Chrome · 12m", "RICH TEXT"),
    ("Pick-up point: the bakery on the corner", "Notes · 41m", ""),
    ("Call the notary — 3:00", "Notes · 1h", "SPOKE"),
    ("Order #48213 — delivery Thursday", "Mail · 2h", ""),
    ("Meeting moved to 14:30, room 2.", "Notes · 3h", ""),
]


def draw_window(d, typed: str, rows, highlight=-1, dim=0.0, chip=0):
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
    for i, label in enumerate(["All", "Copied", "Spoke"]):
        on = i == chip
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


# ---------------------------------------------------------------------------
# De scenario's.
#
# Allemaal dezelfde vorm — het venster staat van begin tot eind in beeld en er
# gebeurt iets in — maar elk vertelt iets anders. Dat is het verschil tussen
# variatie en herhaling: dezelfde camera, een ander verhaal.
# ---------------------------------------------------------------------------

SPOKEN = ("Ask Arend about the pricing page", "Dictated \u00b7 now", "SPOKE")
SNIPPET = ("Thanks for the quick reply \u2014 notes added.", "Snippet", "")
IMAGE = ("Screenshot 2026-08-18.png", "Preview \u00b7 5m", "IMAGE")


def scene_search(t, d):
    """Typen, filteren, Quick-picker, plakken."""
    q = "invo"
    if t < 1.6:
        draw_window(d, "", ROWS)
        caption(d, "Everything you copy or say.", ease((t - 0.3) / 0.6))
    elif t < 3.4:
        n = min(len(q), int((t - 1.6) / 1.8 * len(q) * 1.6))
        typed = q[:n]
        rows = [r for r in ROWS if typed.lower() in r[0].lower()] if typed else ROWS
        draw_window(d, typed, rows)
        caption(d, "Type three letters.", ease((t - 1.8) / 0.5))
    elif t < 4.4:
        draw_window(d, q, [r for r in ROWS if q in r[0].lower()])
        caption(d, "There it is.", ease((t - 3.5) / 0.4))
    elif t < 6.6:
        rise = ease((t - 4.4) / 0.5)
        draw_window(d, "", ROWS, dim=0.55 * rise)
        draw_picker(d, rise, "invo", ROWS)
        caption(d, "Or \u2325Space, from any app.", ease((t - 5.0) / 0.5), y=H - 780)
    elif t < 7.8:
        draw_window(d, "", ROWS, dim=0.55)
        draw_picker(d, 1.0, "invo", ROWS, chosen=0)
        caption(d, "Pick it.", ease((t - 6.8) / 0.4), y=H - 780)
    else:
        draw_window(d, "", ROWS, highlight=0)
        caption(d, "Pasted where your cursor was.", ease((t - 8.0) / 0.5))


def scene_dictate(t, d):
    """Je zegt iets en het staat bovenaan tussen je kopieen."""
    if t < 1.8:
        draw_window(d, "", ROWS)
        caption(d, "Typing a note is slower than saying it.", ease((t - 0.3) / 0.6))
    elif t < 4.0:
        draw_window(d, "", ROWS, dim=0.35)
        cx, cy = W // 2, H - 640
        for i in range(-3, 4):
            amp = 40 + 46 * abs((t * 3 + i) % 2 - 1)
            d.rounded_rectangle(
                [cx + i * 34 - 8, cy - amp / 2, cx + i * 34 + 8, cy + amp / 2],
                radius=8, fill=TEAL)
        caption(d, "So say it.", ease((t - 2.2) / 0.5))
    elif t < 6.4:
        draw_window(d, "", [SPOKEN] + ROWS[:4], highlight=0)
        caption(d, "It lands in the same Timeline.", ease((t - 4.4) / 0.5))
    else:
        draw_window(d, "", [SPOKEN] + ROWS[:4])
        caption(d, "Your voice never leaves this Mac.", ease((t - 6.8) / 0.5))


def scene_filter(t, d):
    """Copied en Spoke: een tik en je ziet er een soort."""
    rows = [SPOKEN] + ROWS[:4]
    if t < 2.0:
        draw_window(d, "", rows)
        caption(d, "Copies and voice notes, together.", ease((t - 0.3) / 0.6))
    elif t < 4.6:
        draw_window(d, "", [r for r in rows if r[2] != "SPOKE"], chip=1)
        caption(d, "Only what you copied.", ease((t - 2.4) / 0.5))
    elif t < 7.0:
        draw_window(d, "", [r for r in rows if r[2] == "SPOKE"], chip=2)
        caption(d, "Or only what you said.", ease((t - 4.9) / 0.5))
    else:
        draw_window(d, "", rows)
        caption(d, "One tap. No menus.", ease((t - 7.3) / 0.5))


def scene_snippet(t, d):
    """De regel die je elke dag typt, een keer bewaard."""
    if t < 2.0:
        draw_window(d, "", ROWS)
        caption(d, "You have typed this reply five times.", ease((t - 0.3) / 0.6))
    elif t < 4.4:
        draw_window(d, "", [SNIPPET] + ROWS[:4], highlight=0)
        caption(d, "Save it once.", ease((t - 2.3) / 0.5))
    elif t < 6.8:
        rise = ease((t - 4.4) / 0.5)
        draw_window(d, "", ROWS, dim=0.55 * rise)
        draw_picker(d, rise, "than", [SNIPPET] + ROWS[:3], chosen=0)
        caption(d, "Two keys from now on.", ease((t - 5.2) / 0.5), y=H - 780)
    else:
        draw_window(d, "", [SNIPPET] + ROWS[:4], highlight=0)
        caption(d, "Snippets. Free, on your machine.", ease((t - 7.1) / 0.5))


def scene_kinds(t, d):
    """Niet alleen tekst."""
    rows = [IMAGE] + ROWS[:4]
    if t < 2.0:
        draw_window(d, "", ROWS)
        caption(d, "It is not only text.", ease((t - 0.3) / 0.6))
    elif t < 4.4:
        draw_window(d, "", rows, highlight=0)
        caption(d, "Images and files as well.", ease((t - 2.3) / 0.5))
    elif t < 6.8:
        draw_window(d, "", rows, highlight=0)
        caption(d, "Whatever you copied, it kept.", ease((t - 4.7) / 0.5))
    else:
        draw_window(d, "", rows)
        caption(d, "Free \u00b7 Mac and Windows", ease((t - 7.1) / 0.5))


SCENES = {
    "search": (scene_search, 9.4),
    "dictate": (scene_dictate, 8.6),
    "filter": (scene_filter, 9.0),
    "snippet": (scene_snippet, 9.2),
    "kinds": (scene_kinds, 8.8),
}


def frame(scene, t: float) -> Image.Image:
    img = Image.new("RGB", (W, H), PAPER)
    scene(t, ImageDraw.Draw(img))
    return img


def main() -> None:
    name = sys.argv[1] if len(sys.argv) > 1 else "search"
    out = Path(sys.argv[2] if len(sys.argv) > 2 else f"demo-{name}.mp4")
    scene, seconds = SCENES[name]
    with tempfile.TemporaryDirectory() as tmp:
        n = int(seconds * FPS)
        for i in range(n):
            frame(scene, i / FPS).save(Path(tmp) / f"{i:05d}.png")
        subprocess.run(
            ["ffmpeg", "-y", "-r", str(FPS), "-i", str(Path(tmp) / "%05d.png"),
             "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18",
             "-movflags", "+faststart", str(out)],
            check=True, capture_output=True,
        )
    print(f"{out}  ({n} frames, {n / FPS:.1f}s)")


if __name__ == "__main__":
    main()
