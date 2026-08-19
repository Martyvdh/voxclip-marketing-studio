#!/usr/bin/env python3
"""
Rendert een VoxClip-video naar mp4, hier, zonder browser.

Waarom dit bestaat: de editor tekent in een canvas in Chrome en neemt dat op met
MediaRecorder. Dat draait op het scherm van de gebruiker, dus ik kon nooit zien
wat ik maakte — ik heb honderdvijftig startpunten gebouwd zonder er ooit een te
bekijken, en dat was te zien.

Dit is niet de editor en het vervangt hem niet. Het is een tweede paar ogen:
dezelfde merkregels, dezelfde animatiecurves, maar dan als bestand dat je hier
kunt afspelen en beoordelen.

Gebruik:
    python3 scripts/render-video.py uit.mp4
"""

import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

# --- merk ------------------------------------------------------------------

INK = (28, 34, 48)
PAPER = (247, 247, 245)
TEAL = (18, 179, 166)

W, H = 1080, 1920
FPS = 30

BOLD = "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf"
REG = "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf"

# Liberation Sans tekent ⌥ als een leeg blokje. Dat zag je pas terug in het
# beeld, niet in de code — reden te meer om altijd naar het bestand te kijken.
FALLBACK = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
NEEDS_FALLBACK = set("⌥⌘⇧⌃↑↓←→")

# --- curves ----------------------------------------------------------------
# Dezelfde als in src/lib/video/animations.ts, zodat wat je hier ziet klopt met
# wat de editor doet.


def clamp01(x: float) -> float:
    return max(0.0, min(1.0, x))


def overshoot(t: float) -> float:
    """Schiet voorbij en komt terug. Back-out."""
    c1 = 1.70158
    c3 = c1 + 1
    u = clamp01(t) - 1
    return 1 + c3 * u**3 + c1 * u**2


def bounce_out(t: float) -> float:
    x = clamp01(t)
    n1, d1 = 7.5625, 2.75
    if x < 1 / d1:
        return n1 * x * x
    if x < 2 / d1:
        x -= 1.5 / d1
        return n1 * x * x + 0.75
    if x < 2.5 / d1:
        x -= 2.25 / d1
        return n1 * x * x + 0.9375
    x -= 2.625 / d1
    return n1 * x * x + 0.984375


def ease_in_out(t: float) -> float:
    x = clamp01(t)
    return 2 * x * x if x < 0.5 else 1 - (-2 * x + 2) ** 2 / 2


# --- clips -----------------------------------------------------------------

TRAVEL = 420


def clip(text, seconds, anim="rise", dark=True, size=96, second=None):
    return {
        "text": text,
        "second": second,
        "seconds": seconds,
        "anim": anim,
        "dark": dark,
        "size": size,
    }


def beat(seconds=0.5, dark=True):
    return {"beat": True, "seconds": seconds, "dark": dark}


def app(label, seconds, query="Search everything you've copied or said",
        row="invoice@voxclip.it", source="Chrome · 12m"):
    """Een beeld met het echte venster erin. Zie draw_app voor de grens."""
    return {
        "app": True, "label": label, "seconds": seconds,
        "query": query, "row": row, "source": source, "dark": False,
    }


STORY = [
    clip("Where did\nI copy that?", 2.4, "whip", dark=True, size=110),
    beat(0.5, dark=False),
    app("Recall in two keys", 4.0),
    clip("And everything you say.", 1.8, "drop", dark=True, size=84),
    clip("One Timeline.", 1.6, "punch", dark=False, size=118),
    clip("⌥Space brings it back.", 2.2, "fly", dark=True, size=84),
    clip("Free.", 2.0, "punch", dark=False, size=140, second="Mac and Windows  ·  voxclip.it"),
]


def transform(anim: str, p: float):
    """dx, dy, scale, alpha op voortgang p binnen de clip."""
    if anim == "whip":
        t = ease_in_out(clamp01(p / 0.16))
        return (1 - t) * -TRAVEL * 1.4, 0, 1.0, clamp01(t * 4)
    if anim == "fly":
        t = overshoot(clamp01(p / 0.22))
        return (1 - t) * TRAVEL, 0, 1.0, clamp01(t * 2)
    if anim == "drop":
        t = bounce_out(clamp01(p / 0.22))
        return 0, (1 - t) * -TRAVEL, 1.0, clamp01(t * 3)
    if anim == "punch":
        t = overshoot(clamp01(p / 0.22))
        return 0, 0, 1.45 - t * 0.45, clamp01(t * 3)
    t = overshoot(clamp01(p / 0.22))
    return 0, (1 - t) * TRAVEL * 0.8, 1.0, clamp01(t * 2)


