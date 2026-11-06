"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { slugify } from "@/lib/category-rules";
import { isCurrency, toEurCents, toMinor, type Currency } from "@/lib/currency";
import { db } from "@/lib/db";
import { adjustStock, syncProductTotals } from "@/lib/stock";
import { notifyLowStock } from "@/lib/stock-alerts";
import { getPortalContext } from "@/lib/supplier";
import { emailAdminProductSubmitted } from "@/lib/supplier-email";

const s = (f: FormData, k: string, max = 4000) => String(f.get(k) ?? "").trim().slice(0, max);
const loc = (f: FormData) => (s(f, "locale") === "en" ? "en" : "fr");
const int = (f: FormData, k: string) => {
  const n = Number(s(f, k, 12).replace(",", "."));
  return Number.isFinite(n) ? Math.trunc(n) : NaN;
};
const num = (f: FormData, k: string) => {
  const v = s(f, k, 12).replace(",", ".");
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

const ART_CATEGORIES = ["peinture", "sculpture", "photographie"];

async function requirePartner(locale: string) {
  const ctx = await getPortalContext();
  if (!ctx) redirect(`/${locale}/fournisseur`);
  if (ctx.viewingAs || !ctx.supplier.userId) redirect(`/${locale}/fournisseur/oeuvres?error=readonly`);
  const session = await auth();
  return { supplier: ctx.supplier, userId: ctx.supplier.userId, session };
}

async function ownedProduct(slug: string, supplierId: string) {
  const p = await db.product.findUnique({ where: { slug } });
  return p && p.supplierId === supplierId ? p : null;
}

// Garde uniquement les URL /api/media/<id> appartenant au compte (aucune URL externe).
async function ownedUrls(raw: string, userId: string, max: number) {
  let list: unknown = [];
  try {
    list = JSON.parse(raw);
  } catch {}
  const urls = (Array.isArray(list) ? list : []).map(String).filter((u) => /^\/api\/media\/[\w-]+$/.test(u)).slice(0, max);
  if (urls.length === 0) return [];
  const ids = urls.map((u) => u.split("/").pop()!);
  const rows = await db.mediaFile.findMany({ where: { id: { in: ids }, ownerUserId: userId }, select: { id: true } });
  const ok = new Set(rows.map((r) => r.id));
  return urls.filter((u) => ok.has(u.split("/").pop()!));
}

async function ensureCreator(supplier: { id: string; displayName: string; bio: string; bioEn: string; craftType: string; creatorSlug: string | null }) {
  if (supplier.creatorSlug) return supplier.creatorSlug;
  const base = slugify(supplier.displayName) || "partenaire";
  let slug = base;
  while (await db.creator.findUnique({ where: { slug } })) slug = `${base}-${randomBytes(2).toString("hex")}`;
  await db.creator.create({
    data: { slug, name: supplier.displayName, specialty: supplier.craftType, specialtyEn: supplier.craftType, bio: supplier.bio, bioEn: supplier.bioEn || supplier.bio, image: "", sourceUrl: "" },
  });
  await db.supplier.update({ where: { id: supplier.id }, data: { creatorSlug: slug } });
  return slug;
}

export async function saveProduct(formData: FormData) {
  const locale = loc(formData);
  const { supplier, userId, session } = await requirePartner(locale);
  const slugIn = s(formData, "slug", 120);
  const existing = slugIn ? await ownedProduct(slugIn, supplier.id) : null;
  if (slugIn && !existing) redirect(`/${locale}/fournisseur/oeuvres`);
  const back = existing ? `/${locale}/fournisseur/oeuvres/${existing.slug}` : `/${locale}/fournisseur/oeuvres/nouvelle`;
  const fail = (code: string) => redirect(`${back}?error=${code}`);

  const name = s(formData, "name", 140);
  const nameEn = s(formData, "nameEn", 140) || name;
  const description = s(formData, "description", 4000);
  const descriptionEn = s(formData, "descriptionEn", 4000) || description;
  const categorySlug = s(formData, "category", 60);
  const intent = s(formData, "intent", 10) === "submit" ? "submit" : "draft";
  if (!name || !(await db.category.findUnique({ where: { slug: categorySlug } }))) fail("invalid");

  const currencyRaw = s(formData, "currency", 5);
  const currency: Currency = isCurrency(currencyRaw) ? currencyRaw : "EUR";
  const price = num(formData, "price");
  if (price === null || price <= 0 || price > 10_000_000) fail("price");
  const priceLocal = toMinor(price!, currency);
  const priceCents = toEurCents(priceLocal, currency);
  if (priceCents < 100) fail("price");

  const photos = await ownedUrls(s(formData, "photos", 4000), userId, 6);
  if (intent === "submit" && (photos.length === 0 || description.length < 20)) fail("incomplete");

  const isArt = ART_CATEGORIES.includes(categorySlug);
  const edition = isArt ? s(formData, "edition", 40) || null : null;
  const signaturePhoto = isArt ? (await ownedUrls(s(formData, "signaturePhoto", 400), userId, 1))[0]?.split("/").pop() ?? null : null;
  const attest = isArt && formData.get("attest") === "on";

  const data = {
    name,
    nameEn,
    description,
    descriptionEn,
    story: s(formData, "story", 4000),
    storyEn: s(formData, "storyEn", 4000) || s(formData, "story", 4000),
    categorySlug,
    priceCents,
    priceLocal,
    currency,
    material: s(formData, "material", 80) || null,
    materialEn: s(formData, "material", 80) || null,
    widthCm: num(formData, "widthCm"),
    heightCm: num(formData, "heightCm"),
    depthCm: num(formData, "depthCm"),
    weightG: (() => {
      const w = num(formData, "weightG");
      return w === null ? null : Math.round(w);
    })(),
    lowStockThreshold: Math.max(0, Math.min(50, Number.isFinite(int(formData, "lowStock")) ? int(formData, "lowStock") : 1)),
    images: photos,
    country: supplier.country,
    countryEn: supplier.country,
    edition,
    signatureFileId: signaturePhoto,
  };
  const attestData = attest && !existing?.authorAttestedAt ? { authorAttestedAt: new Date(), authorAttestedBy: `${session?.user?.name ?? supplier.displayName} <${session?.user?.email ?? ""}>` } : !attest && isArt ? { authorAttestedAt: null, authorAttestedBy: null } : {};

  let slug = existing?.slug ?? "";
  if (existing) {
    const nextStatus = intent === "submit" && (existing.status === "DRAFT" || existing.status === "REJECTED") ? "SUBMITTED" : existing.status;
    await db.product.update({ where: { slug }, data: { ...data, ...attestData, status: nextStatus, submittedAt: nextStatus === "SUBMITTED" && existing.status !== "SUBMITTED" ? new Date() : existing.submittedAt, rejectReason: nextStatus === "SUBMITTED" ? null : existing.rejectReason } });
    if (nextStatus === "SUBMITTED" && existing.status !== "SUBMITTED") await emailAdminProductSubmitted(supplier.displayName, name);
  } else {
    const creatorSlug = await ensureCreator(supplier);
    slug = `${slugify(name).slice(0, 40) || "oeuvre"}-${randomBytes(2).toString("hex")}`;
    // Stock initial : variantes « libellé: quantité » (une par ligne) ou quantité unique (pièce unique = 1).
    const variants = s(formData, "variants", 2000)
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 40)
      .map((l) => {
        const i = l.lastIndexOf(":");
        const label = (i > 0 ? l.slice(0, i) : l).trim().slice(0, 60);
        const qty = i > 0 ? Math.trunc(Number(l.slice(i + 1).replace(",", "."))) : 1;
        return { label, qty };
      });
    if (variants.some((v) => !v.label || !Number.isFinite(v.qty) || v.qty < 0 || v.qty > 100000) || new Set(variants.map((v) => v.label)).size !== variants.length) fail("variants");
    const unique = formData.get("unique") === "on";
    const stock = unique ? 1 : int(formData, "stock");
    if (variants.length === 0 && (!Number.isFinite(stock) || stock < 0 || stock > 100000)) fail("stock");
    const total = variants.length > 0 ? variants.reduce((n, v) => n + v.qty, 0) : stock;
    const actor = session?.user?.email ?? supplier.displayName;
    await db.$transaction(async (tx) => {
      await tx.product.create({
        data: {
          ...data,
          ...attestData,
          slug,
          creatorSlug,
          supplierId: supplier.id,
          status: intent === "submit" ? "SUBMITTED" : "DRAFT",
          submittedAt: intent === "submit" ? new Date() : null,
          materials: [],
          sizes: variants.map((v) => v.label),
          stock: total,
          hasCertificate: false,
          edition: edition ?? (unique && isArt ? "Pièce unique" : null),
        },
      });
      for (const v of variants) {
        const row = await tx.productVariant.create({ data: { productSlug: slug, label: v.label, stock: v.qty } });
        if (v.qty > 0) await tx.stockMovement.create({ data: { productSlug: slug, variantId: row.id, type: "ENTRY", quantity: v.qty, reason: "Stock initial", authorId: userId, authorLabel: actor } });
      }
      if (variants.length === 0 && total > 0) await tx.stockMovement.create({ data: { productSlug: slug, type: "ENTRY", quantity: total, reason: "Stock initial", authorId: userId, authorLabel: actor } });
    });
    if (intent === "submit") await emailAdminProductSubmitted(supplier.displayName, name);
  }
  revalidatePath("/[locale]/fournisseur/oeuvres", "page");
  redirect(`/${locale}/fournisseur/oeuvres/${slug}?saved=${intent}`);
}

