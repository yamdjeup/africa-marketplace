import "server-only";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { buildAlertEmail, detectAlert, type AlertItem } from "@/lib/alerts-core";

const MAX_EMAILS_PER_RUN = 100;

export async function runAlerts(limit = MAX_EMAILS_PER_RUN) {
  let sent = 0;
  let failed = 0;
  const send = async (to: string, msg: ReturnType<typeof buildAlertEmail>) => {
    const ok = await sendEmail({ to, ...msg });
    if (ok) sent++;
    else failed++;
    return ok;
  };

  // 1) Favoris : baisse de prix, dernière pièce, retour en stock.
  const favs = await db.favorite.findMany({ where: { user: { alertFavorites: true } }, include: { user: true } });
  const products = await db.product.findMany({ where: { slug: { in: [...new Set(favs.map((f) => f.productSlug))] } }, include: { creator: true } });
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const perUser = new Map<string, { email: string; items: AlertItem[]; keys: { slug: string; priceCents: number; stock: number }[] }>();
  for (const f of favs) {
    const p = bySlug.get(f.productSlug);
    if (!p) continue;
    const kind = detectAlert({ priceCents: f.lastPriceCents, stock: f.lastStock }, { priceCents: p.priceCents, stock: p.stock });
    if (!kind) continue;
    const e = perUser.get(f.userId) ?? { email: f.user.email, items: [], keys: [] };
    e.items.push({ slug: p.slug, name: p.name, creatorName: p.creator.name, priceCents: p.priceCents, kind });
    e.keys.push({ slug: p.slug, priceCents: p.priceCents, stock: p.stock });
    perUser.set(f.userId, e);
  }
  for (const [userId, e] of perUser) {
    if (sent + failed >= limit) break;
    if (await send(e.email, buildAlertEmail({ kind: "favorites", locale: "fr", userId, items: e.items }))) {
      for (const k of e.keys) await db.favorite.update({ where: { userId_productSlug: { userId, productSlug: k.slug } }, data: { lastPriceCents: k.priceCents, lastStock: k.stock } });
    }
  }
  // Les états sans changement notifiable sont resynchronisés (ex. hausse de prix) pour ne pas déclencher d'avis tardif.
  for (const f of favs) {
    const p = bySlug.get(f.productSlug);
    if (p && !perUser.has(f.userId) && (p.priceCents !== f.lastPriceCents || p.stock !== f.lastStock)) {
      await db.favorite.update({ where: { userId_productSlug: { userId: f.userId, productSlug: f.productSlug } }, data: { lastPriceCents: p.priceCents, lastStock: p.stock } });
    }
  }

  // 2) Nouvelles pièces pour les abonnés promotions.
  const subs = await db.user.findMany({ where: { alertPromo: true, promoSince: { not: null } } });
  for (const u of subs) {
    if (sent + failed >= limit) break;
    const fresh = await db.product.findMany({ where: { createdAt: { gt: u.promoSince! }, stock: { gt: 0 } }, include: { creator: true }, orderBy: { createdAt: "desc" }, take: 8 });
    if (fresh.length === 0) continue;
    const items = fresh.map((p) => ({ slug: p.slug, name: p.name, creatorName: p.creator.name, priceCents: p.priceCents }));
    if (await send(u.email, buildAlertEmail({ kind: "new", locale: "fr", userId: u.id, items }))) {
      await db.user.update({ where: { id: u.id }, data: { promoSince: new Date() } });
    }
  }
  return { sent, failed };
}
