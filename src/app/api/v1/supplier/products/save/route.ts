import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { slugify } from "@/lib/category-rules";
import { isCurrency, toEurCents, toMinor, type Currency } from "@/lib/currency";
import { db } from "@/lib/db";
import { supplierFromRequest } from "@/lib/mobile-supplier";
import { ensureCreator } from "@/lib/partner-creator";
import { emailAdminProductSubmitted } from "@/lib/supplier-email";
import { translateTexts, type Lang } from "@/lib/translate";
import { userFromRequest } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";

const ART = ["peinture", "sculpture", "photographie"];

// CatÃ©gories + (si ?slug=) fiche de l'Å“uvre Ã  modifier, limitÃ©e au fournisseur du jeton.
export async function GET(req: Request) {
  const sup = await supplierFromRequest(req);
  if (!sup) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const categories = await db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { slug: true, name: true, nameEn: true } });
  const slug = new URL(req.url).searchParams.get("slug");
  let product = null;
  if (slug) {
    const p = await db.product.findUnique({ where: { slug } });
    if (!p || p.supplierId !== sup.id) return NextResponse.json({ error: "notfound" }, { status: 404 });
    product = {
      slug: p.slug, status: p.status, sourceLang: p.sourceLang, name: p.name, nameEn: p.nameEn, description: p.description, descriptionEn: p.descriptionEn,
      categorySlug: p.categorySlug, price: (p.priceLocal ?? p.priceCents) / 100, currency: p.currency, material: p.material ?? "", widthCm: p.widthCm, heightCm: p.heightCm, depthCm: p.depthCm, weightG: p.weightG,
      edition: p.edition ?? "", images: Array.isArray(p.images) ? p.images : [], attested: !!p.authorAttestedAt,
    };
  }
  return NextResponse.json({ categories, product });
}

const numOrNull = (v: unknown) => {
  if (v === "" || v == null) return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : null;
};