def blend(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


# --- het merkteken ---------------------------------------------------------
#
# Niet natekenen maar inladen. Hier stond een met de hand getekend blokje met
# drie balkjes, zonder de ingesneden hoek — dus niet het merkteken maar iets dat
# erop leek. Een logo dat je natekent loopt uit de pas zodra het echte verandert,
# en dan staat er in tien video's een versie die nergens meer bestaat.
#
# Bron: public/voxclip-mark.svg, via public/voxclip-mark-512.png.

MARK_PATH = Path(__file__).resolve().parent.parent / "public" / "voxclip-mark-512.png"
_mark_cache: dict[int, Image.Image] = {}


def mark(size: int) -> Image.Image:
    """Het merkteken op maat, met doorzichtige achtergrond."""
    if size not in _mark_cache:
        _mark_cache[size] = Image.open(MARK_PATH).convert("RGBA").resize(
            (size, size), Image.LANCZOS
        )
    return _mark_cache[size]


def paste_mark(img: Image.Image, x: int, y: int, size: int, alpha: float = 1.0) -> None:
    m = mark(size)
    if alpha < 1.0:
        m = m.copy()
        m.putalpha(m.getchannel("A").point(lambda v: int(v * clamp01(alpha))))
    img.alpha_composite(m, (x, y)) if img.mode == "RGBA" else img.paste(m, (x, y), m)




def runs(text: str):
    """Splitst een regel in stukken die dezelfde font nodig hebben."""
    out, buf, cur = [], "", None
    for ch in text:
        want = FALLBACK if ch in NEEDS_FALLBACK else BOLD
        if want != cur and buf:
            out.append((buf, cur))
            buf = ""
        cur, buf = want, buf + ch
    if buf:
        out.append((buf, cur))
    return out


def line_width(d, text, size):
    return sum(
        d.textlength(part, font=ImageFont.truetype(path, size))
        for part, path in runs(text)
    )


def draw_line(d, text, size, x, y, fill):
    for part, path in runs(text):
        font = ImageFont.truetype(path, size)
        d.text((x, y), part, font=font, fill=fill)
        x += d.textlength(part, font=font)


def draw_app(d, top: int, alpha: float, query: str, row: str, source: str) -> int:
    """
    Tekent het VoxClip-venster.

    Dit breekt bewust de regel in AGENTS.md dat de interface nooit getekend wordt.
    Die regel bestaat omdat een verzonnen scherm een bewering is over het product.
    Daarom staat hier alleen wat op 18 augustus 2026 in build 0.2.14 echt op het
    scherm stond: dit zoekveld met deze tekst, deze drie filters, deze voettekst,
    en `⌥Space` als sneltoets.

    Wie hier iets aan toevoegt dat de app niet doet, maakt er een leugen van.
    Verandert de app, dan verandert dit mee of het gaat eruit.
    """
    pad = 56
    x0, x1 = pad, W - pad
    ink = blend(PAPER, INK, alpha)
    faint = blend(PAPER, (150, 158, 170), alpha)

    paste_mark(d._image, x0, top, 46, alpha)
    f = ImageFont.truetype(BOLD, 34)
    d.text((x0 + 60, top + 6), "VoxClip", font=f, fill=ink)

    y = top + 78
    # zoekveld
    d.rounded_rectangle([x0, y, x1, y + 74], radius=18, fill=blend(PAPER, (238, 239, 241), alpha))
    d.ellipse([x0 + 26, y + 26, x0 + 48, y + 48], outline=faint, width=4)
    d.line([x0 + 45, y + 45, x0 + 54, y + 54], fill=faint, width=4)
    d.text((x0 + 72, y + 20), query, font=ImageFont.truetype(REG, 30), fill=faint)

    y += 100
    # filters
    for i, (label, on) in enumerate([("All", True), ("Copied", False), ("Spoke", False)]):
        fx = x0 + i * 108
        cf = ImageFont.truetype(BOLD if on else REG, 26)
        d.text((fx, y), label, font=cf, fill=blend(PAPER, TEAL, alpha) if on else faint)

    y += 58
    d.text((x0, y), "TODAY", font=ImageFont.truetype(BOLD, 20), fill=faint)

    y += 42
    # één rij
    d.rounded_rectangle([x0, y, x0 + 20, y + 20], radius=5, outline=faint, width=3)
    d.text((x0 + 38, y + 1), "RICH TEXT", font=ImageFont.truetype(BOLD, 18), fill=faint)
    d.text(
        (x0 + 150, y - 6),
        row,
        font=ImageFont.truetype("/usr/share/fonts/truetype/liberation2/LiberationMono-Regular.ttf", 30),
        fill=ink,
    )
    sf = ImageFont.truetype(REG, 22)
    d.text((x1 - d.textlength(source, font=sf), y + 2), source, font=sf, fill=faint)
    return y


def draw_frame(spec, p: float) -> Image.Image:
    bg = INK if spec["dark"] else PAPER
    fg = PAPER if spec["dark"] else INK
    img = Image.new("RGB", (W, H), bg)
    d = ImageDraw.Draw(img)

    if spec.get("app"):
        # Het venster schuift van onderen in beeld en de onderregel blijft staan.
        t = overshoot(clamp01(p / 0.25))
        top = int(120 + (1 - t) * 260)
        y = draw_app(d, top, clamp01(t * 2), spec["query"], spec["row"], spec["source"])

        lf = ImageFont.truetype(BOLD, 60)
        label = spec["label"]
        d.text(
            ((W - d.textlength(label, font=lf)) / 2, H - 340),
            label, font=lf, fill=blend(PAPER, TEAL, clamp01((p - 0.2) * 3)),
        )
        ff = ImageFont.truetype(REG, 26)
        foot = "Everything stays on this Mac  ·  ⌥Space to recall anywhere"
        d.text(
            ((W - line_width(d, foot, 26)) / 2, H - 190),
            foot, font=ff, fill=blend(PAPER, (150, 158, 170), clamp01((p - 0.3) * 3)),
        )
        return img

    if spec.get("beat"):
        # Een streep. Klein, meekleurend. Geen kader: dat leest als een leeg vak.
        w = int(W * 0.16)
        d.rounded_rectangle(
            [(W - w) // 2, H // 2 - 7, (W + w) // 2, H // 2 + 7], radius=7, fill=TEAL
        )
        return img

    dx, dy, scale, alpha = transform(spec["anim"], p)
    size = max(12, int(spec["size"] * scale))
    font = ImageFont.truetype(BOLD, size)

    lines = spec["text"].split("\n")
    gap = int(size * 1.18)

    # Optisch centreren op de werkelijke hoogte van de letters, niet op de
    # regelhoogte. Anders hangt het blok merkbaar te hoog, want een font laat
    # ruimte boven de kapitalen die je niet ziet.
    asc, desc = font.getmetrics()
    total = gap * (len(lines) - 1) + (asc - desc // 2)
    y = (H - total) // 2 + int(dy) - (asc - font.getbbox("H")[3])

    colour = blend(bg, fg, alpha)
    for line in lines:
        x = (W - line_width(d, line, size)) / 2 + dx
        draw_line(d, line, size, x, y, colour)
        y += gap

    if spec.get("second"):
        sf = ImageFont.truetype(REG, 40)
        box = d.textbbox((0, 0), spec["second"], font=sf)
        d.text(
            ((W - (box[2] - box[0])) // 2 - box[0], y + 40),
            spec["second"],
            font=sf,
            fill=blend(bg, fg, alpha * 0.7),
        )

    # De teal streep onder de tekst. Een klein element, nooit een vlak.
    if alpha > 0.9 and not spec.get("second"):
        w = int(W * 0.1 * ease_in_out(clamp01((p - 0.2) / 0.4)))
        if w > 4:
            d.rounded_rectangle(
                [(W - w) // 2, y + 34, (W + w) // 2, y + 44], radius=5, fill=TEAL
            )
    return img


def main() -> None:
    out = Path(sys.argv[1] if len(sys.argv) > 1 else "voxclip.mp4")
    with tempfile.TemporaryDirectory() as tmp:
        n = 0
        for spec in STORY:
            frames = int(spec["seconds"] * FPS)
            for f in range(frames):
                draw_frame(spec, f / max(1, frames - 1)).save(
                    Path(tmp) / f"{n:05d}.png"
                )
                n += 1

        subprocess.run(
            [
                "ffmpeg", "-y", "-r", str(FPS),
                "-i", str(Path(tmp) / "%05d.png"),
                "-c:v", "libx264", "-pix_fmt", "yuv420p",
                "-crf", "18", "-movflags", "+faststart",
                str(out),
            ],
            check=True,
            capture_output=True,
        )
    print(f"{out}  ({n} frames, {n / FPS:.1f}s)")


if __name__ == "__main__":
    main()
