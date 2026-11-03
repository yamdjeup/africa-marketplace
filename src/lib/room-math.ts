export type Pt = { x: number; y: number };
export type Quad = [Pt, Pt, Pt, Pt]; // haut-gauche, haut-droit, bas-droit, bas-gauche

/** Homographie (3x3, h33 = 1) envoyant le rectangle (0,0)-(w,h) sur le quadrilatère `q`. */
export function homography(w: number, h: number, q: Quad): number[] | null {
  const src: Pt[] = [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h },
    { x: 0, y: h },
  ];
  const A: number[][] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i];
    const { x: u, y: v } = q[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  }
  for (let c = 0; c < 8; c++) {
    let p = c;
    for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    if (Math.abs(A[p][c]) < 1e-9) return null;
    [A[c], A[p]] = [A[p], A[c]];
    for (let r = 0; r < 8; r++) {
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      for (let k = c; k < 9; k++) A[r][k] -= f * A[c][k];
    }
  }
  const s = A.map((row, i) => row[8] / row[i]);
  return s.every(Number.isFinite) ? [...s, 1] : null;
}

export function applyH(H: number[], x: number, y: number): Pt {
  const d = H[6] * x + H[7] * y + H[8];
  return { x: (H[0] * x + H[1] * y + H[2]) / d, y: (H[3] * x + H[4] * y + H[5]) / d };
}

/** Valeur CSS matrix3d équivalente (transform-origin: 0 0). */
export function toMatrix3d(H: number[]): string {
  const [a, b, c, d, e, f, g, h] = H;
  return `matrix3d(${a},${d},0,${g},${b},${e},0,${h},0,0,1,0,${c},${f},0,1)`;
}

function drawTriangle(ctx: CanvasRenderingContext2D, img: CanvasImageSource, s: Pt[], d: Pt[]) {
  const [s0, s1, s2] = s;
  const [d0, d1, d2] = d;
  const den = (s1.x - s0.x) * (s2.y - s0.y) - (s2.x - s0.x) * (s1.y - s0.y);
  if (!den) return;
  const a = ((d1.x - d0.x) * (s2.y - s0.y) - (d2.x - d0.x) * (s1.y - s0.y)) / den;
  const b = ((d1.y - d0.y) * (s2.y - s0.y) - (d2.y - d0.y) * (s1.y - s0.y)) / den;
  const c = ((d2.x - d0.x) * (s1.x - s0.x) - (d1.x - d0.x) * (s2.x - s0.x)) / den;
  const dd = ((d2.y - d0.y) * (s1.x - s0.x) - (d1.y - d0.y) * (s2.x - s0.x)) / den;
  const e = d0.x - a * s0.x - c * s0.y;
  const f = d0.y - b * s0.x - dd * s0.y;
  const cx = (d0.x + d1.x + d2.x) / 3;
  const cy = (d0.y + d1.y + d2.y) / 3;
  const grow = (p: Pt) => {
    const dx = p.x - cx;
    const dy = p.y - cy;
    const n = Math.hypot(dx, dy) || 1;
    return { x: p.x + (dx / n) * 2.5, y: p.y + (dy / n) * 2.5 };
  };
  ctx.save();
  ctx.beginPath();
  [d0, d1, d2].map(grow).forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();
  ctx.setTransform(a, b, c, dd, e, f);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}

/** Dessine `img` déformée en perspective dans `q`, avec ombre portée et liseré (rendu canvas, sans dépendance). */
export function drawPerspective(ctx: CanvasRenderingContext2D, img: HTMLImageElement, q: Quad, shadowPx: number) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const H = homography(iw, ih, q);
  if (!H) return false;
  const path = () => {
    ctx.beginPath();
    q.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
  };
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.38)";
  ctx.shadowBlur = shadowPx;
  ctx.shadowOffsetY = shadowPx * 0.4;
  ctx.fillStyle = "#fff";
  path();
  ctx.fill();
  ctx.restore();
  const N = 16;
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const sx0 = (iw * i) / N;
      const sx1 = (iw * (i + 1)) / N;
      const sy0 = (ih * j) / N;
      const sy1 = (ih * (j + 1)) / N;
      const s = [
        { x: sx0, y: sy0 },
        { x: sx1, y: sy0 },
        { x: sx1, y: sy1 },
        { x: sx0, y: sy1 },
      ];
      const d = s.map((p) => applyH(H, p.x, p.y));
      drawTriangle(ctx, img, [s[0], s[1], s[2]], [d[0], d[1], d[2]]);
      drawTriangle(ctx, img, [s[0], s[2], s[3]], [d[0], d[2], d[3]]);
    }
  }
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = Math.max(1.5, shadowPx / 6);
  path();
  ctx.stroke();
  ctx.restore();
  return true;
}
