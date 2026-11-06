import { queryPartnerWorks, type PWorkParams } from "@/lib/partner-works";
import { waitHours, waitLabel } from "@/lib/admin-works";
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
  const { list } = await queryPartnerWorks(ctx.supplier.id, sp, { all: true });
  const fmt = (d: Date | null) => (d ? d.toLocaleString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "");
  const head = ["Création", "Categorie", "Prix EUR", "Stock", "Statut", "En attente depuis", "Duree d'attente", "Date de decision", "Motif du refus"];
  const rows = list.map((w) => [w.name, w.categorySlug, (w.priceCents / 100).toFixed(2), w.stock - w.reserved, w.status, w.status === "SUBMITTED" ? fmt(w.submittedAt ?? w.createdAt) : "", w.status === "SUBMITTED" ? waitLabel(waitHours(w.submittedAt ?? w.createdAt)) : "", fmt(w.decidedAt), w.rejectReason ?? ""]);
  const csv = "\uFEFF" + [head, ...rows].map((r) => r.map(cell).join(";")).join("\r\n");
  return new Response(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="mes-creations.csv"' } });
}
