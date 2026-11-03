"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { REGIONS } from "@/data/regions";
import { getDict, pick, type Locale } from "@/lib/i18n";
import { setRegion, useRegion } from "@/lib/region";

function Inner({ locale }: { locale: Locale }) {
  const t = getDict(locale).region;
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const region = useRegion();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"language" | "region">("language");
  const [query, setQuery] = useState("");
  const btnRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const rest = pathname.replace(/^\/(fr|en)/, "");
  const hrefFor = (l: Locale) => `/${l}${rest}${search ? `?${search}` : ""}`;

  useEffect(() => {
    const onOpen = (e: Event) => {
      setTab((e as CustomEvent<"language" | "region">).detail ?? "language");
      setOpen(true);
    };
    window.addEventListener("open-region-panel", onOpen);
    return () => window.removeEventListener("open-region-panel", onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const q = query.trim().toLowerCase();
  const list = REGIONS.filter((r) => !q || r.fr.toLowerCase().includes(q) || r.en.toLowerCase().includes(q) || r.currency.toLowerCase().includes(q));
  const tabClass = (a: boolean) =>
    `flex-1 border-b-2 py-3 text-sm font-medium ${a ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`${t.open} (${pick(locale, region.fr, region.en)}, ${locale.toUpperCase()}, ${region.currency})`}
        title={t.open}
        className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1 px-2 text-sm hover:text-terracotta"
      >
        <span aria-hidden="true" className="text-xl leading-none">{region.flag}</span>
        <span className="hidden text-xs uppercase sm:inline">{locale}</span>
      </button>
      {open &&
        createPortal(
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t.open}
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full max-w-sm flex-col bg-background shadow-xl"
          >
            <div className="flex items-center justify-between border-b px-4 py-2">
              <span className="font-heading text-lg text-primary">{t.open}</span>
              <button ref={closeRef} type="button" onClick={() => setOpen(false)} aria-label={t.close} className="inline-flex size-11 items-center justify-center text-xl">
                ×
              </button>
            </div>
            <div className="flex border-b px-4" role="tablist">
              <button role="tab" type="button" aria-selected={tab === "language"} onClick={() => setTab("language")} className={tabClass(tab === "language")}>
                {t.tabLanguage}
              </button>
              <button role="tab" type="button" aria-selected={tab === "region"} onClick={() => setTab("region")} className={tabClass(tab === "region")}>
                {t.tabRegion}
              </button>
            </div>
            {tab === "language" ? (
              <ul className="space-y-1 p-4" aria-label={t.languages}>
                {(["fr", "en"] as Locale[]).map((l) => (
                  <li key={l}>
                    <Link
                      href={hrefFor(l)}
                      hrefLang={l}
                      lang={l}
                      onClick={() => setOpen(false)}
                      aria-current={l === locale ? "true" : undefined}
                      className={`flex min-h-11 items-center justify-between rounded-md px-3 text-sm hover:bg-muted ${l === locale ? "font-semibold text-primary" : ""}`}
                    >
                      {l === "fr" ? "Français" : "English"}
                      {l === locale && <span aria-hidden="true">✓</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t.search}
                  aria-label={t.search}
                  className="h-11 w-full rounded-md border bg-background px-3 text-sm"
                />
                <ul className="min-h-0 flex-1 overflow-y-auto">
                  {list.map((r) => (
                    <li key={r.code}>
                      <button
                        type="button"
                        onClick={() => {
                          setRegion(r.code);
                          setOpen(false);
                        }}
                        aria-pressed={r.code === region.code}
                        className={`flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left text-sm hover:bg-muted ${r.code === region.code ? "font-semibold text-primary" : ""}`}
                      >
                        <span aria-hidden="true" className="text-xl">{r.flag}</span>
                        <span className="flex-1">{pick(locale, r.fr, r.en)}</span>
                        <span className="text-xs text-muted-foreground">{r.currency}</span>
                      </button>
                    </li>
                  ))}
                  {list.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">{t.none}</li>}
                </ul>
                <p className="text-xs text-muted-foreground">{t.note}</p>
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

export function RegionPanel({ locale }: { locale: Locale }) {
  return (
    <Suspense fallback={<span className="min-w-11" />}>
      <Inner locale={locale} />
    </Suspense>
  );
}
