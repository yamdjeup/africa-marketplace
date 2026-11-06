"use client";

import { useRef, useState } from "react";

type F = { id: string; name: string; mime: string; size: number };

const MAX_FILES = 5;
const MAX_BYTES = 4 * 1024 * 1024;

async function compress(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/webp" && file.size < 600_000) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.82));
    return blob && blob.size < file.size ? new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

export function PartnerFilesField({ initial, fr }: { initial: F[]; fr: boolean }) {
  const [files, setFiles] = useState<F[]>(initial);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const t = (a: string, b: string) => (fr ? a : b);
  const errors: Record<string, string> = {
    size: t("Fichier trop lourd (4 Mo maximum).", "File too large (4 MB max)."),
    type: t("Format non accepté (JPG, PNG, WebP ou PDF).", "Unsupported format (JPG, PNG, WebP or PDF)."),
    count: t("5 fichiers maximum.", "5 files maximum."),
    auth: t("Session expirée : reconnectez-vous puis réessayez.", "Session expired: sign in again and retry."),
    server: t("Erreur du serveur lors de l'enregistrement. Réessayez ; si cela persiste, contactez-nous.", "Server error while saving. Retry; if it persists, contact us."),
  };

  async function add(list: FileList | null) {
    if (!list) return;
    setMsg("");
    setBusy(true);
    for (const raw of Array.from(list)) {
      const f = await compress(raw);
      if (f.size > MAX_BYTES) { setMsg(errors.size); continue; }
      const body = new FormData();
      body.set("file", f);
      let data: { error?: string } = {};
      let res: Response | null = null;
      try {
        res = await fetch("/api/partner/files", { method: "POST", body });
        data = await res.json().catch(() => ({}));
      } catch {
        setMsg(t("Connexion perdue pendant l'envoi. Réessayez.", "Connection lost during upload. Please retry."));
        continue;
      }
      if (res.ok) setFiles((cur) => [...cur, data as F]);
      else if (res.status === 413) setMsg(errors.size);
      else setMsg(errors[data.error ?? ""] ?? t(`Envoi impossible (erreur ${res.status}).`, `Upload failed (error ${res.status}).`));
    }
    setBusy(false);
    if (input.current) input.current.value = "";
  }

  async function remove(id: string) {
    await fetch(`/api/partner/files?id=${id}`, { method: "DELETE" });
    setFiles((cur) => cur.filter((f) => f.id !== id));
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{t("Ou joignez des fichiers de vos œuvres (JPG, PNG, WebP, PDF — 5 fichiers, 4 Mo chacun)", "Or attach files of your work (JPG, PNG, WebP, PDF — 5 files, 4 MB each)")}</p>
      <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" disabled={busy || files.length >= MAX_FILES} onChange={(e) => add(e.target.files)} className="block w-full min-h-11 rounded-md border bg-background px-3 py-2 text-sm" />
      {busy && <p role="status" className="text-xs text-muted-foreground">{t("Envoi en cours…", "Uploading…")}</p>}
      {msg && <p role="alert" className="text-xs text-destructive">{msg}</p>}
      <ul className="flex flex-wrap gap-3">
        {files.map((f) => (
          <li key={f.id} className="w-28 space-y-1 text-xs">
            {f.mime.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/partner/files?id=${f.id}`} alt={f.name} className="h-24 w-28 rounded-md border object-cover" />
            ) : (
              <div className="flex h-24 w-28 items-center justify-center rounded-md border bg-card font-semibold">PDF</div>
            )}
            <p className="truncate" title={f.name}>{f.name}</p>
            <button type="button" onClick={() => remove(f.id)} className="min-h-11 underline">{t("Supprimer", "Remove")}</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
