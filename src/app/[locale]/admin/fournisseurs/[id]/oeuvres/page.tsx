import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { db } from "@/lib/db";
import type { Locale } from "@/lib/i18n";
import { tr } from "@/lib/tr";

export const dynamic = "force-dynamic";

const STATUS: Record<string, [string, string]> = {
  DRAFT: ["Brouillon", "Draft"],
  SUBMITTED: ["En attente", "Pending"],
  PUBLISHED: ["Publiée", "Published"],
  REJECTED: ["Refusée", "Rejected"],
  HELD: ["Suspendue", "Held"],
};

export default async function AdminPartnerWorksPage({ params, searchParams }: { params: Promise<{ locale: Locale; id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { locale, id } = await params;
  const sp = await searchParams;
  const supplier = await db.supplier.findUnique({ where: { id } });
  if (!supplier || supplier.isDemo) notFound();
  const works = await db.product.findMany({ where: { supplierId: id }, orderBy: { createdAt: "desc" }, select: { slug: true, name: true, nameEn: true, status: true, stock: true, reserved: true, createdByAdmin: true } });
  const slugs = new Set(works.map((w) => w.slug));
  const holds = (await db.checkoutHold.findMany({ where: { status: "HELD", expiresAt: { gt: new Date() } }, orderBy: { expiresAt: "asc" } }))
    .map((h) => ({ h, p: h.payload as unknown as { email?: string; lines?: { slug: string; quantity: number; size?: string | null }[] } }))
    .filter(({ p }) => (p.lines ?? []).some((l) => slugs.has(l.slug)));
  const tm = (d: Date) => d.toLocaleTimeString(locale === "en" ? "en-GB" : "fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });
  const owner = supplier.userId ? await db.user.findUnique({ where: { id: supplier.userId }, select: { email: true } }) : null;
  const fr = locale !== "en";
  const active = supplier.status === "ACTIVE";
  return (
    <div className="space-y-4">
      <Link href={`/${locale}/admin/fournisseurs`} className="text-sm underline">← {tr(locale, "Partenaires", "Partners")}</Link>
      <h1 className="font-heading text-3xl text-primary">{tr(locale, "Créations de", "Creations by")} {supplier.displayName}</h1>
      {owner?.email && <p className="text-sm text-muted-foreground">{owner.email}</p>}
      {sp.saved && <p role="status" className="rounded-md border border-accent bg-accent/15 p-3 text-sm">{sp.saved === "publish" ? tr(locale, "Création publiée.", "Creation published.") : sp.saved === "submit" ? tr(locale, "Création envoyée en modération.", "Creation sent to moderation.") : tr(locale, "Brouillon enregistré.", "Draft saved.")}</p>}
      {active ? (
        <Link href={`/${locale}/admin/fournisseurs/${id}/oeuvres/nouvelle`} className={buttonVariants({ className: "min-h-11" })}>{tr(locale, "Nouvelle création au nom du partenaire", "New creation on behalf of the partner")}</Link>
      ) : <p className="text-sm text-muted-foreground">{tr(locale, "Partenaire non actif : saisie impossible.", "Partner not active: entry disabled.")}</p>}
      {works.length === 0 ? <p className="rounded-md border p-4 text-sm text-muted-foreground">{tr(locale, "Aucune création pour le moment.", "No creations yet.")}</p> : (
        <ul className="divide-y rounded-lg border">
          {works.map((w) => (
            <li key={w.slug} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
              <span>
                <strong>{fr ? w.name : w.nameEn}</strong>
                <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">{STATUS[w.status]?.[fr ? 0 : 1] ?? w.status}</span>
                {w.createdByAdmin && <span className="ml-2 text-xs text-muted-foreground">{tr(locale, "Saisie par l'administration", "Entered by administration")}</span>}
              </span>
              <span className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span>{tr(locale, "Stock total", "Total stock")} {w.stock}</span>
                <span>{tr(locale, "Réservé", "Reserved")} {w.reserved}</span>
                <span>{tr(locale, "Dispo.", "Avail.")} <strong className="text-foreground">{w.stock - w.reserved}</strong></span>
                <Link href={`/${locale}/admin/stock?q=${encodeURIComponent(w.slug)}`} className="underline">{tr(locale, "Journal du stock", "Stock log")}</Link>
              </span>
              {holds.some(({ p }) => (p.lines ?? []).some((l) => l.slug === w.slug)) && (
                <ul className="basis-full space-y-0.5 text-xs text-muted-foreground">
                  {holds.filter(({ p }) => (p.lines ?? []).some((l) => l.slug === w.slug)).map(({ h, p }) => (
                    <li key={h.id}>{tr(locale, "Réservation en cours", "Active hold")} {h.number} · {p.email ?? "—"} · {(p.lines ?? []).filter((l) => l.slug === w.slug).reduce((n, l) => n + l.quantity, 0)} · {tr(locale, "expire à", "expires at")} {tm(h.expiresAt)}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
      <Link href={`/${locale}/admin/stock?sup=${id}`} className="text-sm underline">{tr(locale, "Journal des mouvements de stock de ce partenaire", "This partner's stock movement log")}</Link>
      <p className="text-xs text-muted-foreground">{tr(locale, "La modification se fait ensuite dans l'espace du partenaire (stock, signature, attestation).", "Further edits are made in the partner's own space (stock, signature, attestation).")}</p>
    </div>
  );
}
