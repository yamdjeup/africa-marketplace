"use client";

import { Flag } from "@/components/marketplace/flag";
import { getDict, pick, type Locale } from "@/lib/i18n";
import { useRegion } from "@/lib/region";

const rowClass = "flex min-h-14 w-full items-center justify-between border-b px-1 text-left text-sm hover:text-terracotta";

function open(tab: "language" | "region") {
  window.dispatchEvent(new CustomEvent("open-region-panel", { detail: tab }));
}

export function RegionRows({ locale }: { locale: Locale }) {
  const t = getDict(locale).me;
  const region = useRegion();
  return (
    <>
      <button type="button" onClick={() => open("language")} className={rowClass}>
        <span className="flex items-center gap-3">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
          </svg>
          {t.language}
        </span>
        <span className="flex items-center gap-2 text-muted-foreground">
          {locale === "fr" ? "Français" : "English"} <span aria-hidden="true">›</span>
        </span>
      </button>
      <button type="button" onClick={() => open("region")} className={rowClass}>
        <span className="flex items-center gap-3">
          <Flag code={region.code} className="h-4 w-6" />
          {t.region}
        </span>
        <span className="flex items-center gap-2 text-muted-foreground">
          {pick(locale, region.fr, region.en)} · {region.currency} <span aria-hidden="true">›</span>
        </span>
      </button>
      <p className="py-3 text-xs text-muted-foreground">{getDict(locale).f4.billedIn(pick(locale, region.fr, region.en))}</p>
    </>
  );
}
