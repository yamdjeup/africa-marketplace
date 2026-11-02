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
    "celanie-2": ([(.138, .14), (.878, .14), (.878, .845), (.138, .845)], False),
    "kenof-1": ([(.02, .02), (.99, .02), (.99, .945), (.02, .945)], False),
    "kenof-2": ([(.02, .03), (.99, .03), (.99, .945), (.02, .945)], False),
    "kenof-3": ([(.02, .025), (.99, .025), (.99, .955), (.02, .955)], False),
    "morere-1": ([(.05, .1), (.95, .1), (.95, .96), (.05, .96)], True),
    "morere-2": ([(.03, .0), (.97, .0), (.97, .995), (.03, .995)], True),
    "padua-1": ([(.025, .02), (.975, .015), (.975, .975), (.02, .975)], False),
    "padua-2": ([(.03, .035), (.99, .015), (.98, .95), (.02, .95)], False),
    "padua-3": ([(.02, .02), (.985, .025), (.985, .975), (.02, .975)], False),
    "taylor-1": ([(.04, .025), (.955, .025), (.955, .965), (.04, .965)], False),
    "taylor-2": ([(.02, .03), (.975, .03), (.975, .93), (.015, .935)], False),
    "taylor-3": ([(.06, .045), (.93, .045), (.93, .925), (.05, .93)], False),
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


PAD = 0.035  # le quadrilatère de départ est élargi de ce ratio avant affinage
SEARCH = 0.06  # demi-largeur de recherche du bord (fraction de la dimension)
INSET = -3  # px laissés au-delà du bord détecté : on ne coupe jamais l'œuvre
# bords ambigus (passe-partout, vitrine) : recherche restreinte autour de l'amorce
TIGHT = {"celanie-1": (0.0, 0.012), "celanie-2": (0.0, 0.015), "taylor-1": (0.0, 0.012), "padua-1": (0.0, 0.015), "taylor-3": (0.0, 0.012), "taylor-2": (0.0, 0.015), "kenof-1": (0.0, 0.012), "kenof-2": (0.0, 0.012)}
SCULPTURES = {"morere-1", "morere-2"}  # sans bord net : centrage sur l'objet + marge uniforme
SCULPT_MARGIN = 0.07


def expand(quad, pad):
    c = np.mean(quad, axis=0)
    return [tuple(c + (np.array(p) - c) * (1 + 2 * pad)) for p in quad]


def refine_quad(gray, quad, search=SEARCH):
    """Ajuste chaque côté sur le vrai bord (gradient max, droite robuste) puis intersecte."""
    h, w = gray.shape
    g = cv2.GaussianBlur(gray.astype(np.float32), (0, 0), 2.5)
    pts = np.array([(x * w, y * h) for x, y in quad], dtype=np.float64)
    lines = []
    for i in range(4):
        a, b = pts[i], pts[(i + 1) % 4]
        d = b - a
        length = np.linalg.norm(d)
        t = d / length
        n = np.array([-t[1], t[0]])
        c = pts.mean(axis=0)
        if np.dot(n, a - c) < 0:
            n = -n  # normale vers l'extérieur
        rad = search * min(w, h)
        offs = np.arange(-rad, rad + 1, 1.0)
        found = []
        for s in np.linspace(0.12, 0.88, 13):
            base = a + d * s
            vals = []
            for o in offs:
                acc = 0.0
                for k in (-6, -3, 0, 3, 6):
                    p = base + n * o + t * k
                    x = int(np.clip(round(p[0]), 0, w - 1))
                    y = int(np.clip(round(p[1]), 0, h - 1))
                    acc += g[y, x]
                vals.append(acc / 5)
            grad = np.abs(np.gradient(np.array(vals)))
            found.append(base + n * offs[int(np.argmax(grad))])
        found = np.array(found, dtype=np.float32)
        vx, vy, x0, y0 = cv2.fitLine(found, cv2.DIST_HUBER, 0, 0.01, 0.01).ravel()
        lines.append((np.array([x0, y0]), np.array([vx, vy])))
    corners = []
    for i in range(4):
        p1, d1 = lines[i - 1]
        p2, d2 = lines[i]
        m = np.array([d1, -d2]).T
        s = np.linalg.solve(m, p2 - p1)
        corners.append(p1 + d1 * s[0])
    out = np.array(corners)
    # rentre légèrement pour éviter les liserés
    c = out.mean(axis=0)
    out = out + (c - out) / np.linalg.norm(c - out, axis=1, keepdims=True) * INSET
    return [(x / w, y / h) for x, y in out]


