"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "afrique-marketplace:favorites:v1";

type FavoritesValue = {
  slugs: string[];
  count: number;
  has: (slug: string) => boolean;
  toggle: (slug: string) => void;
};

const FavoritesContext = createContext<FavoritesValue | null>(null);

function read(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [slugs, setSlugs] = useState<string[]>([]);

  useEffect(() => {
    // Hydratation depuis localStorage après le premier rendu (évite un écart SSR/client).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSlugs(read());
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setSlugs(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggle = useCallback((slug: string) => {
    setSlugs((prev) => {
      const next = prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // stockage indisponible : l'état reste en mémoire
      }
      return next;
    });
  }, []);

  const value = useMemo<FavoritesValue>(
    () => ({ slugs, count: slugs.length, has: (s) => slugs.includes(s), toggle }),
    [slugs, toggle],
  );
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites doit être utilisé dans FavoritesProvider");
  return ctx;
}
