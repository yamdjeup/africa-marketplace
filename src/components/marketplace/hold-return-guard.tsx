"use client";

import { useEffect } from "react";

/** Retour du navigateur depuis Stripe (y compris page restaurée du bfcache) : libère la réservation en cours de cet acheteur. */
export function HoldReturnGuard() {
  useEffect(() => {
    const release = () => void fetch("/api/checkout/cancel", { method: "POST", credentials: "same-origin" }).catch(() => undefined);
    release();
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) release();
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);
  return null;
}