def residual_margins(img):
    """Distance (px) entre chaque bord de l'image et le plus fort gradient dans la bande extérieure (≈ liseré restant)."""
    g = cv2.GaussianBlur(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32), (0, 0), 2)
    h, w = g.shape
    bh, bw = max(4, int(h * 0.04)), max(4, int(w * 0.04))
    prof = {
        "G": g[int(h * .2):int(h * .8), :bw].mean(axis=0),
        "D": g[int(h * .2):int(h * .8), w - bw:].mean(axis=0)[::-1],
        "H": g[:bh, int(w * .2):int(w * .8)].mean(axis=1),
        "B": g[h - bh:, int(w * .2):int(w * .8)].mean(axis=1)[::-1],
    }
    res = {}
    for k, v in prof.items():
        gr = np.abs(np.gradient(v))
        res[k] = int(np.argmax(gr)) if gr.max() > 3 else 0
    return res


def sculpture_bbox(img):
    bg = cv2.medianBlur(cv2.resize(img, None, fx=.25, fy=.25), 51)
    bg = cv2.resize(bg, (img.shape[1], img.shape[0]))
    diff = cv2.cvtColor(cv2.absdiff(img, bg), cv2.COLOR_BGR2GRAY)
    mask = (cv2.GaussianBlur(diff, (0, 0), 3) > 14).astype(np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((25, 25), np.uint8))
    ys, xs = np.where(mask)
    x0, x1 = np.percentile(xs, (0.3, 99.7)).astype(int)
    y0, y1 = np.percentile(ys, (0.3, 99.7)).astype(int)
    return x0, x1, y0, y1


def sculpture_crop(img):
    x0, x1, y0, y1 = sculpture_bbox(img)
    m = int(SCULPT_MARGIN * max(x1 - x0, y1 - y0))
    x0, x1, y0, y1 = x0 - m, x1 + m, y0 - m, y1 + m
    pad = max(0, -x0, -y0, x1 - img.shape[1], y1 - img.shape[0])
    if pad:
        img = cv2.copyMakeBorder(img, pad, pad, pad, pad, cv2.BORDER_REFLECT)
        x0, x1, y0, y1 = x0 + pad, x1 + pad, y0 + pad, y1 + pad
    return img[y0:y1, x0:x1], (m, m, m, m)


def process(name, quad, wb):
    img = cv2.imread(str(SRC / f"{name}.jpg"))
    if name in SCULPTURES:
        img, _ = sculpture_crop(img)
    else:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        pad, search = TIGHT.get(name, (PAD, SEARCH))
        quad = refine_quad(gray, refine_quad(gray, expand(quad, pad), search), search)
        img = rectify(img, quad)
    if wb:
        img = white_balance(img)
    if name in SCULPTURES:
        x0, x1, y0, y1 = sculpture_bbox(img)
        margins = {'G': x0, 'D': img.shape[1] - x1, 'H': y0, 'B': img.shape[0] - y1}
    else:
        margins = residual_margins(img)
    img = sharpen(tone(img))
    h, w = img.shape[:2]
    s = min(1.0, MAX_SIDE / max(h, w))
    if s < 1:
        img = cv2.resize(img, (round(w * s), round(h * s)), interpolation=cv2.INTER_AREA)
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    Image.fromarray(rgb).save(OUT / f"{name}.jpg", quality=90, optimize=True, progressive=True)
    return (w, h), margins


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
    print("oeuvre; taille px; liseré résiduel G/D/H/B px")
    for n, (q, wb) in CORNERS.items():
        size, m = process(n, q, wb)
        print(f"{n}; {size[0]}x{size[1]}; {m['G']}/{m['D']}/{m['H']}/{m['B']}")
    if "--sheet" in sys.argv:
        sheet(sys.argv[sys.argv.index("--sheet") + 1])
