"use client";

import { useState } from "react";
import { getDict, type Locale } from "@/lib/i18n";

// Inscription simulée : rien n'est envoyé ni stocké (démo privée).
export function Newsletter({ locale }: { locale: Locale }) {
  const t = getDict(locale).f4;
  const [status, setStatus] = useState<"idle" | "ok" | "invalid">("idle");
  return (
    <section aria-labelledby="news" className="space-y-3 rounded-lg bg-muted p-6 text-center md:p-10">
      <h2 id="news" className="font-heading text-2xl text-primary">{t.newsTitle}</h2>
      <p className="text-sm text-muted-foreground">{t.newsText}</p>
      <form
        noValidate
        className="mx-auto max-w-md space-y-3 text-left"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(f.get("email") ?? "").trim()) && f.get("consent") === "on";
          setStatus(ok ? "ok" : "invalid");
          if (ok) e.currentTarget.reset();
        }}
      >
        <div className="flex gap-2">
          <label htmlFor="nl-email" className="sr-only">{t.newsEmail}</label>
          <input id="nl-email" name="email" type="email" autoComplete="email" placeholder={t.newsEmail} className="h-11 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm" />
          <button type="submit" className="h-11 shrink-0 rounded-md bg-black px-4 text-sm font-medium text-white hover:bg-black/85">{t.newsSubmit}</button>
        </div>
        <label className="flex items-start gap-2 text-xs text-muted-foreground">
          <input type="checkbox" name="consent" className="mt-0.5 size-4 accent-primary" />
          {t.newsConsent}
        </label>
        <p role="status" className={`text-sm ${status === "invalid" ? "text-destructive" : "text-primary"}`}>
          {status === "ok" ? t.newsOk : status === "invalid" ? t.newsInvalid : ""}
        </p>
      </form>
    </section>
  );
}
