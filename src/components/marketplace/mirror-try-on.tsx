"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { FaceLandmarker, NormalizedLandmark, PoseLandmarker } from "@mediapipe/tasks-vision";
import type { MirrorKind } from "@/data/mirror-items";
import { getDict, type Locale } from "@/lib/i18n";

type Status = "idle" | "loading" | "live" | "error";
type ErrKey = "errDenied" | "errNoCamera" | "errBusy" | "errHttps" | "errUnsupported" | "errGpu" | "errGeneric";
type Pt = { x: number; y: number };
// Pose 2D de la pièce : ancre (haut-centre du visuel), largeur affichée et rotation.
type Placement = { x: number; y: number; w: number; rot: number };

const WASM = "/mediapipe/wasm";
const MODELS = { face: "/mediapipe/models/face_landmarker.task", pose: "/mediapipe/models/pose_landmarker_lite.task" };

const dist = (a: Pt, b: Pt) => Math.hypot(b.x - a.x, b.y - a.y);
const lerp = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const smooth = (prev: Placement | undefined, next: Placement, a = 0.55): Placement =>
  prev
    ? { x: prev.x + (next.x - prev.x) * a, y: prev.y + (next.y - prev.y) * a, w: prev.w + (next.w - prev.w) * a, rot: prev.rot + (next.rot - prev.rot) * a }
    : next;

// Coordonnées canvas (vidéo en miroir) à partir d'un repère normalisé.
const toCanvas = (l: NormalizedLandmark, w: number, h: number): Pt => ({ x: (1 - l.x) * w, y: l.y * h });

function errorKey(e: unknown): ErrKey {
  const name = (e as { name?: string })?.name;
  if (name === "NotAllowedError" || name === "SecurityError") return "errDenied";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "errNoCamera";
  if (name === "NotReadableError" || name === "AbortError") return "errBusy";
  return "errGeneric";
}

/** Placements des oreilles (2) ou d'une pièce unique à partir des repères du visage. */
function facePlacements(face: Pt[], kind: "earrings" | "necklace"): Placement[] {
  const p = (i: number) => face[i];
  const faceW = dist(p(234), p(454));
  const chin = p(152);
  const top = p(10);
  const faceH = dist(top, chin);
  const roll = Math.atan2(p(454).y - p(234).y, p(454).x - p(234).x);
  const up = { x: (top.x - chin.x) / faceH, y: (top.y - chin.y) / faceH };
  if (kind === "earrings") {
    const w = faceW * 0.2;
    const center = lerp(p(234), p(454), 0.5);
    return [
      [234, 172],
      [454, 397],
    ].map(([ear, jaw]) => {
      const lobe = lerp(p(ear), p(jaw), 0.28);
      const out = { x: lobe.x - center.x, y: lobe.y - center.y };
      const k = (0.03 * faceW) / Math.hypot(out.x, out.y);
      return { x: lobe.x + out.x * k, y: lobe.y + out.y * k, w, rot: roll };
    });
  }
  const w = faceW * 1.3;
  return [{ x: chin.x - up.x * faceH * 0.15, y: chin.y - up.y * faceH * 0.15, w, rot: roll }];
}

const POSE_KINDS: MirrorKind[] = ["top", "jacket", "belt"];

/** Haut / veste : ancrés aux épaules. Ceinture : ancrée à la taille (entre épaules et hanches). */
function bodyPlacement(pose: Pt[], kind: "top" | "jacket" | "belt"): Placement | null {
  const l = pose[11];
  const r = pose[12];
  const sw = dist(l, r);
  const mid = lerp(l, r, 0.5);
  const rot = Math.atan2(r.y - l.y, r.x - l.x);
  const down = { x: -Math.sin(rot), y: Math.cos(rot) };
  if (kind === "belt") {
    if (!pose[23] || !pose[24]) return null;
    const waist = lerp(mid, lerp(pose[23], pose[24], 0.5), 0.72);
    const w = sw * 1.15;
    const off = w * 0.2;
    return { x: waist.x - down.x * off, y: waist.y - down.y * off, w, rot };
  }
  const up = kind === "jacket" ? 0.14 : 0.1;
  return { x: mid.x - down.x * sw * up, y: mid.y - down.y * sw * up, w: sw * (kind === "jacket" ? 2.1 : 1.85), rot };
}

