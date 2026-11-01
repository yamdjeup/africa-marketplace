"""Génère des placeholders SVG locaux (couleurs du thème docs/DESIGN.md).

Usage : python scripts/generate-placeholders.py
Lit les slugs dans src/data/*.ts ; sortie dans public/images/{creators,products}.
Aucune image externe ni photo de personne : formes géométriques uniquement.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BG, FG, PRIMARY, ACCENT, TERRA, KENTE, MUTED = (
    "#faf5ea", "#2b2118", "#2a2a6b", "#e0a93b", "#b5573a", "#2e7d52", "#efe7d5",
)
PALETTE = [PRIMARY, ACCENT, TERRA, KENTE]
CATEGORY_BASE = {
    "couture": PRIMARY, "bijoux": ACCENT, "sculpture": TERRA,
    "peinture": KENTE, "textile": TERRA, "decoration": PRIMARY,
}


def seed(text):
    return sum(ord(c) * (i + 1) for i, c in enumerate(text))


def svg(slug, label, base, variant, w=800, h=1000):
    n = seed(slug) + variant * 7
    colors = [base] + [PALETTE[(n + i) % 4] for i in range(1, 4)]
    shapes = []
    for i in range(6):
        c = colors[i % 4]
        x = (n * (i + 3) * 37) % w
        y = (n * (i + 5) * 53) % (h - 200)
        r = 80 + (n * (i + 2)) % 140
        if (i + variant) % 3 == 0:
            shapes.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{c}" opacity="0.28"/>')
        elif (i + variant) % 3 == 1:
            shapes.append(f'<rect x="{x - r}" y="{y - r}" width="{r * 2}" height="{r * 2}" fill="{c}" opacity="0.24" transform="rotate({(n * i) % 45} {x} {y})"/>')
        else:
            shapes.append(f'<polygon points="{x},{y - r} {x + r},{y + r} {x - r},{y + r}" fill="{c}" opacity="0.26"/>')
    band = "".join(
        f'<rect x="{i * (w // 8)}" y="{h - 56}" width="{w // 8}" height="16" fill="{PALETTE[i % 4]}"/>' for i in range(8)
    )
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" role="img" aria-label="{label}">'
        f'<rect width="{w}" height="{h}" fill="{BG}"/>'
        f'<rect width="{w}" height="{h - 80}" fill="{MUTED}" opacity="0.6"/>'
        + "".join(shapes)
        + f'<rect x="40" y="40" width="{w - 80}" height="{h - 160}" fill="none" stroke="{FG}" stroke-opacity="0.25" stroke-width="2"/>'
        + band + "</svg>\n"
    )


def main():
    products = (ROOT / "src/data/products.ts").read_text(encoding="utf-8")
    creators = (ROOT / "src/data/creators.ts").read_text(encoding="utf-8")
    cat_by_slug = dict(re.findall(r'slug: "([a-z0-9-]+)",\n    name: \[.*?category: "(\w+)"', products, re.S))
    out_p = ROOT / "public/images/products"
    out_c = ROOT / "public/images/creators"
    out_p.mkdir(parents=True, exist_ok=True)
    out_c.mkdir(parents=True, exist_ok=True)
    for slug, cat in cat_by_slug.items():
        for v in (1, 2):
            (out_p / f"{slug}-{v}.svg").write_text(svg(slug, f"Visuel {slug}", CATEGORY_BASE[cat], v), encoding="utf-8")
    for slug in re.findall(r'^    slug: "([a-z0-9-]+)"', creators, re.M):
        (out_c / f"{slug}.svg").write_text(svg(slug, f"Atelier {slug}", PRIMARY, 0, 800, 800), encoding="utf-8")
    print(len(cat_by_slug), "produits,", len(re.findall(r'^    slug:', creators, re.M)), "créateurs")


main()
