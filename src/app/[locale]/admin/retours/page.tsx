import { buttonVariants } from "@/components/ui/button";
import { inputCls } from "@/components/fournisseur/parts";
import { ListFilters, Pager } from "@/components/admin/list-controls";
import { RETURN_FILTERS, pageArgs, pageCount, parseList, returnsWhere, type ListParams } from "@/lib/admin-list";
import { db } from "@/lib/db";
import type { Locale } from "@/lib/i18n";
import { RETURN_LABELS, type ReturnStatus } from "@/lib/returns";
import { tr } from "@/lib/tr";
import { decideReturnAction, refundReturnAction } from "../retours-actions";

export const dynamic = "force-dynamic";

export default async function ReturnsAdmin({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<ListParams & { ok?: string; error?: string }> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const q = parseList(sp, RETURN_FILTERS, "REQUESTED", ["createdAt"], "createdAt");
  const where = returnsWhere(q);
  const total = await db.returnRequest.count({ where });
  q.page = Math.min(q.page, pageCount(total));
  const [list, nReq] = await Promise.all([db.returnRequest.findMany({ where, orderBy: { createdAt: q.asc ? "asc" : "desc" }, ...pageArgs(q.page), include: { subOrder: { select: { number: true, subtotalCents: true } } } }), db.returnRequest.count({ where: { status: "REQUESTED" } })]);
  const path = `/${locale}/admin/retours`;
  const tabs = [{ value: "REQUESTED", label: tr(locale, "À traiter", "To handle"), count: nReq }, { value: "ACCEPTED", label: tr(locale, "Acceptés (à rembourser)", "Accepted (to refund)") }, { value: "REFUNDED", label: tr(locale, "Remboursés", "Refunded") }, { value: "REFUSED", label: tr(locale, "Refusés", "Refused") }, { value: "all", label: tr(locale, "Tous", "All") }];
  const eur = (c: number) => new Intl.NumberFormat(locale === "en" ? "en-GB" : "fr-FR", { style: "currency", currency: "EUR" }).format(c / 100);
  const fmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", { dateStyle: "medium" });
  const ok: Record<string, [string, string]> = { accepted: ["Retour accepté, client prévenu.", "Return accepted, customer notified."], refused: ["Retour refusé, client prévenu.", "Return refused, customer notified."], refunded: ["Remboursement enregistré, client prévenu.", "Refund recorded, customer notified."] };
  const err: Record<string, [string, string]> = { state: ["Cette demande a déjà été traitée.", "This request has already been handled."], refund: ["Remboursement Stripe non effectué (voir la note). Vous pouvez le marquer comme fait manuellement.", "Stripe refund not completed (see note). You can mark it as done manually."] };
  return (
    <>
      <h1 className="font-heading text-3xl text-primary">{tr(locale, "Retours et litiges", "Returns and disputes")}</h1>
      <p className="rounded-md border border-accent bg-accent/10 p-3 text-sm">{tr(locale, "L'administration arbitre : accepter ou refuser, puis rembourser le colis.", "The admin team arbitrates: accept or refuse, then refund the parcel.")}</p>
      {sp.ok && ok[sp.ok] && <p role="status" className="rounded-md border border-accent bg-accent/15 p-3 text-sm">{tr(locale, ...ok[sp.ok])}</p>}
      {sp.error && <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">{err[sp.error] ? tr(locale, ...err[sp.error]) : tr(locale, "Erreur.", "Error.")}</p>}
      <ListFilters locale={locale} path={path} q={q} tabs={tabs} defaultStatus="REQUESTED" />
      {list.length === 0 ? <p className="text-sm text-muted-foreground">{tr(locale, "Aucune demande de retour.", "No return request.")}</p> : (
        <ul className="divide-y rounded-lg border bg-card">
          {list.map((r) => (
            <li key={r.id} className="space-y-2 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong>{r.subOrder.number} · {eur(r.subOrder.subtotalCents)}</strong>
                <span className="text-muted-foreground">{fmt.format(r.createdAt)} · {RETURN_LABELS[r.status as ReturnStatus]?.[locale === "en" ? "en" : "fr"] ?? r.status}</span>
              </div>
              <p>{tr(locale, "Motif du client : ", "Customer reason: ")}{r.reason}</p>
              {r.adminNote && <p className="text-muted-foreground">{tr(locale, "Note : ", "Note: ")}{r.adminNote}</p>}
              {r.refundNote && <p className="text-destructive">{r.refundNote}</p>}
              {r.status === "REQUESTED" && (
                <form action={decideReturnAction} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="id" value={r.id} />
                  <label className="text-xs">{tr(locale, "Note (facultatif)", "Note (optional)")}<input name="note" className={`${inputCls} w-64`} /></label>
                  <button name="decision" value="ACCEPTED" className={buttonVariants({ className: "min-h-11" })}>{tr(locale, "Accepter", "Accept")}</button>
                  <button name="decision" value="REFUSED" className={buttonVariants({ variant: "outline", className: "min-h-11" })}>{tr(locale, "Refuser", "Refuse")}</button>
                </form>
              )}
              {r.status === "ACCEPTED" && (
                <div className="flex flex-wrap gap-2">
                  <form action={refundReturnAction}><input type="hidden" name="id" value={r.id} /><button className={buttonVariants({ className: "min-h-11" })}>{tr(locale, "Rembourser (Stripe)", "Refund (Stripe)")}</button></form>
                  <form action={refundReturnAction}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="manual" value="1" /><button className={buttonVariants({ variant: "outline", className: "min-h-11" })}>{tr(locale, "Marquer remboursé (manuel)", "Mark refunded (manual)")}</button></form>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <Pager locale={locale} path={path} q={q} total={total} defaultStatus="REQUESTED" />
    </>
  );
}
