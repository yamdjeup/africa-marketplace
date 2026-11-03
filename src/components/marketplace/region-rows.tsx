"use client";

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
        <span>{t.language}</span>
        <span className="flex items-center gap-2 text-muted-foreground">
          {locale === "fr" ? "Français" : "English"} <span aria-hidden="true">›</span>
        </span>
      </button>
      <button type="button" onClick={() => open("region")} className={rowClass}>
        <span>{t.region}</span>
        <span className="flex items-center gap-2 text-muted-foreground">
          {pick(locale, region.fr, region.en)} · {region.currency} <span aria-hidden="true">›</span>
        </span>
      </button>
      <p className="py-3 text-xs text-muted-foreground">{t.buyingIn(pick(locale, region.fr, region.en))}</p>
    </>
  );
}
