import { queryPartnerWorks, type PWorkParams } from "@/lib/partner-works";
import { waitHours, waitLabel, CSV_STATUS, parisFmt, categoryLabels } from "@/lib/admin-works";
import { getPortalContext } from "@/lib/supplier";

export const runtime = "nodejs";

const cell = (v: unknown) => {
  let t = String(v ?? "").replace(/\r?\n/g, " ");
  if (/^[=+\-@]/.test(t)) t = `'${t}`;
  return `"${t.replace(/"/g, '""')}"`;
};

// Export CSV de la vue filtrée, limité aux créations du partenaire connecté.
export async function GET(req: Request) {
  const ctx = await getPortalContext();
  if (!ctx) return new Response("forbidden", { status: 403 });
  const sp = Object.fromEntries(new URL(req.url).searchParams) as PWorkParams;
  const [{ list }, cats] = await Promise.all([queryPartnerWorks(ctx.supplier.id, sp, { all: true }), categoryLabels()]);
  const fmt = parisFmt;
  const anyWait = list.some((w) => w.status === "SUBMITTED");
  const head = ["Création", "Catégorie", "Prix (EUR)", "Stock", "Statut", ...(anyWait ? ["En attente depuis", "Durée d'attente"] : []), "Date de décision", "Motif du refus"];
  const rows = list.map((w) => [w.name, cats.get(w.categorySlug) ?? w.categorySlug, (w.priceCents / 100).toFixed(2), w.stock - w.reserved, CSV_STATUS[w.status] ?? w.status, ...(anyWait ? [w.status === "SUBMITTED" ? fmt(w.submittedAt ?? w.createdAt) : "", w.status === "SUBMITTED" ? waitLabel(waitHours(w.submittedAt ?? w.createdAt)) : ""] : []), fmt(w.decidedAt), w.rejectReason ?? ""]);
  const csv = "\uFEFF" + [head, ...rows].map((r) => r.map(cell).join(";")).join("\r\n");
  return new Response(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="mes-creations.csv"' } });
}
