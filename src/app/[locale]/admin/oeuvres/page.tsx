import { moderateProduct } from "../actions";
import { db } from "@/lib/db";
import { formatLocal, type Currency } from "@/lib/currency";
import { MOVEMENT_LABELS } from "@/lib/stock";
import { tr } from "@/lib/tr";
import type { Locale } from "@/lib/i18n";
import { inputCls } from "@/components/fournisseur/parts";

type Props = { params: Promise<{ locale: Locale }> };

export default async function AdminWorks({ params }: Props) {
  const { locale } = await params;
  const fr = locale !== "en";
  const [queueRaw, moves] = await Promise.all([
    db.product.findMany({ where: { status: "SUBMITTED" }, orderBy: { submittedAt: "asc" } }),
    db.stockMovement.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
  ]);
  const sups = await db.supplier.findMany({ where: { id: { in: queueRaw.map((p) => p.supplierId ?? "") } }, select: { id: true, displayName: true, country: true } });
  const queue = queueRaw.map((p) => ({ ...p, supplier: sups.find((s) => s.id === p.supplierId) }));
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h1 className="font-heading text-3xl text-primary">{tr(locale, "Œuvres à modérer", "Works to review")}</h1>
        {queue.length === 0 && <p className="text-sm text-muted-foreground">{tr(locale, "Aucune œuvre en attente.", "No works pending.")}</p>}
        {queue.map((p) => {
          const imgs = Array.isArray(p.images) ? (p.images as string[]) : [];
          return (
            <article key={p.slug} className="space-y-3 rounded-lg border p-4">
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
              <div className="flex flex-wrap items-end gap-3">
                <form action={moderateProduct}>
                  <input type="hidden" name="slug" value={p.slug} /><input type="hidden" name="decision" value="PUBLISHED" />
                  <button className="min-h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">{tr(locale, "Publier", "Publish")}</button>
                </form>
                <form action={moderateProduct} className="flex flex-1 flex-wrap items-end gap-2">
                  <input type="hidden" name="slug" value={p.slug} /><input type="hidden" name="decision" value="REJECTED" />
                  <label className="min-w-48 flex-1 text-sm">{tr(locale, "Motif du refus", "Rejection reason")}<input name="reason" required className={inputCls} /></label>
                  <button className="min-h-11 rounded-md border border-destructive px-4 text-sm text-destructive">{tr(locale, "Refuser", "Reject")}</button>
                </form>
              </div>
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
