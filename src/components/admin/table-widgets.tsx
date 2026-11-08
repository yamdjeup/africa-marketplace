"use client";

import { useEffect, useRef, useState } from "react";

// Case « tout sélectionner » pour les cases `slug` du formulaire parent.
export function SelectAll({ label }: { label: string }) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      className="size-5"
      onChange={(e) => {
        const on = e.currentTarget.checked;
        e.currentTarget.form?.querySelectorAll<HTMLInputElement>('input[name="slug"]').forEach((c) => {
          c.checked = on;
        });
      }}
    />
  );
}

// Bouton de soumission demandant une confirmation avant envoi.
// Fenêtre du site (Confirmer / Annuler) ; `askReason` ajoute un motif obligatoire (champ « reason » du formulaire parent).
export function ConfirmButton({ message, className, name, value, children, askReason, title, en }: { message: string; className?: string; name?: string; value?: string; children: React.ReactNode; askReason?: boolean; title?: string; en?: boolean }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  const ok = !askReason || reason.trim().length >= 3;
  return (
    <>
      <button ref={ref} type="submit" name={name} value={value} className={className} onClick={(e) => { e.preventDefault(); setOpen(true); }}>
        {children}
      </button>
      {askReason && <input type="hidden" name="reason" value={reason.trim()} />}
      {open && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm space-y-3 rounded-lg bg-background p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            {title && <h2 className="font-heading text-xl">{title}</h2>}
            <p className="text-sm">{message}</p>
            {askReason && (
              <label className="block text-sm">{en ? "Reason (required)" : "Motif (obligatoire)"}
                <input value={reason} onChange={(e) => setReason(e.target.value)} minLength={3} className="mt-1 w-full rounded-md border px-3 py-2" autoFocus />
              </label>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" className="inline-flex min-h-11 items-center rounded-md border px-4 text-sm" onClick={() => setOpen(false)}>{en ? "Cancel" : "Annuler"}</button>
              <button type="button" disabled={!ok} className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-sm text-primary-foreground disabled:opacity-50" onClick={() => { const b = ref.current; setOpen(false); b?.form?.requestSubmit(b); }}>{en ? "Confirm" : "Confirmer"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Miniature cliquable ouvrant une visionneuse (Échap / clic extérieur / bouton, précédent/suivant, balayage tactile).
export function PhotoLightbox({ images, title, labels }: { images: string[]; title: string; labels: { open: string; close: string; prev: string; next: string } }) {
  const [i, setI] = useState<number | null>(null);
  const n = images.length;
  useEffect(() => {
    if (i === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setI(null);
      else if (e.key === "ArrowRight") setI((x) => (x === null ? x : (x + 1) % n));
      else if (e.key === "ArrowLeft") setI((x) => (x === null ? x : (x - 1 + n) % n));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [i, n]);
  const [startX, setStartX] = useState(0);
  if (n === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <>
      <button type="button" onClick={() => setI(0)} aria-label={`${labels.open} : ${title}`} className="relative block size-14 shrink-0 overflow-hidden rounded-md border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[0]} alt="" className="size-full object-cover" loading="lazy" />
        {n > 1 && <span className="absolute bottom-0 right-0 rounded-tl bg-black/70 px-1 text-[10px] text-white">{n}</span>}
      </button>
      {i !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/85 p-4"
          onClick={() => setI(null)}
          onTouchStart={(e) => setStartX(e.touches[0].clientX)}
          onTouchEnd={(e) => {
            const dx = e.changedTouches[0].clientX - startX;
            if (n > 1 && Math.abs(dx) > 50) setI((x) => (x === null ? x : (x + (dx < 0 ? 1 : -1) + n) % n));
          }}
        >
          <button type="button" autoFocus onClick={() => setI(null)} aria-label={labels.close} className="absolute right-3 top-3 grid size-11 place-items-center rounded-full bg-white/90 text-xl text-black">×</button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[i]} alt={title} onClick={(e) => e.stopPropagation()} className="max-h-[80vh] max-w-full rounded-md object-contain" />
          <p className="text-sm text-white" onClick={(e) => e.stopPropagation()}>{title}{n > 1 ? ` — ${i + 1}/${n}` : ""}</p>
          {n > 1 && (
            <>
              <button type="button" onClick={(e) => { e.stopPropagation(); setI((i - 1 + n) % n); }} aria-label={labels.prev} className="absolute left-2 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-xl text-black">‹</button>
              <button type="button" onClick={(e) => { e.stopPropagation(); setI((i + 1) % n); }} aria-label={labels.next} className="absolute right-2 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-xl text-black">›</button>
            </>
          )}
        </div>
      )}
    </>
  );
}
