"use client";

import { useEffect, useState } from "react";

type InstallEvent = Event & { prompt: () => Promise<void> };

// Affiché seulement si le navigateur propose l'installation de la PWA.
export function InstallApp({ label }: { label: string }) {
  const [ev, setEv] = useState<InstallEvent | null>(null);
  useEffect(() => {
    const on = (e: Event) => {
      e.preventDefault();
      setEv(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", on);
    return () => window.removeEventListener("beforeinstallprompt", on);
  }, []);
  if (!ev) return null;
  return (
    <button type="button" onClick={() => ev.prompt()} className="mt-4 inline-flex min-h-11 items-center rounded-md border border-primary-foreground/60 px-4 text-sm hover:bg-primary-foreground hover:text-primary">
      {label}
    </button>
  );
}
