import { NextResponse } from "next/server";
import { sendAlertTest } from "@/lib/alert-test";
import { userFromRequest } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";

// Même logique que /api/alerts/test (site), authentification Bearer.
export async function POST(req: Request) {
  const u = await userFromRequest(req);
  if (!u) return NextResponse.json({ status: "unauthenticated" }, { status: 401 });
  const locale = new URL(req.url).searchParams.get("lang") === "en" ? "en" : "fr";
  const r = await sendAlertTest(u.id, locale);
  return NextResponse.json({ status: r.status }, { status: r.http });
}
