"""Redresse, recadre et corrige (exposition, contraste, netteté) les photos d'œuvres.

Correction photographique fidèle uniquement : aucune retouche créative.
Originaux : scripts/photo-originals/ (ignoré par git, non déployé).
Sorties   : public/images/artworks/ (JPEG q90, 2000 px max côté long).
Usage     : python scripts/enhance-photos.py [--sheet chemin.jpg]
Dépendances : opencv-python, numpy, pillow.
"""
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "scripts" / "photo-originals"
OUT = ROOT / "public" / "images" / "artworks"
MAX_SIDE = 2000

# Coins de l'œuvre (fractions de l'image) : haut-gauche, haut-droit, bas-droit, bas-gauche.
# wb : balance des blancs gris-moyen légère (désactivée pour les teintes d'auteur, ex. tirages chauds).
CORNERS = {
    "celanie-1": ([(.035, .02), (.925, .02), (.925, .985), (.035, .985)], False),
    "celanie-2": ([(.138, .14), (.878, .14), (.878, .935), (.138, .935)], False),
    "kenof-1": ([(.02, .02), (.99, .02), (.99, .955), (.02, .955)], False),
    "kenof-2": ([(.02, .03), (.99, .03), (.99, .955), (.02, .955)], False),
    "kenof-3": ([(.02, .025), (.99, .025), (.99, .955), (.02, .955)], False),
    "morere-1": ([(.05, .1), (.95, .1), (.95, .96), (.05, .96)], True),
    "morere-2": ([(.03, .0), (.97, .0), (.97, .995), (.03, .995)], True),
    "padua-1": ([(.025, .02), (.99, .015), (.985, .985), (.02, .98)], False),
    "padua-2": ([(.03, .035), (.99, .015), (.98, .95), (.02, .95)], False),
    "padua-3": ([(.02, .02), (.985, .025), (.985, .975), (.02, .975)], False),
    "taylor-1": ([(.04, .025), (.975, .025), (.975, .975), (.04, .975)], False),
    "taylor-2": ([(.02, .03), (.975, .03), (.975, .94), (.015, .945)], False),
    "taylor-3": ([(.06, .025), (.94, .025), (.94, .95), (.05, .955)], False),
    }

def rectify(img, quad):
    h, w = img.shape[:2]
    pts = np.array([(x * w, y * h) for x, y in quad], dtype=np.float32)
    tl, tr, br, bl = pts
    out_w = int(round((np.linalg.norm(tr - tl) + np.linalg.norm(br - bl)) / 2))
    out_h = int(round((np.linalg.norm(bl - tl) + np.linalg.norm(br - tr)) / 2))
    dst = np.array([[0, 0], [out_w, 0], [out_w, out_h], [0, out_h]], dtype=np.float32)
    m = cv2.getPerspectiveTransform(pts, dst)
    return cv2.warpPerspective(img, m, (out_w, out_h), flags=cv2.INTER_CUBIC)


def white_balance(img):
    f = img.astype(np.float32)
    means = f.reshape(-1, 3).mean(axis=0)
    gain = np.clip(means.mean() / means, 0.92, 1.08)
    return np.clip(f * gain, 0, 255).astype(np.uint8)


def tone(img):
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l = lab[..., 0].astype(np.float32)
    lo, hi = np.percentile(l, (0.5, 99.7))
    l = np.clip((l - lo) / max(hi - lo, 1) * 255, 0, 255)
    l = 255 * (l / 255) ** 0.96
    lab[..., 0] = l.astype(np.uint8)
    return cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)


def sharpen(img):
    blur = cv2.GaussianBlur(img, (0, 0), 1.6)
    return cv2.addWeighted(img, 1.35, blur, -0.35, 0)


def process(name, quad, wb):
    img = cv2.imread(str(SRC / f"{name}.jpg"))
    img = rectify(img, quad)
    if wb:
        img = white_balance(img)
    img = sharpen(tone(img))
    h, w = img.shape[:2]
    s = min(1.0, MAX_SIDE / max(h, w))
    if s < 1:
        img = cv2.resize(img, (round(w * s), round(h * s)), interpolation=cv2.INTER_AREA)
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    Image.fromarray(rgb).save(OUT / f"{name}.jpg", quality=90, optimize=True, progressive=True)


def sheet(path):
    cell = 400
    names = list(CORNERS)
    canvas = Image.new("RGB", (cell * 7, cell * 4), "#444")
    for i, n in enumerate(names):
        for row, folder in enumerate((SRC, OUT)):
            im = Image.open(folder / f"{n}.jpg")
            im.thumbnail((cell - 8, cell - 8))
            canvas.paste(im, ((i % 7) * cell + 4, (i // 7) * cell * 2 + row * cell + 4))
    canvas.save(path, quality=85)


if __name__ == "__main__":
    for n, (q, wb) in CORNERS.items():
        process(n, q, wb)
    if "--sheet" in sys.argv:
        sheet(sys.argv[sys.argv.index("--sheet") + 1])
