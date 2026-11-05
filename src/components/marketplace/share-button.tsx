"use client";

import { Capacitor } from "@capacitor/core";

export function ShareButton({ title, text, label }: { title: string; text: string; label: string }) {
  async function share() {
    const url = window.location.href;
    try {
      if (Capacitor.isNativePlatform()) {
        const { Share } = await import("@capacitor/share");
        await Share.share({ title, text, url, dialogTitle: label });
      } else if (navigator.share) {
        await navigator.share({ title, text, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      /* partage annulé par l'utilisateur */
    }
  }
  return (
    <button type="button" onClick={share} aria-label={label} title={label} className="inline-flex size-11 items-center justify-center rounded-full border text-primary hover:text-terracotta focus-visible:ring-2 focus-visible:ring-ring">
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 15V4M8 8l4-4 4 4M5 12v7h14v-7" />
      </svg>
    </button>
  );
}
