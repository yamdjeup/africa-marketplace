import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyUnsubToken } from "@/lib/alerts-core";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const locale = sp.get("lang") === "en" ? "en" : "fr";
  const u = sp.get("u") ?? "";
  const t = sp.get("t") ?? "";
  const ok = u.length > 0 && verifyUnsubToken(u, t);
  if (ok) await db.user.updateMany({ where: { id: u }, data: { alertFavorites: false, alertPromo: false } });
  return NextResponse.redirect(new URL(`/${locale}/alertes/desinscription?ok=${ok ? 1 : 0}`, req.url), 303);
}
