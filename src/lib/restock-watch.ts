import type { PrismaClient } from "@prisma/client";
import { renderEmailHtml, absoluteImageUrl } from "./email-layout";
import { siteUrl } from "./alerts-core";

// « Votre pièce est de nouveau disponible » : acheteurs dont la réservation n'a pas abouti ou qui ont été bloqués par une réservation.
type Line = { slug: string };

/** Mémorise (une seule fois par acheteur et pièce) l'intérêt d'un acheteur pour des pièces. */
export async function recordWatch(db: PrismaClient, o: { buyerKey: string; email: string; locale: string; slugs: string[]; source: "HOLD" | "BLOCKED" | "NOTIFY" }) {
  for (const productSlug of new Set(o.slugs)) {
    await db.restockWatch.upsert({ where: { buyerKey_productSlug: { buyerKey: o.buyerKey, productSlug } }, update: {}, create: { buyerKey: o.buyerKey, email: o.email, locale: o.locale === "en" ? "en" : "fr", productSlug, source: o.source } });
  }
}

export const watchSlugs = (lines: Line[]) => lines.map((l) => l.slug);

export function buildRestockEmail(o: { locale: "fr" | "en"; name: string; image?: string; slug: string; priceLabel: string }) {
  const fr = o.locale === "fr";
  const url = `${siteUrl()}/${o.locale}/produits/${o.slug}`;
  const title = fr ? "Votre pièce est de nouveau disponible" : "Your piece is available again";
  const body = fr ? `**${o.name}** (${o.priceLabel}) est de nouveau disponible.` : `**${o.name}** (${o.priceLabel}) is available again.`;
  const warn = fr ? "Les pièces sont uniques : premier arrivé, premier servi. La disponibilité n'est pas garantie." : "Pieces are unique: first come, first served. Availability is not guaranteed.";
  const subject = `E póm ta’ — ${title}`;
  const text = [body.replace(/\*\*/g, ""), warn, url].join("\n");
  const html = renderEmailHtml({
    locale: o.locale, title, paragraphs: [body, warn], cta: { label: fr ? "Voir la pièce" : "View the piece", url },
    summary: { items: [{ name: o.name, priceLabel: o.priceLabel, image: o.image ? absoluteImageUrl(o.image) : undefined, url }], rows: [] },
  });
  return { subject, text, html };
}

/** Envoie les avis pour les pièces de nouveau disponibles ; ignore favoris (déjà alertés), déjà achetées, stock à 0. Idempotent (notifiedAt). */
export async function notifyRestockWatches(db: PrismaClient, send: (to: string, m: ReturnType<typeof buildRestockEmail>) => Promise<boolean>, limit = 50) {
  const watches = await db.restockWatch.findMany({ where: { notifiedAt: null }, orderBy: { createdAt: "asc" }, take: 500 });
  const products = await db.product.findMany({ where: { slug: { in: [...new Set(watches.map((w) => w.productSlug))] }, status: "PUBLISHED" } });
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  let sent = 0;
  for (const w of watches) {
    const p = bySlug.get(w.productSlug);
    if (!p || p.stock - p.reserved <= 0) continue;
    if (sent >= limit) break;
    const user = w.buyerKey.startsWith("u:") ? w.buyerKey.slice(2) : (await db.user.findFirst({ where: { email: w.email }, select: { id: true } }))?.id;
    const fav = user ? await db.favorite.findUnique({ where: { userId_productSlug: { userId: user, productSlug: w.productSlug } } }) : null;
    const bought = await db.orderItem.count({ where: { productSlug: w.productSlug, order: { email: w.email, archivedAt: null } } });
    if (fav || bought > 0) {
      await db.restockWatch.update({ where: { id: w.id }, data: { notifiedAt: new Date() } });
      continue;
    }
    const loc = w.locale === "en" ? "en" : "fr";
    const price = new Intl.NumberFormat(loc === "fr" ? "fr-FR" : "en-GB", { style: "currency", currency: "EUR" }).format(p.priceCents / 100);
    const image = Array.isArray(p.images) ? (p.images as string[])[0] : undefined;
    const claimed = await db.restockWatch.updateMany({ where: { id: w.id, notifiedAt: null }, data: { notifiedAt: new Date() } });
    if (claimed.count !== 1) continue;
    const ok = await send(w.email, buildRestockEmail({ locale: loc, name: loc === "en" ? p.nameEn : p.name, image, slug: p.slug, priceLabel: price })).catch(() => false);
    if (ok) sent++;
    else await db.restockWatch.update({ where: { id: w.id }, data: { notifiedAt: null } });
  }
  return sent;
}
