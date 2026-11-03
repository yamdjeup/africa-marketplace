"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ArViewer } from "@/components/marketplace/ar-viewer";
import { getDict, type Locale } from "@/lib/i18n";
import { drawPerspective, homography, toMatrix3d, type Pt, type Quad } from "@/lib/room-math";

type Art = { cx: number; cy: number; wcm: number };
type Cors = "pending" | "ok" | "fail";
type Tab = "photo" | "perspective" | "ar";

type Props = { locale: Locale; image: string; name: string; widthCm: number; heightCm: number; flat: boolean };

export function RoomPreview({ locale, image, name, widthCm, heightCm, flat }: Props) {
  const t = getDict(locale).room;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLImageElement>(null);
  const artRef = useRef<HTMLImageElement | null>(null);
  const lengthId = useId();
  const fileId = useId();

  const [photo, setPhoto] = useState<string | null>(null);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [k, setK] = useState(1); // pixels affichés par pixel naturel
  const [seg, setSeg] = useState<{ a: Pt; b: Pt } | null>(null);
  const [realCm, setRealCm] = useState("");
  const [artState, setArt] = useState<Art | null>(null);
  const [cors, setCors] = useState<Cors>("pending");
  const [dlError, setDlError] = useState(false);
  const [tab, setTab] = useState<Tab>("photo");
  const [quadState, setQuad] = useState<Quad | null>(null);
  const drag = useRef<
    | { kind: "seg"; a: Pt }
    | { kind: "move"; dx: number; dy: number }
    | { kind: "resize"; left: number; top: number }
    | { kind: "corner"; i: number }
    | { kind: "quad"; last: Pt }
    | null
  >(null);

  const ratio = heightCm / widthCm;
  const cm = parseFloat(realCm.replace(",", "."));
  const segLen = seg ? Math.hypot(seg.b.x - seg.a.x, seg.b.y - seg.a.y) : 0;
  const scale = seg && segLen > 5 && cm > 0 ? segLen / cm : null; // px naturels par cm

  useEffect(() => {
    return () => {
      if (photo) URL.revokeObjectURL(photo);
    };
  }, [photo]);

  // Test CORS de l'image de l'œuvre : sans, le téléchargement de l'aperçu est masqué.
  useEffect(() => {
    let alive = true;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (!alive) return;
      artRef.current = img;
      setCors("ok");
    };
    img.onerror = () => alive && setCors("fail");
    img.src = image;
    return () => {
      alive = false;
    };
  }, [image]);

  useEffect(() => {
    const el = boxRef.current;
    if (!el || !nat) return;
    const update = () => setK(el.clientWidth / nat.w);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [nat, photo]);

  const open = () => dialogRef.current?.showModal();

  const onFile = (f: File | undefined) => {
    if (!f) return;
    setPhoto(URL.createObjectURL(f));
    setNat(null);
    setSeg(null);
    setArt(null);
    setQuad(null);
    setRealCm("");
    setDlError(false);
  };

  const toNat = useCallback(
    (e: React.PointerEvent): Pt => {
      const r = boxRef.current!.getBoundingClientRect();
      return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k };
    },
    [k],
  );

  // Par défaut l'œuvre est centrée, à sa taille réelle en cm ; la taille est ensuite conservée en cm.
  const art: Art | null = scale && nat ? (artState ?? { cx: nat.w / 2, cy: nat.h / 2, wcm: widthCm }) : null;
  const artW = art && scale ? art.wcm * scale : 0;
  const artH = artW * ratio;
  const quad: Quad | null =
    quadState ??
    (art
      ? [
          { x: art.cx - artW / 2, y: art.cy - artH / 2 },
          { x: art.cx + artW / 2, y: art.cy - artH / 2 },
          { x: art.cx + artW / 2, y: art.cy + artH / 2 },
          { x: art.cx - artW / 2, y: art.cy + artH / 2 },
        ]
      : null);
  // Élément de référence 1000 × (1000·ratio) envoyé sur le quadrilatère par matrix3d.
  const REF_W = 1000;
  const REF_H = REF_W * ratio;
  const H = quad ? homography(REF_W, REF_H, quad) : null;

  const onBgDown = (e: React.PointerEvent) => {
    if (tab !== "photo") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = toNat(e);
    drag.current = { kind: "seg", a: p };
    setSeg({ a: p, b: p });
  };
  const onCornerDown = (i: number) => (e: React.PointerEvent) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { kind: "corner", i };
  };
  const onQuadDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { kind: "quad", last: toNat(e) };
  };
  const onArtDown = (e: React.PointerEvent) => {
    if (!art) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = toNat(e);
    drag.current = { kind: "move", dx: p.x - art.cx, dy: p.y - art.cy };
  };
  const onHandleDown = (e: React.PointerEvent) => {
    if (!art) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { kind: "resize", left: art.cx - artW / 2, top: art.cy - artH / 2 };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || !nat) return;
    const p = toNat(e);
    if (d.kind === "seg") setSeg({ a: d.a, b: p });
    else if (d.kind === "corner" && quad) {
      const nq = [...quad] as Quad;
      nq[d.i] = p;
      setQuad(nq);
    } else if (d.kind === "quad" && quad) {
      const dx = p.x - d.last.x;
      const dy = p.y - d.last.y;
      d.last = p;
      setQuad(quad.map((q) => ({ x: q.x + dx, y: q.y + dy })) as Quad);
    } else if (d.kind === "move") setArt(art ? { ...art, cx: p.x - d.dx, cy: p.y - d.dy } : null);
    else if (d.kind === "resize" && scale && art) {
      const w = Math.max(20, p.x - d.left);
      setArt({ cx: d.left + w / 2, cy: d.top + (w * ratio) / 2, wcm: w / scale });
    }
  };
  const onUp = () => {
    drag.current = null;
  };

  const download = () => {
    const ph = photoRef.current;
    const ai = artRef.current;
    if (!ph || !nat || !art || !scale || !ai) return;
    try {
      const c = document.createElement("canvas");
      c.width = nat.w;
      c.height = nat.h;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(ph, 0, 0, nat.w, nat.h);
      const x = art.cx - artW / 2;
      const y = art.cy - artH / 2;
      if (tab === "perspective" && quad) {
        if (!drawPerspective(ctx, ai, quad, Math.max(6, artW * 0.03))) return setDlError(true);
      } else {
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.35)";
        ctx.shadowBlur = Math.max(6, artW * 0.03);
        ctx.shadowOffsetY = Math.max(3, artW * 0.015);
        ctx.fillStyle = "#fff";
        ctx.fillRect(x, y, artW, artH);
        ctx.restore();
        ctx.drawImage(ai, x, y, artW, artH);
      }
      c.toBlob((b) => {
        if (!b) return setDlError(true);
        const url = URL.createObjectURL(b);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${name.replace(/[^\p{L}\p{N}]+/gu, "-")}-apercu.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }, "image/png");
    } catch {
      setDlError(true);
    }
  };

  const canDownload = cors === "ok" && !dlError && !!art;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={open}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-accent px-4 text-sm font-medium text-primary hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span aria-hidden="true">🖼</span>
        {t.open}
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={`${lengthId}-title`}
        onClose={() => triggerRef.current?.focus()}
        className="m-auto max-h-[96vh] w-[min(96vw,56rem)] overflow-auto rounded-lg border border-accent bg-background p-4 text-foreground backdrop:bg-black/60 md:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id={`${lengthId}-title`} className="font-heading text-2xl text-primary">
            {t.title}
          </h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="min-h-11 rounded-md border px-3 text-sm focus-visible:outline-2 focus-visible:outline-primary"
          >
            {t.close}
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {flat ? (
            <div role="tablist" aria-label={t.tabsLabel} className="flex flex-wrap gap-2">
              {(
                [
                  ["photo", t.tabPhoto],
                  ["perspective", t.tabPerspective],
                  ["ar", t.tabAr],
                ] as [Tab, string][]
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={`min-h-11 rounded-md border px-4 text-sm focus-visible:outline-2 focus-visible:outline-primary ${
                    tab === id ? "border-primary bg-primary text-primary-foreground" : "bg-card"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{t.soon3d}</p>
          )}
          {tab === "ar" && flat && (
            <ArViewer locale={locale} image={image} name={name} widthCm={widthCm} heightCm={heightCm} />
          )}
          <div className={tab === "ar" && flat ? "hidden" : "space-y-4"}>
          <div className="space-y-2">
            <label htmlFor={fileId} className="block text-sm font-medium">
              {t.step1}
            </label>
            <input
              id={fileId}
              type="file"
              accept="image/*"
              onChange={(e) => onFile(e.target.files?.[0])}
              className="block w-full text-sm file:mr-3 file:min-h-11 file:rounded-md file:border file:bg-card file:px-3"
            />
          </div>

          {photo && (
            <>
              <p className="text-sm text-muted-foreground">{t.step2}</p>
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <label htmlFor={lengthId} className="block text-sm font-medium">
                    {t.realLength}
                  </label>
                  <input
                    id={lengthId}
                    type="number"
                    inputMode="decimal"
                    min={1}
                    value={realCm}
                    onChange={(e) => setRealCm(e.target.value)}
                    className="min-h-11 w-40 rounded-md border bg-card px-3"
                  />
                </div>
                {seg && (
                  <button
                    type="button"
                    onClick={() => {
                      setSeg(null);
                      setArt(null);
                      setQuad(null);
                    }}
                    className="min-h-11 rounded-md border px-3 text-sm"
                  >
                    {t.redraw}
                  </button>
                )}
                {tab === "perspective" && quadState && (
                  <button type="button" onClick={() => setQuad(null)} className="min-h-11 rounded-md border px-3 text-sm">
                    {t.perspReset}
                  </button>
                )}
              </div>
              <p className="text-sm" aria-live="polite">
                {tab === "perspective"
                  ? scale
                    ? t.perspHelp
                    : t.perspNeedScale
                  : scale
                    ? `${t.calibrated(scale.toFixed(2))} — ${t.step3}`
                    : t.notCalibrated}
              </p>

              <div
                ref={boxRef}
                role="img"
                aria-label={t.canvasLabel}
                className="relative w-full touch-none select-none overflow-hidden rounded-md bg-muted"
                style={{ touchAction: "none" }}
                onPointerDown={onBgDown}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={onUp}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={photoRef}
                  src={photo}
                  alt=""
                  draggable={false}
                  onLoad={(e) => setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
                  className="block h-auto w-full"
                />
                {nat && seg && tab === "photo" && (
                  <svg className="pointer-events-none absolute inset-0 size-full" viewBox={`0 0 ${nat.w} ${nat.h}`}>
                    <line
                      x1={seg.a.x}
                      y1={seg.a.y}
                      x2={seg.b.x}
                      y2={seg.b.y}
                      stroke="#fff"
                      strokeWidth={5 / k}
                    />
                    <line
                      x1={seg.a.x}
                      y1={seg.a.y}
                      x2={seg.b.x}
                      y2={seg.b.y}
                      stroke="#c2410c"
                      strokeWidth={2.5 / k}
                      strokeDasharray={`${8 / k} ${5 / k}`}
                    />
                  </svg>
                )}
                {tab === "perspective" && quad && H && nat && cors !== "pending" && (
                  <>
                    <div
                      className="pointer-events-none absolute left-0 top-0"
                      style={{ width: nat.w, height: nat.h, transform: `scale(${k})`, transformOrigin: "0 0" }}
                    >
                      <div
                        onPointerDown={onQuadDown}
                        onPointerMove={onMove}
                        onPointerUp={onUp}
                        onPointerCancel={onUp}
                        role="group"
                        aria-label={t.artwork}
                        className="pointer-events-auto absolute left-0 top-0 cursor-move bg-white"
                        style={{
                          width: REF_W,
                          height: REF_H,
                          transformOrigin: "0 0",
                          transform: toMatrix3d(H),
                          touchAction: "none",
                          boxShadow: `0 ${nat.w * 0.012}px ${nat.w * 0.03}px rgba(0,0,0,0.4), 0 0 0 ${nat.w * 0.0015}px rgba(255,255,255,0.85)`,
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={image}
                          alt={name}
                          crossOrigin={cors === "ok" ? "anonymous" : undefined}
                          draggable={false}
                          className="pointer-events-none block size-full object-fill"
                        />
                      </div>
                    </div>
                    {quad.map((q, i) => (
                      <div
                        key={i}
                        onPointerDown={onCornerDown(i)}
                        onPointerMove={onMove}
                        onPointerUp={onUp}
                        onPointerCancel={onUp}
                        role="presentation"
                        title={t.corner(i + 1)}
                        className="absolute size-7 -translate-x-1/2 -translate-y-1/2 cursor-move rounded-full border-2 border-white bg-primary shadow"
                        style={{ left: q.x * k, top: q.y * k, touchAction: "none" }}
                      />
                    ))}
                  </>
                )}
                {tab === "photo" && art && scale && nat && cors !== "pending" && (
                  <div
                    onPointerDown={onArtDown}
                    onPointerMove={onMove}
                    onPointerUp={onUp}
                    onPointerCancel={onUp}
                    role="group"
                    aria-label={t.artwork}
                    className="absolute cursor-move shadow-[0_6px_18px_rgba(0,0,0,0.35)] outline outline-1 outline-white/70"
                    style={{
                      left: (art.cx - artW / 2) * k,
                      top: (art.cy - artH / 2) * k,
                      width: artW * k,
                      height: artH * k,
                      touchAction: "none",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image}
                      alt={name}
                      crossOrigin={cors === "ok" ? "anonymous" : undefined}
                      draggable={false}
                      className="pointer-events-none block size-full object-fill"
                    />
                    <div
                      onPointerDown={onHandleDown}
                      onPointerMove={onMove}
                      onPointerUp={onUp}
                      onPointerCancel={onUp}
                      role="presentation"
                      aria-label={t.resize}
                      title={t.resize}
                      className="absolute -bottom-3 -right-3 size-7 cursor-nwse-resize rounded-full border-2 border-white bg-primary shadow"
                      style={{ touchAction: "none" }}
                    />
                    <span className="pointer-events-none absolute left-0 top-full mt-1 whitespace-nowrap rounded bg-black/70 px-1.5 text-xs text-white">
                      {t.dims(Math.round(art.wcm), Math.round(art.wcm * ratio))}
                    </span>
                  </div>
                )}
              </div>

              {canDownload && (
                <button
                  type="button"
                  onClick={download}
                  className="min-h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  {t.download}
                </button>
              )}
            </>
          )}
          </div>
          <p className="text-xs text-muted-foreground">{t.privacy}</p>
        </div>
      </dialog>
    </>
  );
}
