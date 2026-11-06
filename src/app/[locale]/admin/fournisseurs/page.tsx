import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { db } from "@/lib/db";
import type { Locale } from "@/lib/i18n";
import { tr } from "@/lib/tr";
import { setViewAs } from "../../fournisseur/actions";
import { changePartnerStatus } from "../actions";
import { PartnerActionForm } from "@/components/fournisseur/partner-action-form";

export const dynamic = "force-dynamic";

export default async function SuppliersPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ done?: string; error?: string }> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const [list, audits] = await Promise.all([
    db.supplier.findMany({ orderBy: { createdAt: "asc" }, include: { user: { select: { email: true } } } }),
    db.partnerAudit.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
  ]);
  const names = new Map(list.map((s) => [s.id, s.displayName]));
  // « Devenu partenaire » est déduit de la création du partenaire (créé à l'acceptation de la candidature) : rétro-rempli pour les existants.
  const events = [
    ...audits.map((a) => ({ id: a.id, at: a.createdAt, supplierId: a.supplierId, action: a.action, reason: a.reason, actor: a.actorEmail })),
    ...list.filter((s) => !s.isDemo).map((s) => ({ id: `joined-${s.id}`, at: s.createdAt, supplierId: s.id, action: "JOINED", reason: "", actor: "" })),
  ].sort((a, b) => (names.get(a.supplierId) ?? "").localeCompare(names.get(b.supplierId) ?? "") || a.at.getTime() - b.at.getTime());
  const actionLabels: Record<string, [string, string]> = {
    JOINED: ["Création du compte partenaire (candidature acceptée)", "Partner account created (application accepted)"],
    SUSPEND: ["Suspendu", "Suspended"],
    REACTIVATE: ["Réactivé", "Reactivated"],
    REVOKE: ["Révoqué définitivement", "Permanently revoked"],
  };
  const dateFmt = locale === "en" ? "en-GB" : "fr-FR";
  const errors: Record<string, [string, string]> = {
    reason: ["Le motif est obligatoire.", "A reason is required."],
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
                <span className="ml-2 text-xs text-muted-foreground">{s.isDemo ? tr(locale, "démo", "demo") : `${s.user?.email ?? ""} · ${tr(locale, "Partenaire depuis le", "Partner since")} ${s.createdAt.toLocaleDateString(dateFmt)}`}</span>
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
              <PartnerActionForm id={s.id} status={s.status as "ACTIVE" | "SUSPENDED"} locale={locale} action={changePartnerStatus} />
            )}
          </li>
        ))}
      </ul>
      <h2 className="font-heading text-2xl text-primary">{tr(locale, "Journal d'audit", "Audit log")}</h2>
      {events.length === 0 ? <p className="text-sm text-muted-foreground">{tr(locale, "Aucun événement.", "No events.")}</p> : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50"><tr>
              <th className="p-2">{tr(locale, "Date", "Date")}</th><th className="p-2">{tr(locale, "Partenaire", "Partner")}</th><th className="p-2">{tr(locale, "Action", "Action")}</th><th className="p-2">{tr(locale, "Motif", "Reason")}</th><th className="p-2">{tr(locale, "Auteur", "Author")}</th>
            </tr></thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} className="border-t align-top">
                  <td className="whitespace-nowrap p-2">{e.at.toLocaleString(locale === "en" ? "en-GB" : "fr-FR")}</td>
                  <td className="p-2">{names.get(e.supplierId) ?? e.supplierId}</td>
                  <td className="p-2"><strong>{actionLabels[e.action] ? tr(locale, ...actionLabels[e.action]) : e.action}</strong></td>
                  <td className="p-2">{e.reason || "—"}</td>
                  <td className="p-2 break-all">{e.actor || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Link href={`/${locale}/account`} className="text-sm underline">{tr(locale, "Retour au compte", "Back to account")}</Link>
    </>
  );
}
