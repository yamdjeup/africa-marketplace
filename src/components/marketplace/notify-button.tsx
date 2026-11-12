"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NotifyButton({ slug, locale, loggedIn, initial }: { slug: string; locale: "fr" | "en"; loggedIn: boolean; initial: boolean }) {
  const fr = locale === "fr";
  const router = useRouter();
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!loggedIn) {
      router.push(`/${locale}/login?next=${encodeURIComponent(`/${locale}/produits/${slug}`)}`);
      return;
    }
    setBusy(true);
    const res = await fetch(on ? `/api/restock-watch?slug=${encodeURIComponent(slug)}` : "/api/restock-watch", {
      method: on ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: on ? undefined : JSON.stringify({ slug, locale }),
    });
    if (res.ok) setOn(!on);
    setBusy(false);
  }

  return (
    <div className="space-y-1" aria-live="polite">
      {on && <p className="text-sm text-kente">{fr ? "Vous serez prévenu(e) dès qu'elle est disponible." : "You will be notified as soon as it is available."}</p>}
      <button type="button" onClick={toggle} disabled={busy} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60">
        {on ? (fr ? "Annuler l'alerte" : "Cancel alert") : fr ? "Me prévenir quand elle est disponible" : "Notify me when it is available"}
      </button>
      {on && <p className="text-xs text-muted-foreground">{fr ? "Pièce unique : premier arrivé, premier servi." : "Unique piece: first come, first served."}</p>}
    </div>
  );
}