type Props = { locale: Locale; image: string; name: string; kind: MirrorKind };

export function MirrorTryOn({ locale, image, name, kind }: Props) {
  const t = getDict(locale).mirror;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const modelRef = useRef<FaceLandmarker | PoseLandmarker | null>(null);
  const rafRef = useRef(0);
  const runRef = useRef(0); // invalide les démarrages / boucles périmés
  const artRef = useRef<HTMLImageElement | null>(null);
  const smoothRef = useRef<Placement[]>([]);
  const lostRef = useRef(false);
  const titleId = useId();

  const [status, setStatus] = useState<Status>("idle");
  const [err, setErr] = useState<ErrKey | null>(null);
  const [lost, setLost] = useState(false);
  const [capErr, setCapErr] = useState(false);

  const stop = useCallback(() => {
    runRef.current++;
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    modelRef.current?.close();
    modelRef.current = null;
    smoothRef.current = [];
    lostRef.current = false;
    setStatus("idle");
    setLost(false);
  }, []);

  useEffect(() => () => {
    runRef.current++;
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    modelRef.current?.close();
  }, []);

  const draw = useCallback(
    (video: HTMLVideoElement, canvas: HTMLCanvasElement, places: Placement[]) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.save();
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.restore();
      const art = artRef.current;
      if (!art || !art.naturalWidth) return;
      for (const pl of places) {
        const h = (pl.w * art.naturalHeight) / art.naturalWidth;
        ctx.save();
        ctx.translate(pl.x, pl.y);
        ctx.rotate(pl.rot);
        ctx.shadowColor = "rgba(0,0,0,0.35)";
        ctx.shadowBlur = Math.max(2, pl.w * 0.04);
        ctx.shadowOffsetY = pl.w * 0.015;
        ctx.drawImage(art, -pl.w / 2, 0, pl.w, h);
        ctx.restore();
      }
    },
    [],
  );

  async function start() {
    const run = ++runRef.current;
    setErr(null);
    setCapErr(false);
    if (!window.isSecureContext) return fail("errHttps");
    if (!navigator.mediaDevices?.getUserMedia) return fail("errUnsupported");

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    } catch (e) {
      return fail(errorKey(e));
    }
    if (run !== runRef.current) return stream.getTracks().forEach((tr) => tr.stop());
    streamRef.current = stream;
    setStatus("loading");

    const video = videoRef.current!;
    video.srcObject = stream;
    try {
      await video.play();
    } catch {
      return fail("errGeneric");
    }

    // Bibliothèque et modèles : chargés seulement ici, depuis notre propre domaine (aucun CDN).
    let model: FaceLandmarker | PoseLandmarker;
    try {
      const { FilesetResolver, FaceLandmarker: Face, PoseLandmarker: Pose } = await import("@mediapipe/tasks-vision");
      const fileset = await FilesetResolver.forVisionTasks(WASM);
      const make = (delegate: "GPU" | "CPU") =>
        POSE_KINDS.includes(kind)
          ? Pose.createFromOptions(fileset, { baseOptions: { modelAssetPath: MODELS.pose, delegate }, runningMode: "VIDEO", numPoses: 1 })
          : Face.createFromOptions(fileset, { baseOptions: { modelAssetPath: MODELS.face, delegate }, runningMode: "VIDEO", numFaces: 1 });
      try {
        model = await make("GPU");
      } catch {
        model = await make("CPU");
      }
    } catch {
      return fail("errGpu");
    }
    if (run !== runRef.current) return model.close();
    modelRef.current = model;
    setStatus("live");

    let lastTime = -1;
    const loop = () => {
      if (run !== runRef.current) return;
      const canvas = canvasRef.current;
      if (canvas && video.readyState >= 2 && video.videoWidth > 0) {
        if (canvas.width !== video.videoWidth) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }
        if (video.currentTime !== lastTime) {
          lastTime = video.currentTime;
          const { width: w, height: h } = canvas;
          let raw: Placement[] = [];
          try {
            if (kind === "top" || kind === "jacket" || kind === "belt") {
              const res = (model as PoseLandmarker).detectForVideo(video, performance.now());
              const lm = res.landmarks[0];
              if (lm && lm[11] && lm[12]) {
                const pl = bodyPlacement(lm.map((l) => toCanvas(l, w, h)), kind);
                if (pl) raw = [pl];
              }
            } else {
              const res = (model as FaceLandmarker).detectForVideo(video, performance.now());
              const lm = res.faceLandmarks[0];
              if (lm) raw = facePlacements(lm.map((l) => toCanvas(l, w, h)), kind);
            }
          } catch {
            raw = [];
          }
          smoothRef.current = raw.map((pl, i) => smooth(smoothRef.current[i], pl));
          const isLost = raw.length === 0;
          if (isLost !== lostRef.current) {
            lostRef.current = isLost;
            setLost(isLost);
          }
        }
        draw(video, canvas, lostRef.current ? [] : smoothRef.current);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    function fail(key: ErrKey) {
      stop();
      setErr(key);
      setStatus("error");
    }
  }

  function capture() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setCapErr(false);
    canvas.toBlob((blob) => {
      if (!blob) return setCapErr(true);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "miroir-epomta.png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }, "image/png");
  }

  const intro =
    kind === "earrings" ? t.introEarrings : kind === "necklace" ? t.introNecklace : kind === "belt" ? t.introBelt : kind === "jacket" ? t.introJacket : t.introTop;
  const busy = status === "loading";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-accent px-4 text-sm font-medium text-primary hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span aria-hidden="true">🪞</span>
        {t.open}
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClose={() => {
          stop();
          triggerRef.current?.focus();
        }}
        className="m-auto max-h-[96vh] w-[min(96vw,48rem)] overflow-auto rounded-lg border border-accent bg-background p-4 text-foreground backdrop:bg-black/60 md:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="font-heading text-2xl text-primary">
            {t.title} — {name}
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
          <p className="text-sm text-muted-foreground">{intro}</p>

          {/* Visuel de la pièce, chargé en même origine pour pouvoir être dessiné puis exporté. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img ref={artRef} src={image} alt="" className="hidden" />
          <video ref={videoRef} playsInline muted className="pointer-events-none absolute size-px opacity-0" aria-hidden="true" />

          <div className={`relative overflow-hidden rounded-md border bg-muted ${status === "live" ? "" : "hidden"}`}>
            <canvas ref={canvasRef} role="img" aria-label={t.videoLabel} className="mx-auto block h-auto max-h-[68vh] w-full object-contain" />
            {lost && status === "live" && (
              <p role="status" className="absolute inset-x-2 bottom-2 rounded-md bg-background/90 px-3 py-2 text-center text-sm">
                {kind === "earrings" || kind === "necklace" ? t.lostFace : t.lostBody}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {status !== "live" ? (
              <button
                type="button"
                onClick={start}
                disabled={busy}
                className="min-h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
              >
                {busy ? t.loading : t.start}
              </button>
            ) : (
              <>
                <button type="button" onClick={capture} className="min-h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                  {t.capture}
                </button>
                <button type="button" onClick={stop} className="min-h-11 rounded-md border px-4 text-sm focus-visible:outline-2 focus-visible:outline-primary">
                  {t.stop}
                </button>
                <span className="text-xs text-muted-foreground" aria-live="polite">
                  {t.live}
                </span>
              </>
            )}
          </div>

          {err && (
            <p role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {t[err]}
            </p>
          )}
          {capErr && (
            <p role="alert" className="text-sm text-destructive">
              {t.captureFail}
            </p>
          )}
          <p className="text-xs text-muted-foreground">{t.privacy}</p>
        </div>
      </dialog>
    </>
  );
}
