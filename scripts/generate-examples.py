"""Génère les trois visuels détourés (fond transparent) des pièces « Exemple » du Miroir.

Usage : python scripts/generate-examples.py
Sortie : public/images/examples/{boucle,collier,haut}.png (illustrations simples, dessinées par code).
"""
import math
import os

from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "images", "examples")
os.makedirs(OUT, exist_ok=True)
S = 4  # suréchantillonnage pour lisser les bords
GOLD = (201, 150, 46, 255)
GOLD_L = (240, 205, 120, 255)
GOLD_D = (140, 95, 20, 255)
NAVY = (27, 42, 90, 255)
RED = (176, 48, 40, 255)
CREAM = (214, 160, 108, 255)


def finish(img, name, size):
    box = img.getbbox()
    img = img.crop(box)
    pad = int(0.04 * max(img.size))
    canvas = Image.new("RGBA", (img.width + 2 * pad, img.height + 2 * pad), (0, 0, 0, 0))
    canvas.paste(img, (pad, pad))
    canvas.thumbnail((size, size), Image.LANCZOS)
    canvas.save(os.path.join(OUT, name), optimize=True)
    print(name, canvas.size)


def earring():
    w, h = 400 * S, 800 * S
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx = w // 2
    d.ellipse([cx - 22 * S, 10 * S, cx + 22 * S, 54 * S], outline=GOLD_D, width=7 * S)  # crochet
    # anneau
    d.ellipse([cx - 150 * S, 60 * S, cx + 150 * S, 360 * S], outline=GOLD, width=26 * S)
    d.arc([cx - 150 * S, 60 * S, cx + 150 * S, 360 * S], 200, 300, fill=GOLD_L, width=10 * S)
    # goutte pendante
    d.polygon([(cx, 380 * S), (cx - 70 * S, 600 * S), (cx + 70 * S, 600 * S)], fill=NAVY)
    d.ellipse([cx - 70 * S, 520 * S, cx + 70 * S, 680 * S], fill=NAVY)
    d.ellipse([cx - 40 * S, 560 * S, cx - 10 * S, 600 * S], fill=(90, 110, 180, 255))
    d.rectangle([cx - 8 * S, 355 * S, cx + 8 * S, 395 * S], fill=GOLD_D)
    finish(im, "boucle.png", 600)


def necklace():
    w, h = 1200 * S, 900 * S
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx = w // 2
    n = 31
    pts = []
    for i in range(n):
        a = math.pi * (0.06 + 0.88 * i / (n - 1))
        x = cx - math.cos(a) * 520 * S
        y = 60 * S + math.sin(a) * 600 * S * (1 if False else 1)
        pts.append((x, y))
    d.line(pts, fill=GOLD_D, width=5 * S)
    for i, (x, y) in enumerate(pts):
        r = (18 if i != n // 2 else 0) * S
        col = [GOLD, RED, NAVY][i % 3]
        if r:
            d.ellipse([x - r, y - r, x + r, y + r], fill=col)
            d.ellipse([x - r * 0.45, y - r * 0.6, x - r * 0.05, y - r * 0.2], fill=(255, 255, 255, 120))
    px, py = pts[n // 2]
    d.ellipse([px - 60 * S, py - 10 * S, px + 60 * S, py + 110 * S], fill=GOLD)
    d.ellipse([px - 36 * S, py + 14 * S, px + 36 * S, py + 86 * S], fill=RED)
    d.ellipse([px - 20 * S, py + 20 * S, px - 4 * S, py + 40 * S], fill=(255, 255, 255, 120))
    finish(im, "collier.png", 900)


def top():
    w, h = 1000 * S, 1000 * S
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    f = S
    body = [(300, 120), (420, 120), (500, 200), (580, 120), (700, 120), (950, 260), (850, 400), (740, 340),
            (760, 900), (240, 900), (260, 340), (150, 400), (50, 260)]
    d.polygon([(x * f, y * f) for x, y in body], fill=CREAM)
    # motif de bandes façon kente
    bands = [(380, NAVY), (470, RED), (560, GOLD)]
    for y, c in bands:
        d.polygon([(255 * f, y * f), (745 * f, y * f), (748 * f, (y + 40) * f), (252 * f, (y + 40) * f)], fill=c)
    for i in range(7):
        x = 280 + i * 70
        d.polygon([(x * f, 700 * f), ((x + 35) * f, 650 * f), ((x + 70) * f, 700 * f), ((x + 35) * f, 750 * f)], fill=[NAVY, RED, GOLD][i % 3])
    # encolure
    d.polygon([(420 * f, 120 * f), (580 * f, 120 * f), (500 * f, 230 * f)], fill=(0, 0, 0, 0))
    d.line([(420 * f, 120 * f), (500 * f, 230 * f), (580 * f, 120 * f)], fill=GOLD_D, width=8 * f)
    # ombre douce (plis)
    shade = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shade)
    sd.polygon([(x * f, y * f) for x, y in [(240, 560), (760, 560), (760, 900), (240, 900)]], fill=(0, 0, 0, 22))
    shade = shade.filter(ImageFilter.GaussianBlur(25 * f))
    im.alpha_composite(Image.composite(shade, Image.new("RGBA", (w, h), (0, 0, 0, 0)), im.getchannel("A")))
    finish(im, "haut.png", 900)


earring()
necklace()
top()

