"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";

export type CartLine = {
  slug: string;
  size: string | null;
  quantity: number;
  /** Instantané pour l'affichage hors requête ; le serveur revalide les prix au checkout. */
  name: string;
  creatorName: string;
  image: string;
  priceCents: number;
  maxQuantity: number;
};

type CartContextValue = {
  lines: CartLine[];
  count: number;
  totalCents: number;
  ready: boolean;
  add: (line: Omit<CartLine, "quantity">, quantity?: number) => void;
  setQuantity: (slug: string, size: string | null, quantity: number) => void;
  remove: (slug: string, size: string | null) => void;
  clear: () => void;
};

const STORAGE_KEY = "afrique-marketplace:cart:v1";
const CartContext = createContext<CartContextValue | null>(null);

const same = (l: CartLine, slug: string, size: string | null) => l.slug === slug && l.size === size;

function read(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const noopSubscribe = () => () => {};

export function CartProvider({ children }: { children: React.ReactNode }) {
  const ready = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [lines, setLines] = useState<CartLine[]>([]);

  useEffect(() => {
    // Hydratation depuis localStorage après le premier rendu (évite un écart SSR/client).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLines(read());
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setLines(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = useCallback((fn: (prev: CartLine[]) => CartLine[]) => {
    setLines((prev) => {
      const next = fn(prev);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* stockage indisponible : le panier reste en mémoire */
      }
      return next;
    });
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      ready,
      count: lines.reduce((n, l) => n + l.quantity, 0),
      totalCents: lines.reduce((n, l) => n + l.quantity * l.priceCents, 0),
      add: (line, quantity = 1) =>
        update((prev) => {
          const existing = prev.find((l) => same(l, line.slug, line.size));
          if (!existing) return [...prev, { ...line, quantity: Math.min(quantity, line.maxQuantity) }];
          return prev.map((l) =>
            l === existing ? { ...l, ...line, quantity: Math.min(l.quantity + quantity, line.maxQuantity) } : l,
          );
        }),
      setQuantity: (slug, size, quantity) =>
        update((prev) =>
          prev
            .map((l) => (same(l, slug, size) ? { ...l, quantity: Math.min(quantity, l.maxQuantity) } : l))
            .filter((l) => l.quantity > 0),
        ),
      remove: (slug, size) => update((prev) => prev.filter((l) => !same(l, slug, size))),
      clear: () => update(() => []),
    }),
    [lines, ready, update],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart doit être utilisé dans <CartProvider>");
  return ctx;
}