// MÃªmes validations que saveProduct (fournisseur/oeuvres-actions.ts) : texte, catÃ©gorie, prix, photos du compte, attestation pour l'art.
export async function POST(req: Request) {
  const sup = await supplierFromRequest(req);
  const user = await userFromRequest(req);
  if (!sup || !sup.userId || !user) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const str = (k: string, max: number) => String(b[k] ?? "").trim().slice(0, max);
  const bad = (error: string) => NextResponse.json({ error }, { status: 400 });

  const slugIn = str("slug", 120);
  const existing = slugIn ? await db.product.findUnique({ where: { slug: slugIn } }) : null;
  if (slugIn && (!existing || existing.supplierId !== sup.id)) return NextResponse.json({ error: "notfound" }, { status: 404 });

  const sourceLang: Lang = b.sourceLang === "en" ? "en" : "fr";
  const otherLang: Lang = sourceLang === "fr" ? "en" : "fr";
  const mainName = str("title", 140);
  const mainDesc = str("description", 4000);
  let otherName = mainName;
  let otherDesc = mainDesc;
  let translationState = "";
  if (mainName) {
    const unchanged = existing && existing.sourceLang === sourceLang && (sourceLang === "fr" ? existing.name : existing.nameEn) === mainName && (sourceLang === "fr" ? existing.description : existing.descriptionEn) === mainDesc && existing.translationState !== "pending";
    if (unchanged) {
      otherName = sourceLang === "fr" ? existing.nameEn : existing.name;
      otherDesc = sourceLang === "fr" ? existing.descriptionEn : existing.description;
      translationState = existing.translationState;
    } else {
      const out = await translateTexts(mainDesc ? [mainName, mainDesc] : [mainName], sourceLang, otherLang);
      if (out) { otherName = out[0] || mainName; otherDesc = out[1] ?? ""; translationState = "auto"; }
    }
  }
  const categorySlug = str("category", 60);
  const intent = b.intent === "submit" ? "submit" : "draft";
  if (!mainName || !(await db.category.findUnique({ where: { slug: categorySlug } }))) return bad("invalid");

  const currency: Currency = isCurrency(String(b.currency ?? "")) ? (b.currency as Currency) : "EUR";
  const price = numOrNull(b.price);
  if (price === null || price <= 0 || price > 10_000_000) return bad("price");
  const priceLocal = toMinor(price, currency);
  const priceCents = toEurCents(priceLocal, currency);
  if (priceCents < 100) return bad("price");

  const wanted = (Array.isArray(b.photos) ? b.photos : []).map(String).slice(0, 6);
  const ids = wanted.map((u) => /^\/api\/media\/([\w-]+)$/.exec(u)?.[1]).filter((x): x is string => !!x);
  const rows = ids.length ? await db.mediaFile.findMany({ where: { id: { in: ids }, ownerUserId: sup.userId }, select: { id: true } }) : [];
  const ok = new Set(rows.map((r) => r.id));
  const kept = Array.isArray(existing?.images) ? (existing!.images as string[]) : [];
  const photos = wanted.filter((u) => kept.includes(u) || ok.has(u.split("/").pop()!));
  if (intent === "submit" && photos.length === 0) return bad("photo");
  if (intent === "submit" && mainDesc.length < 20) return bad("desc");

  const isArt = ART.includes(categorySlug);
  const attest = isArt && b.attest === true;
  const edition = isArt ? str("edition", 40) || null : null;
  const weight = numOrNull(b.weightG);
  const data = {
    name: sourceLang === "fr" ? mainName : otherName,
    nameEn: sourceLang === "fr" ? otherName : mainName,
    description: sourceLang === "fr" ? mainDesc : otherDesc,
    descriptionEn: sourceLang === "fr" ? otherDesc : mainDesc,
    sourceLang, translationState, categorySlug, priceCents, priceLocal, currency,
    material: str("material", 80) || null, materialEn: str("material", 80) || null,
    widthCm: numOrNull(b.widthCm), heightCm: numOrNull(b.heightCm), depthCm: numOrNull(b.depthCm), weightG: weight === null ? null : Math.round(weight),
    images: photos, country: sup.country, countryEn: sup.country, edition,
  };
  const attestData = attest && !existing?.authorAttestedAt ? { authorAttestedAt: new Date(), authorAttestedBy: `${sup.displayName} <${user.email ?? ""}>` } : !attest && isArt && !existing?.authorAttestedAt ? { authorAttestedAt: null, authorAttestedBy: null } : {};
  const name = data.name;

  if (existing) {
    const backToReview = existing.status === "PUBLISHED";
    const next = backToReview || (intent === "submit" && (existing.status === "DRAFT" || existing.status === "REJECTED")) ? "SUBMITTED" : existing.status;
    const becoming = next === "SUBMITTED" && existing.status !== "SUBMITTED";
    await db.product.update({ where: { slug: existing.slug }, data: { ...data, ...attestData, status: next, submittedAt: becoming ? new Date() : existing.submittedAt, rejectReason: next === "SUBMITTED" ? null : existing.rejectReason, ...(becoming ? { decidedAt: null } : {}) } });
    if (becoming) await emailAdminProductSubmitted(sup.displayName, name);
    return NextResponse.json({ ok: true, slug: existing.slug, status: next });
  }

  const creatorSlug = await ensureCreator(sup);
  const slug = `${slugify(name).slice(0, 40) || "oeuvre"}-${randomBytes(2).toString("hex")}`;
  const unique = b.unique === true;
  const stock = unique ? 1 : Math.trunc(Number(b.stock ?? 0));
  if (!Number.isFinite(stock) || stock < 0 || stock > 100000) return bad("stock");
  const actor = user.email ?? sup.displayName;
  await db.$transaction(async (tx) => {
    await tx.product.create({
      data: { ...data, ...attestData, story: "", storyEn: "", slug, creatorSlug, supplierId: sup.id, status: intent === "submit" ? "SUBMITTED" : "DRAFT", submittedAt: intent === "submit" ? new Date() : null, materials: [], sizes: [], stock, hasCertificate: false, lowStockThreshold: 1, edition: edition ?? (unique && isArt ? "PiÃ¨ce unique" : null) },
    });
    if (stock > 0) await tx.stockMovement.create({ data: { productSlug: slug, type: "ENTRY", quantity: stock, reason: "Stock initial", authorId: sup.userId!, authorLabel: actor } });
  });
  if (intent === "submit") await emailAdminProductSubmitted(sup.displayName, name);
  return NextResponse.json({ ok: true, slug, status: intent === "submit" ? "SUBMITTED" : "DRAFT" });
}