export async function submitProduct(formData: FormData) {
  const locale = loc(formData);
  const { supplier } = await requirePartner(locale);
  const p = await ownedProduct(s(formData, "slug", 120), supplier.id);
  const back = `/${locale}/fournisseur/oeuvres`;
  if (!p) redirect(back);
  if ((p.status !== "DRAFT" && p.status !== "REJECTED") || (Array.isArray(p.images) ? p.images.length : 0) === 0 || p.description.length < 20) redirect(`${back}/${p.slug}?error=incomplete`);
  await db.product.update({ where: { slug: p.slug }, data: { status: "SUBMITTED", submittedAt: new Date(), rejectReason: null } });
  await emailAdminProductSubmitted(supplier.displayName, p.name);
  redirect(`${back}?saved=submit`);
}

export async function deleteProduct(formData: FormData) {
  const locale = loc(formData);
  const { supplier } = await requirePartner(locale);
  const p = await ownedProduct(s(formData, "slug", 120), supplier.id);
  const back = `/${locale}/fournisseur/oeuvres`;
  if (!p) redirect(back);
  const sold = await db.orderItem.count({ where: { productSlug: p.slug } });
  if (sold > 0 || p.status === "PUBLISHED" || p.status === "SUBMITTED") redirect(`${back}/${p.slug}?error=undeletable`);
  await db.stockMovement.deleteMany({ where: { productSlug: p.slug } });
  await db.product.delete({ where: { slug: p.slug } });
  redirect(`${back}?saved=deleted`);
}

