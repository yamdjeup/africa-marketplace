"""Detoure les 3 visuels de couture d'exemple (lot E2) : fond uni -> PNG/WebP transparent.
Usage : python scripts/prepare-couture-examples.py <dossier-source>
"""
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

SRC = Path(sys.argv[1])
OUT = Path(__file__).resolve().parent.parent / "public" / "images" / "examples"


def bg_mask(rgb, tol, also_white=False):
    """Fond = pixels proches du fond, connectes aux bords (flood fill)."""
    h, w, _ = rgb.shape
    border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    ref = np.median(border, axis=0)
    close = np.abs(rgb.astype(int) - ref).max(axis=2) <= tol
    if also_white:
        close |= (rgb.min(axis=2) >= 235) | (rgb.max(axis=2) <= 10)
    seen = np.zeros((h, w), bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if close[y, x] and not seen[y, x]:
                seen[y, x] = True
                q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if close[y, x] and not seen[y, x]:
                seen[y, x] = True
                q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and close[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True
                q.append((ny, nx))
    return seen


def cut(name, out, tol, max_side, fmt, white_ring=False):
    im = Image.open(SRC / name).convert("RGB")
    rgb = np.array(im)
    bg = bg_mask(rgb, tol, white_ring)
    if white_ring:
        # fin liseré blanc en bordure : on le traite aussi comme fond
        white = (rgb.min(axis=2) >= 235)
        bg |= bg_mask(np.where(white[..., None], 255, rgb).astype(np.uint8), 0) & white
    alpha = Image.fromarray(np.where(bg, 0, 255).astype(np.uint8))
    alpha = alpha.filter(ImageFilter.MinFilter(5)).filter(ImageFilter.GaussianBlur(0.8))
    rgba = im.copy()
    rgba.putalpha(alpha)
    bbox = rgba.getchannel("A").point(lambda v: 255 if v > 20 else 0).getbbox()
    pad = 12
    bbox = (max(bbox[0] - pad, 0), max(bbox[1] - pad, 0), min(bbox[2] + pad, rgba.width), min(bbox[3] + pad, rgba.height))
    rgba = rgba.crop(bbox)
    rgba.thumbnail((max_side, max_side), Image.LANCZOS)
    path = OUT / out
    if fmt == "webp":
        rgba.save(path, "WEBP", quality=82, method=6)
    else:
        rgba.save(path, "PNG", optimize=True)
    print(out, rgba.size, path.stat().st_size // 1024, "Ko")


cut("veste-tiedye.webp", "veste-tiedye.webp", 14, 1000, "webp")
cut("ceinture-cuir.png", "ceinture-cuir.png", 10, 560, "png")
cut("haut-toile-cuir.png", "haut-toile-cuir.png", 10, 560, "png", white_ring=True)
