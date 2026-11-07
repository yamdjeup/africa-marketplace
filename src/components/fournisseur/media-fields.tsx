"use client";

import { useRef, useState } from "react";

const MAX_BYTES = 280 * 1024; // le serveur refuse au-delà de 300 Ko

async function compress(file: File, maxSide: number): Promise<File> {
  const bmp = await createImageBitmap(file);
  let scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  let quality = 0.86;
  for (let i = 0; i < 12; i++) {
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(bmp.width * scale));
    c.height = Math.max(1, Math.round(bmp.height * scale));
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    const blob: Blob | null = await new Promise((r) => c.toBlob(r, "image/jpeg", quality));
    if (blob && blob.size <= MAX_BYTES) return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
    if (quality > 0.5) quality -= 0.12;
    else scale *= 0.8;
  }
  throw new Error("size");
}

async function upload(file: File, kind: "photo" | "signature") {
  const form = new FormData();
  form.append("file", file);
  form.append("kind", kind);
  const res = await fetch("/api/partner/media", { method: "POST", body: form });
  if (!res.ok) throw new Error(String(res.status));
  return (await res.json()) as { id: string; url: string };
}

type Props = { name: string; initial: string[]; max: number; kind?: "photo" | "signature"; fr: boolean; label: string; hint?: string; extra?: React.ReactNode; strictSize?: boolean };

export function PhotoUploader({ name, initial, max, kind = "photo", fr, label, hint, extra, strictSize }: Props) {
  const [urls, setUrls] = useState<string[]>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);

  async function addFiles(list: File[]) {
    setError("");
    setBusy(true);
    const next = [...urls];
    for (const raw of list) {
      if (next.length >= max) {
        setError(fr ? `Maximum ${max} fichier(s).` : `Maximum ${max} file(s).`);
        break;
      }
      if (!/^image\/(jpeg|png|webp)$/.test(raw.type)) {
        setError(fr ? "Formats acceptés : JPG, PNG, WebP." : "Accepted formats: JPG, PNG, WebP.");
        continue;
      }
      if (strictSize && raw.size > 300 * 1024) {
        setError(fr ? "Photo trop lourde (max 300 Ko)." : "Photo too large (max 300 KB).");
        continue;
      }
      try {
        const f = await compress(raw, kind === "signature" ? 900 : 1800);
        next.push((await upload(f, kind)).url);
      } catch {
        setError(fr ? "Envoi impossible (image trop lourde ou session expirée)." : "Upload failed (image too large or session expired).");
      }
    }
    setUrls(next);
    setBusy(false);
    if (input.current) input.current.value = "";
  }

  function remove(url: string) {
    setUrls(urls.filter((u) => u !== url));
    const id = /\/api\/media\/([\w-]+)$/.exec(url)?.[1];
    if (id) fetch(`/api/partner/media?id=${id}`, { method: "DELETE" }).catch(() => undefined);
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={JSON.stringify(urls)} />
      <p className="text-sm font-medium">{label}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <ul className="flex flex-wrap gap-3">
        {urls.map((u, i) => (
          <li key={u} className="w-28 space-y-1 text-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt="" className="h-28 w-28 rounded-md border object-cover" />
            <div className="flex gap-1">
              {kind === "photo" && i > 0 && (
                <button type="button" className="min-h-8 flex-1 rounded border px-1" onClick={() => setUrls([u, ...urls.filter((x) => x !== u)])}>
                  {fr ? "Couverture" : "Cover"}
                </button>
              )}
              {kind === "photo" && i === 0 && <span className="flex-1 rounded bg-accent/20 px-1 py-1 text-center font-medium">{fr ? "Couverture" : "Cover"}</span>}
              <button type="button" className="min-h-8 rounded border px-2 text-destructive" onClick={() => remove(u)} aria-label={fr ? "Supprimer" : "Remove"}>
                ✕
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex min-h-11 cursor-pointer items-center rounded-md border px-4 text-sm font-medium">
          {busy ? (fr ? "Envoi…" : "Uploading…") : fr ? "Ajouter une photo" : "Add a photo"}
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple={max > 1} disabled={busy || urls.length >= max} className="sr-only" onChange={(e) => addFiles([...(e.target.files ?? [])])} />
        </label>
        {extra && <SignatureDraw fr={fr} onFile={(f) => addFiles([f])} disabled={busy || urls.length >= max} />}
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

// Zone de dessin de la signature (souris ou doigt) ; produit un PNG envoyé comme une photo.
function SignatureDraw({ fr, onFile, disabled }: { fr: boolean; onFile: (f: File) => void; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);

  const pos = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * canvas.current!.width, y: ((e.clientY - r.top) / r.height) * canvas.current!.height };
  };
  const start = (e: React.PointerEvent) => {
    drawing.current = true;
    canvas.current!.setPointerCapture(e.pointerId);
    const c = canvas.current!.getContext("2d")!;
    const p = pos(e);
    c.lineWidth = 3;
    c.lineCap = "round";
    c.strokeStyle = "#111";
    c.beginPath();
    c.moveTo(p.x, p.y);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const c = canvas.current!.getContext("2d")!;
    const p = pos(e);
    c.lineTo(p.x, p.y);
    c.stroke();
    dirty.current = true;
  };
  const clear = () => {
    const c = canvas.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    dirty.current = false;
  };
  const validate = () => {
    if (!dirty.current) return;
    canvas.current!.toBlob((b) => {
      if (b) onFile(new File([b], "signature.png", { type: "image/png" }));
      setOpen(false);
    }, "image/png");
  };

  if (!open)
    return (
      <button type="button" disabled={disabled} className="min-h-11 rounded-md border px-4 text-sm font-medium disabled:opacity-50" onClick={() => setOpen(true)}>
        {fr ? "Dessiner ma signature" : "Draw my signature"}
      </button>
    );
  return (
    <div className="w-full space-y-2">
      <canvas ref={canvas} width={600} height={200} className="w-full max-w-md touch-none rounded-md border bg-white" onPointerDown={start} onPointerMove={move} onPointerUp={() => (drawing.current = false)} aria-label={fr ? "Zone de signature" : "Signature area"} />
      <div className="flex gap-2">
        <button type="button" className="min-h-11 rounded-md border px-4 text-sm" onClick={clear}>{fr ? "Effacer" : "Clear"}</button>
        <button type="button" className="min-h-11 rounded-md bg-primary px-4 text-sm text-primary-foreground" onClick={validate}>{fr ? "Valider" : "Use this signature"}</button>
        <button type="button" className="min-h-11 px-3 text-sm underline" onClick={() => setOpen(false)}>{fr ? "Annuler" : "Cancel"}</button>
      </div>
    </div>
  );
}