// Entrée de stock ou correction manuelle, avec motif (historique visible par le partenaire et l'admin).
export async function adjustStockAction(formData: FormData) {
  const locale = loc(formData);
  const { supplier, userId, session } = await requirePartner(locale);
  const p = await ownedProduct(s(formData, "slug", 120), supplier.id);
  const back = (q: string) => `/${locale}/fournisseur/oeuvres/${p?.slug ?? ""}?${q}#stock`;
  if (!p) redirect(`/${locale}/fournisseur/oeuvres`);
  const type = s(formData, "type", 8) === "ENTRY" ? "ENTRY" : "ADJUST";
  let delta = int(formData, "delta");
  if (!Number.isFinite(delta) || delta === 0 || Math.abs(delta) > 100000) redirect(back("error=delta"));
  if (type === "ENTRY") delta = Math.abs(delta);
  const reason = s(formData, "reason", 200) || (type === "ENTRY" ? "Entrée de stock" : "");
  if (!reason) redirect(back("error=reason"));
  const before = new Map([[p.slug, p.stock - p.reserved]]);
  const ok = await db.$transaction((tx) => adjustStock(tx, { slug: p.slug, label: s(formData, "variant", 60) || null }, delta, type, reason, { id: userId, label: session?.user?.email ?? supplier.displayName }));
  if (!ok) redirect(back("error=below"));
  if (delta < 0) await notifyLowStock(before).catch(() => undefined);
  revalidatePath("/[locale]/fournisseur/oeuvres", "page");
  redirect(back("saved=stock"));
}

export async function addVariantAction(formData: FormData) {
  const locale = loc(formData);
  const { supplier, userId, session } = await requirePartner(locale);
  const p = await ownedProduct(s(formData, "slug", 120), supplier.id);
  if (!p) redirect(`/${locale}/fournisseur/oeuvres`);
  const label = s(formData, "label", 60);
  const qty = int(formData, "qty");
  const back = (q: string) => `/${locale}/fournisseur/oeuvres/${p.slug}?${q}#stock`;
  if (!label || !Number.isFinite(qty) || qty < 0 || qty > 100000) redirect(back("error=variants"));
  if (await db.productVariant.findFirst({ where: { productSlug: p.slug, label } })) redirect(back("error=variants"));
  await db.$transaction(async (tx) => {
    // Première variante : le stock existant de l'œuvre est conservé dans une variante « Standard ».
    if ((await tx.productVariant.count({ where: { productSlug: p.slug } })) === 0 && p.stock > 0) {
      await tx.productVariant.create({ data: { productSlug: p.slug, label: "Standard", stock: p.stock, reserved: p.reserved } });
    }
    const row = await tx.productVariant.create({ data: { productSlug: p.slug, label, stock: qty } });
    if (qty > 0) await tx.stockMovement.create({ data: { productSlug: p.slug, variantId: row.id, type: "ENTRY", quantity: qty, reason: `Nouvelle variante ${label}`, authorId: userId, authorLabel: session?.user?.email ?? supplier.displayName } });
    await syncProductTotals(tx, p.slug);
  });
  revalidatePath("/[locale]/fournisseur/oeuvres", "page");
  redirect(back("saved=stock"));
}
