import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { userFromRequest } from "@/lib/mobile-auth";
import { cleanApplication, submitPartnerApplication } from "@/lib/partner-application";
import { partnerNameTaken } from "@/lib/partner-name";
import { emailAdminNewApplication, emailApplicantReceived } from "@/lib/supplier-email";
import { COUNTRIES, CRAFTS } from "@/lib/tr";

export const dynamic = "force-dynamic";

const unauthorized = () => NextResponse.json({ error: "unauthorized" }, { status: 401 });

export async function GET(req: Request) {
  const user = await userFromRequest(req);
  if (!user) return unauthorized();
  const [supplier, last, files] = await Promise.all([
    db.supplier.findUnique({ where: { userId: user.id }, select: { id: true } }),
    db.supplierApplication.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    db.applicationFile.findMany({ where: { userId: user.id, applicationId: null }, select: { id: true, name: true }, orderBy: { createdAt: "asc" } }),
  ]);
  return NextResponse.json({
    isPartner: !!supplier,
    last: last ? { status: last.status, adminNote: last.adminNote, createdAt: last.createdAt.toISOString(), name: last.name, country: last.country, craftType: last.craftType, portfolioUrl: last.portfolioUrl, about: last.about } : null,
    prefillName: user.name,
    files,
    countries: COUNTRIES,
    crafts: CRAFTS,
  });
}

export async function POST(req: Request) {
  const user = await userFromRequest(req);
  if (!user) return unauthorized();
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "invalid" }, { status: 400 });
  if (String(body.website ?? "").trim()) return NextResponse.json({ ok: true });
  const locale = body.locale === "en" ? "en" : "fr";
  const r = await submitPartnerApplication(db, user.id, cleanApplication(body), locale, {
    nameTaken: (n) => partnerNameTaken(n),
    notify: async (mail) => {
      await emailAdminNewApplication(mail);
      await emailApplicantReceived(mail);
    },
  });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.error === "rate" ? 429 : r.error === "pending" || r.error === "partner" ? 409 : 400 });
  return NextResponse.json({ ok: true });
}
