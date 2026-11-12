import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ListFilters, Pager } from "@/components/admin/list-controls";
import { LIST_PAGE_SIZE, PARTNER_STATUSES, pageArgs, pageCount, parseList, partnersWhere, type ListParams } from "@/lib/admin-list";
import { db } from "@/lib/db";
import type { Locale } from "@/lib/i18n";
import { tr } from "@/lib/tr";
import { setViewAs } from "../../fournisseur/actions";
import { changePartnerStatus } from "../actions";
import { PartnerActionForm } from "@/components/fournisseur/partner-action-form";

export const dynamic = "force-dynamic";

export default async function SuppliersPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<ListParams & { done?: string; error?: string; aq?: string; aa?: string; ap?: string }> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const q = parseList(sp, PARTNER_STATUSES, "ACTIVE", ["createdAt"], "createdAt");
  const where = partnersWhere(q);
  const total = await db.supplier.count({ where });
  q.page = Math.min(q.page, pageCount(total));
  const [list, all] = await Promise.all([
    db.supplier.findMany({ where, orderBy: { createdAt: q.asc ? "asc" : "desc" }, ...pageArgs(q.page), include: { user: { select: { email: true } } } }),
    db.supplier.findMany({ select: { id: true, displayName: true, createdAt: true, isDemo: true } }),
  ]);
  const path = `/${locale}/admin/fournisseurs`;
  const tabs = [{ value: "ACTIVE", label: tr(locale, "Actifs", "Active") }, { value: "SUSPENDED", label: tr(locale, "Suspendus", "Suspended") }, { value: "REVOKED", label: tr(locale, "Révoqués", "Revoked") }, { value: "all", label: tr(locale, "Tous", "All") }];
  const names = new Map(all.map((s) => [s.id, s.displayName]));
  // « JOINED » est déduit de la création du partenaire (candidature acceptée) ; les autres lignes viennent de PartnerAudit.
  const aq = (sp.aq ?? "").trim().slice(0, 80);
  const aa = sp.aa ?? "";
  const ap = Math.max(1, Math.trunc(Number(sp.ap)) || 1);
  const matching = all.filter((s) => !aq || s.displayName.toLowerCase().includes(aq.toLowerCase()));
  const ids = matching.map((s) => s.id);
  const auditWhere = { ...(aq ? { supplierId: { in: ids } } : {}), ...(aa && aa !== "JOINED" ? { action: aa } : {}) };
  const joined = aa && aa !== "JOINED" ? [] : matching.filter((s) => !s.isDemo);
  const auditTotal = aa === "JOINED" ? 0 : await db.partnerAudit.count({ where: auditWhere });
  const eventTotal = auditTotal + joined.length;
  const auditPages = pageCount(eventTotal);
  const apage = Math.min(ap, auditPages);
  const audits = aa === "JOINED" ? [] : await db.partnerAudit.findMany({ where: auditWhere, orderBy: { createdAt: "desc" }, take: apage * LIST_PAGE_SIZE });
  const events = [
    ...audits.map((a) => ({ id: a.id, at: a.createdAt, supplierId: a.supplierId, action: a.action, reason: a.reason, actor: a.actorEmail })),
    ...joined.map((s) => ({ id: `joined-${s.id}`, at: s.createdAt, supplierId: s.id, action: "JOINED", reason: "", actor: "" })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime()).slice((apage - 1) * LIST_PAGE_SIZE, apage * LIST_PAGE_SIZE);
  const auditHref = (n: number) => `${path}?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), ...(sp.st ? { st: sp.st } : {}), ...(sp.p ? { p: sp.p } : {}), ...(aq ? { aq } : {}), ...(aa ? { aa } : {}), ap: String(n) })}#audit`;  const actionLabels: Record<string, [string, string]> = {
    JOINED: ["Création du compte partenaire (candidature acceptée)", "Partner account created (application accepted)"],
    SUSPEND: ["Suspendu", "Suspended"],
    REACTIVATE: ["Réactivé", "Reactivated"],
    PROFILE_EDIT: ["Profil modifié", "Profile edited"],
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
      <p className="text-sm text-muted-foreground">{tr(locale, "Les partenaires peuvent être ouverts en vue admin (lecture seule).", "Partners can be opened in admin view (read-only).")}</p>
      <ListFilters locale={locale} path={path} q={q} tabs={tabs} defaultStatus="ACTIVE" />
      {sp.done && <p role="status" className="rounded-md border border-accent bg-accent/15 p-3 text-sm">{tr(locale, "Statut mis à jour, e-mail envoyé.", "Status updated, email sent.")}</p>}
      {sp.error && <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">{errors[sp.error] ? tr(locale, ...errors[sp.error]) : tr(locale, "Erreur.", "Error.")}</p>}
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50"><tr>
            {[["Nom", "Name"], ["Pays", "Country"], ["Savoir-faire", "Craft"], ["Commission (%)", "Commission (%)"], ["Statut", "Status"], ["E-mail", "Email"], ["Date", "Date"], ["Actions", "Actions"]].map((h) => <th key={h[0]} className={`p-2${h[0] === "Actions" ? " text-right" : ""}`}>{tr(locale, h[0], h[1])}</th>)}
          </tr></thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.id} className="border-t align-middle">
                <td className="p-2 font-medium">{s.displayName}</td>
                <td className="p-2">{s.country}</td>
                <td className="p-2">{s.craftType}</td>
                <td className="whitespace-nowrap p-2">{Math.round(s.commissionRate * 1000) / 10} %</td>
                <td className="p-2"><span className="rounded-full bg-muted px-2 py-0.5 text-xs">{s.status === "ACTIVE" ? tr(locale, "Actif", "Active") : s.status === "SUSPENDED" ? tr(locale, "Suspendu", "Suspended") : tr(locale, "Révoqué", "Revoked")}</span></td>
                <td className="break-all p-2">{s.isDemo ? tr(locale, "interne", "internal") : s.user?.email ?? "—"}</td>
                <td className="whitespace-nowrap p-2">{s.createdAt.toLocaleDateString(dateFmt)}</td>
                <td className="p-2">
                  <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                    {s.isDemo && (
                      <form action={setViewAs}>
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="supplierId" value={s.id} />
                        <button className={buttonVariants({ variant: "outline", size: "sm", className: "min-h-11" })}>{tr(locale, "Voir son espace", "View its area")}</button>
                      </form>
                    )}
                    {!s.isDemo && <Link href={`/${locale}/admin/fournisseurs/${s.id}/profil`} className={buttonVariants({ variant: "outline", size: "sm", className: "min-h-11" })}>{tr(locale, "Modifier le profil", "Edit profile")}</Link>}
                    {!s.isDemo && s.status === "ACTIVE" && <Link href={`/${locale}/admin/fournisseurs/${s.id}/oeuvres`} className={buttonVariants({ variant: "outline", size: "sm", className: "min-h-11" })}>{tr(locale, "Gérer les créations", "Manage creations")}</Link>}
                    {!s.isDemo && s.status !== "REVOKED" && <PartnerActionForm id={s.id} status={s.status as "ACTIVE" | "SUSPENDED"} locale={locale} action={changePartnerStatus} />}
                  </div>
                </td>              </tr>
            ))}
          </tbody>
        </table>
      </div>      <Pager locale={locale} path={path} q={q} total={total} defaultStatus="ACTIVE" />
      <h2 id="audit" className="font-heading text-2xl text-primary">{tr(locale, "Journal d'audit", "Audit log")}</h2>
      <form method="get" action={`${path}#audit`} className="flex flex-wrap items-end gap-2 text-sm">
        {sp.q && <input type="hidden" name="q" value={sp.q} />}
        {sp.st && <input type="hidden" name="st" value={sp.st} />}
        <label>{tr(locale, "Partenaire", "Partner")}<input name="aq" defaultValue={aq} maxLength={80} className="mt-1 block min-h-11 rounded-md border px-2" /></label>
        <label>{tr(locale, "Action", "Action")}
          <select name="aa" defaultValue={aa} className="mt-1 block min-h-11 rounded-md border px-2">
            <option value="">{tr(locale, "Toutes", "All")}</option>
            {Object.entries(actionLabels).map(([k, v]) => <option key={k} value={k}>{tr(locale, ...v)}</option>)}
          </select></label>
        <button className="min-h-11 rounded-md border px-4">{tr(locale, "Filtrer", "Filter")}</button>
      </form>
      {events.length === 0 ? <p className="text-sm text-muted-foreground">{tr(locale, "Aucun événement.", "No events.")}</p> : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50"><tr>
              <th className="p-2">{tr(locale, "Date", "Date")}</th><th className="p-2">{tr(locale, "Partenaire", "Partner")}</th><th className="p-2">{tr(locale, "Action", "Action")}</th><th className="p-2">{tr(locale, "Détail (champ : ancienne → nouvelle valeur)", "Detail (field: old → new value)")}</th><th className="p-2">{tr(locale, "Auteur", "Author")}</th>
            </tr></thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} className="border-t align-middle">
                  <td className="whitespace-nowrap p-2">{e.at.toLocaleString(dateFmt)}</td>
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
      <nav aria-label="Pagination" className="flex items-center gap-3 text-sm">
        {apage > 1 && <Link href={auditHref(apage - 1)} className="underline">← {tr(locale, "Précédent", "Previous")}</Link>}
        <span>{tr(locale, "Page", "Page")} {apage} / {auditPages} · {eventTotal} {tr(locale, "événements", "events")}</span>
        {apage < auditPages && <Link href={auditHref(apage + 1)} className="underline">{tr(locale, "Suivant", "Next")} →</Link>}
      </nav>      <Link href={`/${locale}/account`} className="text-sm underline">{tr(locale, "Retour au compte", "Back to account")}</Link>
    </>
  );
}
