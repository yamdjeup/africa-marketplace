import { createHmac, timingSafeEqual } from "node:crypto";

export type AlertKind = "price" | "last" | "restock";

// Compare le dernier état notifié à l'état courant ; un seul avis par changement.
export function detectAlert(prev: { priceCents: number; stock: number }, cur: { priceCents: number; stock: number }): AlertKind | null {
  if (prev.stock <= 0 && cur.stock > 0) return "restock";
  if (cur.priceCents < prev.priceCents) return "price";
  if (cur.stock === 1 && prev.stock > 1) return "last";
  return null;
}

const secret = () => process.env.AUTH_SECRET || "dev-only-secret";

export function unsubToken(userId: string): string {
  return createHmac("sha256", secret()).update(`alerts:${userId}`).digest("hex").slice(0, 32);
}

export function verifyUnsubToken(userId: string, token: string): boolean {
  const a = Buffer.from(unsubToken(userId));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.AUTH_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function unsubUrl(userId: string, locale: "fr" | "en"): string {
  return `${siteUrl()}/api/alerts/unsubscribe?u=${encodeURIComponent(userId)}&t=${unsubToken(userId)}&lang=${locale}`;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export type AlertItem = { slug: string; name: string; creatorName: string; priceCents: number; kind?: AlertKind };

const T = {
  fr: {
    price: "baisse de prix",
    last: "dernière pièce disponible",
    restock: "de retour en stock",
    favSubject: "Une de vos pièces favorites a bougé",
    favIntro: "Du nouveau sur vos favoris :",
    newSubject: "Nouvelles pièces sur E póm ta’",
    newIntro: "Découvrez les dernières pièces arrivées :",
    unsub: "Se désinscrire de ces e-mails",
    testSubject: "E-mail de test — alertes E póm ta’",
    testBody: "Ceci est un e-mail de test : vos alertes fonctionnent.",
    demo: "Démonstration privée — prix fictifs.",
  },
  en: {
    price: "price drop",
    last: "last piece available",
    restock: "back in stock",
    favSubject: "One of your favourite pieces has changed",
    favIntro: "News about your favourites:",
    newSubject: "New pieces on E póm ta’",
    newIntro: "Discover the latest arrivals:",
    unsub: "Unsubscribe from these emails",
    testSubject: "Test email — E póm ta’ alerts",
    testBody: "This is a test email: your alerts work.",
    demo: "Private demonstration — fictional prices.",
  },
};

export function buildAlertEmail(o: { kind: "favorites" | "new" | "test"; locale: "fr" | "en"; userId: string; items?: AlertItem[] }) {
  const t = T[o.locale];
  const money = (c: number) => new Intl.NumberFormat(o.locale === "fr" ? "fr-FR" : "en-GB", { style: "currency", currency: "EUR" }).format(c / 100);
  const unsub = unsubUrl(o.userId, o.locale);
  const items = o.items ?? [];
  const line = (i: AlertItem) => `${i.creatorName} — ${i.name} (${money(i.priceCents)})${i.kind ? ` : ${t[i.kind]}` : ""}`;
  const url = (i: AlertItem) => `${siteUrl()}/${o.locale}/produits/${i.slug}`;
  const subject = o.kind === "test" ? t.testSubject : o.kind === "new" ? t.newSubject : t.favSubject;
  const intro = o.kind === "test" ? t.testBody : o.kind === "new" ? t.newIntro : t.favIntro;
  const text = [intro, "", ...items.map((i) => `- ${line(i)}\n  ${url(i)}`), "", `${t.unsub} : ${unsub}`, t.demo].join("\n");
  const html = `<div style="font-family:Georgia,serif;color:#1c3060;background:#faf6ee;padding:24px;max-width:560px">
<h1 style="font-size:22px;margin:0 0 16px">E póm ta’</h1><p>${esc(intro)}</p>
<ul>${items.map((i) => `<li><a href="${esc(url(i))}">${esc(line(i))}</a></li>`).join("")}</ul>
<p style="font-size:12px;opacity:.7">${esc(t.demo)} <a href="${esc(unsub)}">${esc(t.unsub)}</a></p></div>`;
  return { subject, text, html, headers: { "List-Unsubscribe": `<${unsub}>` } };
}
