import { auth } from "@/auth";
import { queryWorks, tabOf, waitHours, waitLabel, type WorkParams } from "@/lib/admin-works";
import { isAdminEmail } from "@/lib/supplier";

export const runtime = "nodejs";

const cell = (v: unknown) => {
  let t = String(v ?? "").replace(/\r?\n/g, " ");
  if (/^[=+\-@]/.test(t)) t = `'${t}`;
  return `"${t.replace(/"/g, '""')}"`;
};

// Export CSV de la vue filtrée (mêmes paramètres que la page), admin uniquement.
export async function GET(req: Request) {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) return new Response("forbidden", { status: 403 });
  const sp = Object.fromEntries(new URL(req.url).searchParams) as WorkParams;
  const { list } = await queryWorks(sp, tabOf(sp.f), { all: true });
  const fmt = (d: Date | null) => (d ? d.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "");
  const head = ["Partenaire", "Création", "Categorie", "Prix EUR", "Stock", "Statut", "En attente depuis", "Duree d'attente", "Date de decision", "Motif du refus", "Saisie par l'administration", "Description"];
  const rows = list.map((w) => [w.partner, w.name, w.categorySlug, (w.priceCents / 100).toFixed(2), w.stock - w.reserved, w.status, w.status === "SUBMITTED" ? fmt(w.submittedAt) : "", w.status === "SUBMITTED" ? waitLabel(waitHours(w.submittedAt)) : "", fmt(w.decidedAt), w.rejectReason ?? "", w.createdByAdmin ? "oui" : "non", w.description]);
  const csv = "\uFEFF" + [head, ...rows].map((r) => r.map(cell).join(";")).join("\r\n");
  return new Response(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="creations.csv"' } });
}
