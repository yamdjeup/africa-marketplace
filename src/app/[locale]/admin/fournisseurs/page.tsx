import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { db } from "@/lib/db";
import type { Locale } from "@/lib/i18n";
import { tr } from "@/lib/tr";
import { setViewAs } from "../../fournisseur/actions";
import { changePartnerStatus } from "../actions";
import { inputCls } from "@/components/fournisseur/parts";

export const dynamic = "force-dynamic";

export default async function SuppliersPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ done?: string; error?: string }> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const [list, audits] = await Promise.all([
    db.supplier.findMany({ orderBy: { createdAt: "asc" }, include: { user: { select: { email: true } } } }),
    db.partnerAudit.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
  ]);
  const names = new Map(list.map((s) => [s.id, s.displayName]));
  const errors: Record<string, [string, string]> = {
    reason: ["Le motif est obligatoire.", "A reason is required."],
    confirm: ["Cochez la confirmation pour révoquer.", "Tick the confirmation to revoke."],
    open: ["Révocation impossible : des commandes sont encore en cours (stock réservé).", "Cannot revoke: orders are still open (reserved stock)."],
    invalid: ["Action impossible pour ce partenaire.", "Action not possible for this partner."],
    action: ["Action inconnue.", "Unknown action."],
  };
  return (
    <>
      <h1 className="font-heading text-3xl text-primary">{tr(locale, "Partenaires", "Partners")}</h1>
      <p className="text-sm text-muted-foreground">{tr(locale, "Les partenaires de démonstration peuvent être ouverts en vue admin (lecture seule).", "Demo partners can be opened in admin view (read-only).")}</p>
      {sp.done && <p role="status" className="rounded-md border border-accent bg-accent/15 p-3 text-sm">{tr(locale, "Statut mis à jour, e-mail envoyé.", "Status updated, email sent.")}</p>}
      {sp.error && <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">{errors[sp.error] ? tr(locale, ...errors[sp.error]) : tr(locale, "Erreur.", "Error.")}</p>}
      <ul className="divide-y rounded-lg border bg-card">
        {list.map((s) => (
          <li key={s.id} className="space-y-2 p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>
                <strong>{s.displayName}</strong> · {s.country} · {s.craftType} · {Math.round(s.commissionRate * 1000) / 10} %
                <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">{s.status === "ACTIVE" ? tr(locale, "Actif", "Active") : s.status === "SUSPENDED" ? tr(locale, "Suspendu", "Suspended") : tr(locale, "Révoqué", "Revoked")}</span>
                <span className="ml-2 text-xs text-muted-foreground">{s.isDemo ? tr(locale, "démo", "demo") : s.user?.email}</span>
              </span>
              {s.isDemo && (
                <form action={setViewAs}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="supplierId" value={s.id} />
                  <button className={buttonVariants({ variant: "outline", className: "min-h-11" })}>{tr(locale, "Voir son espace", "View its area")}</button>
                </form>
              )}
            </div>
            {!s.isDemo && s.status !== "REVOKED" && (
              <details className="rounded-md border p-3">
                <summary className="cursor-pointer font-medium">{tr(locale, "Gérer l'accès", "Manage access")}</summary>
                <div className="mt-3 space-y-3">
                  {s.status === "SUSPENDED" ? (
                    <form action={changePartnerStatus}>
                      <input type="hidden" name="id" value={s.id} /><input type="hidden" name="action" value="REACTIVATE" />
                      <button className={buttonVariants({ className: "min-h-11" })}>{tr(locale, "Réactiver", "Reactivate")}</button>
                    </form>
                  ) : (
                    <form action={changePartnerStatus} className="flex flex-wrap items-end gap-2">
                      <input type="hidden" name="id" value={s.id} /><input type="hidden" name="action" value="SUSPEND" />
                      <label className="min-w-48 flex-1">{tr(locale, "Motif (obligatoire)", "Reason (required)")}<input name="reason" required className={inputCls} /></label>
                      <button className={buttonVariants({ variant: "outline", className: "min-h-11" })}>{tr(locale, "Suspendre", "Suspend")}</button>
                    </form>
                  )}
                  <form action={changePartnerStatus} className="space-y-2 border-t pt-3">
                    <input type="hidden" name="id" value={s.id} /><input type="hidden" name="action" value="REVOKE" />
                    <label className="block">{tr(locale, "Motif de révocation (obligatoire)", "Revocation reason (required)")}<input name="reason" required className={inputCls} /></label>
                    <label className="flex min-h-11 items-center gap-2"><input type="checkbox" name="anonymize" className="size-5" />{tr(locale, "Anonymiser le profil (RGPD) ; commandes et paiements conservés", "Anonymise the profile (GDPR); orders and payments kept")}</label>
                    <label className="flex min-h-11 items-center gap-2"><input type="checkbox" name="confirm" className="size-5" />{tr(locale, "Je confirme la révocation définitive", "I confirm the permanent revocation")}</label>
                    <button className="min-h-11 rounded-md border border-destructive px-4 text-destructive">{tr(locale, "Révoquer définitivement", "Revoke permanently")}</button>
                  </form>
                </div>
              </details>
            )}
          </li>
        ))}
      </ul>
      <h2 className="font-heading text-2xl text-primary">{tr(locale, "Journal d'audit", "Audit log")}</h2>
      {audits.length === 0 ? <p className="text-sm text-muted-foreground">—</p> : (
        <ul className="space-y-1 text-sm">
          {audits.map((a) => <li key={a.id}>{a.createdAt.toLocaleString(locale === "en" ? "en-GB" : "fr-FR")} · {a.actorEmail} · <strong>{a.action}</strong> · {names.get(a.supplierId) ?? a.supplierId}{a.reason ? ` — ${a.reason}` : ""}</li>)}
        </ul>
      )}
      <Link href={`/${locale}/account`} className="text-sm underline">{tr(locale, "Retour au compte", "Back to account")}</Link>
    </>
  );
}
