import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { supplierFromRequest } from "@/lib/mobile-supplier";
import { ensureCreator } from "@/lib/partner-creator";
import { partnerNameTaken } from "@/lib/partner-name";
import { changeLog, changedFields, validateContact } from "@/lib/partner-profile";

const mediaId = (u: unknown) => /^\/api\/media\/([\w-]+)$/.exec(String(u ?? ""))?.[1] ?? null;

async function owned(url: unknown, userId: string) {
  const id = mediaId(url);
  if (!id) return null;
  const row = await db.mediaFile.findUnique({ where: { id }, select: { ownerUserId: true } });
  return row?.ownerUserId === userId ? id : null;
}

export async function GET(req: Request) {
  const s = await supplierFromRequest(req);
  if (!s) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const avatar = s.creatorSlug ? (await db.creator.findUnique({ where: { slug: s.creatorSlug }, select: { image: true } }))?.image ?? "" : "";
  return NextResponse.json({ displayName: s.displayName, country: s.country, contactEmail: s.contactEmail ?? "", phone: s.phone ?? "", address: s.address ?? "", bio: s.bio, bioEn: s.bioEn, videoUrl: s.videoUrl ?? "", avatar, signature: s.signatureFileId ? `/api/media/${s.signatureFileId}` : "" });
}

// Mêmes règles et même journal d'audit que updateSupplierProfile (fournisseur/actions.ts).
export async function POST(req: Request) {
  const sup = await supplierFromRequest(req);
  if (!sup) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const str = (k: string, max: number) => String(b[k] ?? "").trim().slice(0, max);
  const lang = b.lang === "en" ? "en" : "fr";
  const newName = str("displayName", 120);
  if (newName && (await partnerNameTaken(newName, sup.id))) return NextResponse.json({ error: "name" }, { status: 409 });
  const contact = { contactEmail: str("contactEmail", 200), phone: str("phone", 30), address: str("address", 400) };
  const invalid = validateContact(contact);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
  const bioKey = lang === "fr" ? "bio" : "bioEn";
  const video = /^https?:\/\//.test(str("videoUrl", 300)) ? str("videoUrl", 300) : null;
  const before: Record<string, unknown> = { displayName: sup.displayName, country: sup.country, [bioKey]: sup[bioKey], videoUrl: sup.videoUrl, contactEmail: sup.contactEmail, phone: sup.phone, address: sup.address };
  const after: Record<string, unknown> = { displayName: newName || sup.displayName, country: str("country", 80) || sup.country, [bioKey]: str("bio", 4000), videoUrl: video, ...contact };
  if (changedFields(before, after).length) {
    await db.partnerAudit.create({ data: { supplierId: sup.id, action: "PROFILE_EDIT", reason: changeLog(before, after), actorEmail: (await db.user.findUnique({ where: { id: sup.userId ?? "" }, select: { email: true } }))?.email ?? "" } });
  }
  await db.supplier.update({
    where: { id: sup.id },
    data: { ...contact, displayName: String(after.displayName), country: String(after.country), bio: lang === "fr" ? str("bio", 4000) : sup.bio, bioEn: lang === "en" ? str("bio", 4000) : sup.bioEn, videoUrl: video },
  });
  if (after.displayName !== before.displayName && sup.userId) await db.user.update({ where: { id: sup.userId }, data: { name: String(after.displayName) } });
  if (sup.userId && (b.avatar === "" || mediaId(b.avatar))) {
    const id = await owned(b.avatar, sup.userId);
    const slug = await ensureCreator(sup);
    await db.creator.update({ where: { slug }, data: { image: id ? `/api/media/${id}` : "" } });
  }
  return NextResponse.json({ ok: true });
}
