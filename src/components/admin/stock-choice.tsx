"use client";

import { useState } from "react";
import { inputCls } from "@/components/fournisseur/parts";

/** Sort d'un colis rembours\u00e9 : liste obligatoire ; le motif devient obligatoire si \u00ab exclure du stock \u00bb. */
export function StockChoice({ en, defaultChoice = "", defaultReason = "" }: { en: boolean; defaultChoice?: "" | "restock" | "exclude"; defaultReason?: string }) {
  const [v, setV] = useState<string>(defaultChoice);
  const t = (fr: string, e: string) => (en ? e : fr);
  return (
    <>
      <label className="text-xs">{t("Sort du colis", "Parcel outcome")}
        <select name="stock" required value={v} onChange={(e) => setV(e.target.value)} className={`${inputCls} w-56`}>
          <option value="" disabled>{t("Choisir\u2026", "Choose\u2026")}</option>
          <option value="restock">{t("Remettre en vente", "Put back on sale")}</option>
          <option value="exclude">{t("Exclure du stock", "Exclude from stock")}</option>
        </select>
      </label>
      {v === "exclude" && (
        <label className="text-xs">{t("Motif de l'exclusion (obligatoire)", "Exclusion reason (required)")}
          <input name="excludeReason" required defaultValue={defaultReason} maxLength={300} placeholder={t("ex. article endommag\u00e9", "e.g. damaged item")} className={`${inputCls} w-64`} />
        </label>
      )}
    </>
  );
}
