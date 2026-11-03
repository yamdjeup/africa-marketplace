"use client";

import { useEffect, useRef, useState } from "react";
import { buildArtworkGlb } from "@/lib/glb";
import { getDict, type Locale } from "@/lib/i18n";

type Props = { locale: Locale; image: string; name: string; widthCm: number; heightCm: number };
type Status = "preparing" | "no-texture" | "ready" | "no-ar";
type ARElement = HTMLElement & { canActivateAR?: boolean; activateAR?: () => Promise<void> };

const MAX_TEX = 1024;

/** Génère le GLB dans le navigateur (aucun envoi réseau) puis charge <model-viewer> à la demande. */
export function ArViewer({ locale, image, name, widthCm, heightCm }: Props) {
  const t = getDict(locale).room;
  const [status, setStatus] = useState<Status>("preparing");
  const [glbUrl, setGlbUrl] = useState<string | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<ARElement | null>(null);

  useEffect(() => {
    let alive = true;
    let url: string | null = null;
    (async () => {
      try {
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        await new Promise<void>((res, rej) => {
          img.onload = () => res();
          img.onerror = () => rej(new Error("cors"));
          img.src = image;
        });
        const r = Math.min(1, MAX_TEX / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement("canvas");
        c.width = Math.round(img.naturalWidth * r);
        c.height = Math.round(img.naturalHeight * r);
        c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
        const blob = await new Promise<Blob | null>((res) => c.toBlob(res, "image/png"));
        if (!blob) throw new Error("png");
        const glb = buildArtworkGlb(new Uint8Array(await blob.arrayBuffer()), widthCm, heightCm);
        await import("@google/model-viewer");
        if (!alive) return;
        url = URL.createObjectURL(glb);
        setGlbUrl(url);
      } catch {
        if (alive) setStatus("no-texture");
      }
    })();
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [image, widthCm, heightCm]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !glbUrl) return;
    const el = document.createElement("model-viewer") as ARElement;
    el.setAttribute("src", glbUrl);
    el.setAttribute("alt", name);
    el.setAttribute("ar", "");
    el.setAttribute("ar-modes", "webxr scene-viewer quick-look");
    el.setAttribute("ar-placement", "wall");
    el.setAttribute("ar-scale", "fixed");
    el.setAttribute("camera-controls", "");
    el.setAttribute("touch-action", "pan-y");
    el.setAttribute("shadow-intensity", "0.6");
    el.setAttribute("camera-orbit", "-20deg 80deg auto");
    el.style.width = "100%";
    el.style.height = "100%";
    const check = () => setStatus(el.canActivateAR ? "ready" : "no-ar");
    el.addEventListener("load", check);
    el.addEventListener("error", () => setStatus("no-texture"));
    host.appendChild(el);
    viewerRef.current = el;
    return () => {
      el.removeEventListener("load", check);
      el.remove();
      viewerRef.current = null;
    };
  }, [glbUrl, name]);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t.arHelp}</p>
      {status === "preparing" && <p className="text-sm">{t.arPreparing}</p>}
      {status === "no-texture" && (
        <p role="status" className="rounded-md border border-destructive/40 px-3 py-2 text-sm">
          {t.arCors}
        </p>
      )}
      <div
        ref={hostRef}
        className={`h-72 w-full overflow-hidden rounded-md bg-muted md:h-96 ${glbUrl ? "" : "hidden"}`}
        aria-label={t.arModel}
      />
      {status === "ready" && (
        <button
          type="button"
          onClick={() => viewerRef.current?.activateAR?.()}
          className="min-h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {t.arButton}
        </button>
      )}
      {status === "no-ar" && (
        <p role="status" className="rounded-md border px-3 py-2 text-sm">
          {t.arUnsupported}
        </p>
      )}
    </div>
  );
}
