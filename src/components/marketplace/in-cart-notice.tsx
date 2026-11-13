"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart";
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
    return () => {
      alive = false;
    };
  }, [ready, slug, lines]);

  if (!others) return null;
  return (
    <p role="status" className="rounded-md border border-accent bg-accent/15 p-3 text-sm font-medium">
      {locale === "en" ? "Hurry: another customer has this piece in their cart." : "Dépêchez-vous : un autre client a cette pièce dans son panier."}
    </p>
  );
}
