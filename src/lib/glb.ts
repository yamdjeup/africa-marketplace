type Part = { pos: number[]; nrm: number[]; uv?: number[]; idx: number[] };

function box(w: number, h: number, d: number): Part {
  const half = [w / 2, h / 2, d / 2];
  const X = [1, 0, 0];
  const Y = [0, 1, 0];
  const Z = [0, 0, 1];
  const neg = (v: number[]) => v.map((a) => -a);
  // [normale, axe u, axe v] avec u × v = normale (faces orientées vers l'extérieur)
  const faces: [number[], number[], number[]][] = [
    [Z, X, Y],
    [neg(Z), Y, X],
    [X, Y, Z],
    [neg(X), Z, Y],
    [Y, Z, X],
    [neg(Y), X, Z],
  ];
  const pos: number[] = [];
  const nrm: number[] = [];
  const idx: number[] = [];
  const ext = (axis: number[]) => Math.abs(axis[0]) * half[0] + Math.abs(axis[1]) * half[1] + Math.abs(axis[2]) * half[2];
  faces.forEach(([n, u, v], f) => {
    for (const [su, sv] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]) {
      for (let k = 0; k < 3; k++) pos.push(n[k] * ext(n) + u[k] * su * ext(u) + v[k] * sv * ext(v));
      nrm.push(...n);
    }
    const o = f * 4;
    idx.push(o, o + 1, o + 2, o, o + 2, o + 3);
  });
  return { pos, nrm, idx };
}

/**
 * Construit un GLB (en mètres) : cadre en bois (plaque) + plan de l'œuvre texturé, à l'échelle réelle.
 * Le dos du cadre est en z=0 (à poser contre le mur), la face avant regarde +Z.
 */
export function buildArtworkGlb(png: Uint8Array, widthCm: number, heightCm: number): Blob {
  const w = widthCm / 100;
  const h = heightCm / 100;
  const border = 0.015;
  const depth = 0.03;
  const slab = box(w + border * 2, h + border * 2, depth);
  for (let i = 2; i < slab.pos.length; i += 3) slab.pos[i] += depth / 2;
  const z = depth + 0.0005;
  const art: Part = {
    pos: [-w / 2, -h / 2, z, w / 2, -h / 2, z, w / 2, h / 2, z, -w / 2, h / 2, z],
    nrm: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
    uv: [0, 1, 1, 1, 1, 0, 0, 0],
    idx: [0, 1, 2, 0, 2, 3],
  };

  const chunks: Uint8Array[] = [];
  let offset = 0;
  const views: { buffer: 0; byteOffset: number; byteLength: number; target?: number }[] = [];
  const addView = (bytes: Uint8Array, target?: number) => {
    const pad = (4 - (bytes.byteLength % 4)) % 4;
    const padded = new Uint8Array(bytes.byteLength + pad);
    padded.set(bytes);
    chunks.push(padded);
    views.push({ buffer: 0, byteOffset: offset, byteLength: bytes.byteLength, ...(target ? { target } : {}) });
    offset += padded.byteLength;
    return views.length - 1;
  };
  const f32 = (a: number[]) => new Uint8Array(new Float32Array(a).buffer);
  const u16 = (a: number[]) => new Uint8Array(new Uint16Array(a).buffer);

  const accessors: object[] = [];
  const acc = (view: number, componentType: number, count: number, type: string, extra: object = {}) => {
    accessors.push({ bufferView: view, componentType, count, type, ...extra });
    return accessors.length - 1;
  };
  const bounds = (p: number[]) => {
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < p.length; i += 3)
      for (let k = 0; k < 3; k++) {
        min[k] = Math.min(min[k], p[i + k]);
        max[k] = Math.max(max[k], p[i + k]);
      }
    return { min, max };
  };
  const prim = (part: Part, material: number) => {
    const attributes: Record<string, number> = {
      POSITION: acc(addView(f32(part.pos), 34962), 5126, part.pos.length / 3, "VEC3", bounds(part.pos)),
      NORMAL: acc(addView(f32(part.nrm), 34962), 5126, part.nrm.length / 3, "VEC3"),
    };
    if (part.uv) attributes.TEXCOORD_0 = acc(addView(f32(part.uv), 34962), 5126, part.uv.length / 2, "VEC2");
    const indices = acc(addView(u16(part.idx), 34963), 5123, part.idx.length, "SCALAR");
    return { attributes, indices, material, mode: 4 };
  };
  const primitives = [prim(slab, 1), prim(art, 0)];
  const imageView = addView(png);

  const json = {
    asset: { version: "2.0", generator: "e-pom-ta" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: "oeuvre" }],
    meshes: [{ primitives }],
    materials: [
      { pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicFactor: 0, roughnessFactor: 0.85 } },
      { pbrMetallicRoughness: { baseColorFactor: [0.22, 0.15, 0.09, 1], metallicFactor: 0, roughnessFactor: 0.7 } },
    ],
    textures: [{ source: 0, sampler: 0 }],
    samplers: [{ magFilter: 9729, minFilter: 9729, wrapS: 33071, wrapT: 33071 }],
    images: [{ bufferView: imageView, mimeType: "image/png" }],
    accessors,
    bufferViews: views,
    buffers: [{ byteLength: offset }],
  };

  const enc = new TextEncoder().encode(JSON.stringify(json));
  const jsonPad = (4 - (enc.byteLength % 4)) % 4;
  const jsonBytes = new Uint8Array(enc.byteLength + jsonPad).fill(0x20);
  jsonBytes.set(enc);
  const bin = new Uint8Array(offset);
  let o = 0;
  for (const c of chunks) {
    bin.set(c, o);
    o += c.byteLength;
  }
  const total = 12 + 8 + jsonBytes.byteLength + 8 + bin.byteLength;
  const out = new ArrayBuffer(total);
  const dv = new DataView(out);
  dv.setUint32(0, 0x46546c67, true);
  dv.setUint32(4, 2, true);
  dv.setUint32(8, total, true);
  dv.setUint32(12, jsonBytes.byteLength, true);
  dv.setUint32(16, 0x4e4f534a, true);
  new Uint8Array(out, 20, jsonBytes.byteLength).set(jsonBytes);
  const b0 = 20 + jsonBytes.byteLength;
  dv.setUint32(b0, bin.byteLength, true);
  dv.setUint32(b0 + 4, 0x004e4942, true);
  new Uint8Array(out, b0 + 8, bin.byteLength).set(bin);
  return new Blob([out], { type: "model/gltf-binary" });
}
