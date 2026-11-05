"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

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
  const synced = useRef(false);

  const push = useCallback((next: string[], rollback?: string[]) => {
    if (!synced.current) return;
    const undo = () => {
      if (!rollback) return;
      setSlugs(rollback);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(rollback));
      } catch {}
    };
    void fetch("/api/favorites", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slugs: next }) })
      .then((r) => {
        if (!r.ok) undo();
      })
      .catch(undo);
  }, []);

  useEffect(() => {
    // Hydratation depuis localStorage après le premier rendu (évite un écart SSR/client).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSlugs(read());
    // Comptes connectés : fusion avec les favoris en base (401 pour les visiteurs : localStorage seul).
    fetch("/api/favorites")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { slugs?: string[] } | null) => {
        if (!data?.slugs) return;
        const merged = [...new Set([...data.slugs, ...read()])];
        synced.current = true;
        setSlugs(merged);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        } catch {}
        if (merged.length !== data.slugs.length) push(merged);
      })
      .catch(() => {});
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setSlugs(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [push]);

  const toggle = useCallback((slug: string) => {
    const prev = read();
    const next = prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // stockage indisponible : l'état reste en mémoire
    }
    setSlugs(next);
    push(next, prev);
  }, [push]);

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
