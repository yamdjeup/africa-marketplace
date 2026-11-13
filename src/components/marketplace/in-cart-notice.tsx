"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart";
import { INTEREST_POLL_MS } from "@/lib/cart-interest";
import { interestToken } from "@/lib/interest-token";

/** Signale un autre client qui a déjà cette pièce dans son panier (anonyme, sans identité). */
export function InCartNotice({ slug, locale }: { slug: string; locale: string }) {
  const { lines, ready } = useCart();
  const [others, setOthers] = useState(false);

  useEffect(() => {
    if (!ready) return;
    const token = interestToken();
    let alive = true;
    const run = async () => {
      const r = await fetch(`/api/cart-interest?slug=${encodeURIComponent(slug)}&token=${token}`, { cache: "no-store" }).catch(() => null);
      const j = r && r.ok ? ((await r.json().catch(() => null)) as { others?: boolean } | null) : null;
      if (alive) setOthers(Boolean(j?.others));
    };
    void run();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void run();
    }, INTEREST_POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void run();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [ready, slug, lines]);

  if (!others) return null;
  return (
    <p role="status" aria-live="polite" className="rounded-md border border-primary bg-primary px-4 py-3 text-center text-sm font-medium text-primary-foreground shadow-md">
      {locale === "en" ? "Hurry: another customer has this piece in their cart." : "Dépêchez-vous : un autre client a cette pièce dans son panier."}
    </p>
  );
}
