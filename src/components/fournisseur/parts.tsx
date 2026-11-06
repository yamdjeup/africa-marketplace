import type { ReactNode } from "react";
import type { Locale } from "@/lib/i18n";
import { tr } from "@/lib/supplier-mock";

export function MockBanner({ locale }: { locale: Locale }) {
  return (
    <p role="note" className="rounded-md border border-accent bg-accent/15 px-3 py-2 text-xs text-foreground">
      <strong className="uppercase tracking-wide">{tr(locale, "Maquette", "Mockup")}</strong>{" "}
      {tr(locale, "— données fictives, aucun paiement réel, aucun e-mail envoyé.", "— demo data, no real payment, no email sent.")}
    </p>
  );
}

export function Pill({ cls, children }: { cls: string; children: ReactNode }) {
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-heading text-2xl text-primary">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export const inputCls = "mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm min-h-11";
