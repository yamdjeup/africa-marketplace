import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { buildAlertEmail } from "@/lib/alerts-core";
import { getEmailProvider, sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
const MIN_INTERVAL_MS = 60_000;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ status: "unauthenticated" }, { status: 401 });
  const locale = new URL(req.url).searchParams.get("lang") === "en" ? "en" : "fr";
  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ status: "unauthenticated" }, { status: 401 });
  if (!getEmailProvider()) return NextResponse.json({ status: "unconfigured" }, { status: 503 });
  if (user.lastTestEmailAt && Date.now() - user.lastTestEmailAt.getTime() < MIN_INTERVAL_MS) {
    return NextResponse.json({ status: "rate_limited" }, { status: 429 });
  }
  await db.user.update({ where: { id: user.id }, data: { lastTestEmailAt: new Date() } });
  const sample = await db.product.findFirst({ where: { stock: { gt: 0 } }, include: { creator: true } });
  const items = sample ? [{ slug: sample.slug, name: sample.name, creatorName: sample.creator.name, priceCents: sample.priceCents }] : [];
  const ok = await sendEmail({ to: user.email, ...buildAlertEmail({ kind: "test", locale, userId: user.id, items }) });
  return NextResponse.json({ status: ok ? "sent" : "failed" }, { status: ok ? 200 : 502 });
}
