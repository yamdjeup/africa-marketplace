import type { PrismaClient } from "@prisma/client";
import { PARTNER_RETURN_FILTERS, pageArgs, pageCount, parseList, partnerReturnsWhere, type ListParams } from "@/lib/admin-list";
import { returnLabel, partnerCheckDeadline } from "@/lib/returns";

export type PartnerReturnRow = {
  id: string; subOrderId: string; number: string; status: string; label: { fr: string; en: string }; reason: string; createdAt: string;
  condition: string | null; conditionNote: string | null; receivedAt: string | null; decideBy: string | null;
  decision: string | null; decisionNote: string | null; stage: "incoming" | "decide" | "accepted" | "refused" | "refunded";
};

/** Liste des retours d'un créateur avec compteurs par sous-onglet (mêmes filtres de période que l'administration). */
export async function partnerReturnList(db: PrismaClient, supplierId: string, sp: ListParams) {
  const q = parseList(sp, PARTNER_RETURN_FILTERS, "todo", ["createdAt"], "createdAt");
  const where = partnerReturnsWhere(q, supplierId);
  const total = await db.returnRequest.count({ where });
  q.page = Math.min(q.page, pageCount(total));
  const base = { ...q, q: "", from: null, to: null, d: "all" };
  const [rows, todo, accepted, refused, all] = await Promise.all([
    db.returnRequest.findMany({ where, include: { subOrder: { select: { number: true } } }, orderBy: { createdAt: q.asc ? "asc" : "desc" }, ...pageArgs(q.page) }),
    ...(["todo", "accepted", "refused", "all"] as const).map((st) => db.returnRequest.count({ where: partnerReturnsWhere({ ...base, st }, supplierId) })),
  ]);
  const items: PartnerReturnRow[] = rows.map((r) => ({
    id: r.id, subOrderId: r.subOrderId, number: r.subOrder.number, status: r.status,
    label: returnLabel(r),
    reason: r.reason, createdAt: r.createdAt.toISOString(), condition: r.condition, conditionNote: r.conditionNote,
    receivedAt: r.partnerReceivedAt ? r.partnerReceivedAt.toISOString() : null,
    decideBy: r.partnerReceivedAt ? partnerCheckDeadline(r.partnerReceivedAt).toISOString() : null,
    decision: r.partnerDecision, decisionNote: r.partnerDecisionNote,
    stage: r.status === "REFUNDED" ? "refunded" : r.status === "ACCEPTED" ? "incoming" : r.partnerDecision === "ACCEPTED" ? "accepted" : r.partnerDecision === "REFUSED" ? "refused" : "decide",
  }));
  return { q, total, items, counts: { todo, accepted, refused, all } };
}
