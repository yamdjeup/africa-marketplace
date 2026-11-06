import Link from "next/link";
import { moderateProduct } from "../actions";
import { db } from "@/lib/db";
import { formatLocal, type Currency } from "@/lib/currency";
import { MOVEMENT_LABELS } from "@/lib/stock";
import { tr } from "@/lib/tr";
import type { Locale } from "@/lib/i18n";
import { inputCls } from "@/components/fournisseur/parts";

type Props = { params: Promise<{ locale: Locale }>; searchParams: Promise<{ f?: string }> };

const FILTERS: Record<string, { label: [string, string]; where: Record<string, unknown> }> = {
  pending: { label: ["En attente", "Pending"], where: { status: "SUBMITTED" } },
  published: { label: ["Publiées", "Published"], where: { status: "PUBLISHED", supplierId: { not: null } } },
  rejected: { label: ["Refusées", "Rejected"], where: { status: "REJECTED" } },
  all: { label: ["Toutes", "All"], where: { status: { in: ["SUBMITTED", "PUBLISHED", "REJECTED"] }, supplierId: { not: null } } },
};
const BADGE: Record<string, [string, string, string]> = {
  SUBMITTED: ["En attente", "Pending", "bg-amber-100 text-amber-900"],
  PUBLISHED: ["Publiée", "Published", "bg-emerald-100 text-emerald-900"],
  REJECTED: ["Refusée", "Rejected", "bg-red-100 text-red-900"],
};

export default async function AdminWorks({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const fkey = sp.f && FILTERS[sp.f] ? sp.f : "pending";
  const fr = locale !== "en";
  const [queueRaw, moves, counts] = await Promise.all([
    db.product.findMany({ where: FILTERS[fkey].where, orderBy: fkey === "pending" ? { submittedAt: "asc" } : { submittedAt: "desc" }, take: 100 }),
    db.stockMovement.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
    Promise.all(Object.entries(FILTERS).map(async ([k, v]) => [k, await db.product.count({ where: v.where })] as const)),
  ]);
  const sups = await db.supplier.findMany({ where: { id: { in: queueRaw.map((p) => p.supplierId ?? "") } }, select: { id: true, displayName: true, country: true } });
  const queue = queueRaw.map((p) => ({ ...p, supplier: sups.find((s) => s.id === p.supplierId) }));
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h1 className="font-heading text-3xl text-primary">{tr(locale, "Œuvres à modérer", "Works to review")}</h1>
        <nav aria-label={tr(locale, "Filtrer par statut", "Filter by status")} className="flex flex-wrap gap-2">
          {counts.map(([k, n]) => (
            <Link key={k} href={`/${locale}/admin/oeuvres?f=${k}`} aria-current={k === fkey ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-md border px-3 text-sm ${k === fkey ? "bg-primary text-primary-foreground" : ""}`}>
              {tr(locale, ...FILTERS[k].label)} ({n})
            </Link>
          ))}
        </nav>
        {queue.length === 0 && <p className="text-sm text-muted-foreground">{tr(locale, "Aucune œuvre dans cette liste.", "No works in this list.")}</p>}
        {queue.map((p) => {
          const imgs = Array.isArray(p.images) ? (p.images as string[]) : [];
          const badge = BADGE[p.status];
          return (
            <article key={p.slug} className="space-y-3 rounded-lg border p-4">
              {badge && (
                <p className="flex flex-wrap items-center gap-2 text-xs">
                  <span className={`rounded-full px-2 py-0.5 font-medium ${badge[2]}`}>{tr(locale, badge[0], badge[1])}</span>
                  {p.createdByAdmin && <span className="rounded-full bg-muted px-2 py-0.5">{tr(locale, "Saisie par l'administration", "Entered by administration")}</span>}
                  {p.decidedAt && <span className="text-muted-foreground">{tr(locale, "Décision le ", "Decided on ")}{p.decidedAt.toLocaleString(fr ? "fr-FR" : "en-GB")}</span>}
                </p>
              )}
              {p.status === "REJECTED" && p.rejectReason && <p className="text-sm text-destructive">{tr(locale, "Motif du refus : ", "Rejection reason: ")}{p.rejectReason}</p>}
              <div className="flex flex-wrap gap-2">
                {imgs.map((u) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={u} src={u} alt="" className="size-24 rounded-md object-cover" />
                ))}
              </div>
              <h2 className="font-semibold">{p.name} <span className="font-normal text-muted-foreground">/ {p.nameEn}</span></h2>
              <p className="text-sm text-muted-foreground">{p.supplier?.displayName} ({p.supplier?.country}) · {formatLocal(p.priceLocal ?? p.priceCents, p.currency as Currency, locale)} · stock {p.stock} · {p.categorySlug}</p>
              <p className="whitespace-pre-line text-sm">{p.description}</p>
              {(p.edition || p.signatureFileId || p.authorAttestedAt) && (
                <p className="text-xs text-muted-foreground">
                  {p.edition && `${tr(locale, "Édition", "Edition")} : ${p.edition} · `}
                  {p.authorAttestedAt && `${tr(locale, "Attestation d'auteur", "Author attestation")} ${p.authorAttestedAt.toLocaleString(fr ? "fr-FR" : "en-GB")} (${p.authorAttestedBy}) · `}
                  {p.signatureFileId && <a className="underline" href={`/api/media/${p.signatureFileId}`} target="_blank" rel="noreferrer">{tr(locale, "photo de signature", "signature photo")}</a>}
                </p>
              )}
              {(p.status === "SUBMITTED" || p.status === "PUBLISHED") && (
              <div className="flex flex-wrap items-end gap-3">
                {p.status === "SUBMITTED" && (
                <form action={moderateProduct}>
                  <input type="hidden" name="slug" value={p.slug} /><input type="hidden" name="decision" value="PUBLISHED" />
                  <button className="min-h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">{tr(locale, "Publier", "Publish")}</button>
                </form>
                )}
                <form action={moderateProduct} className="flex flex-1 flex-wrap items-end gap-2">
                  <input type="hidden" name="slug" value={p.slug} /><input type="hidden" name="decision" value="REJECTED" />
                  <label className="min-w-48 flex-1 text-sm">{tr(locale, "Motif du refus", "Rejection reason")}<input name="reason" required className={inputCls} /></label>
                  <button className="min-h-11 rounded-md border border-destructive px-4 text-sm text-destructive">{tr(locale, "Refuser", "Reject")}</button>
                </form>
              </div>
              )}
            </article>
          );
        })}
      </section>
      <section className="space-y-3">
        <h2 className="font-heading text-2xl text-primary">{tr(locale, "Derniers mouvements de stock", "Latest stock movements")}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b text-xs uppercase text-muted-foreground"><th className="py-2 pr-3">Date</th><th className="pr-3">{tr(locale, "Œuvre", "Work")}</th><th className="pr-3">Type</th><th className="pr-3">Qté</th><th className="pr-3">{tr(locale, "Motif", "Reason")}</th><th>{tr(locale, "Auteur", "Author")}</th></tr></thead>
            <tbody>{moves.map((m) => (
              <tr key={m.id} className="border-b">
                <td className="py-2 pr-3 whitespace-nowrap">{m.createdAt.toLocaleString(fr ? "fr-FR" : "en-GB")}</td>
                <td className="pr-3">{m.productSlug}</td>
                <td className="pr-3">{MOVEMENT_LABELS[m.type as keyof typeof MOVEMENT_LABELS]?.[fr ? "fr" : "en"] ?? m.type}</td>
                <td className="pr-3">{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</td>
                <td className="pr-3">{m.reason}</td><td>{m.authorLabel}</td>
              </tr>))}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
