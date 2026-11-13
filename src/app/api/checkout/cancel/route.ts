import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cancelHoldWithToken } from "@/lib/checkout-hold";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const n = u.searchParams.get("n") ?? "";
  const t = u.searchParams.get("t") ?? "";
  const l = u.searchParams.get("l") === "en" ? "en" : "fr";
  if (n && t) await cancelHoldWithToken(db, n, t).catch(() => false);
  return NextResponse.redirect(new URL(`/${l}/cart`, u.origin), 303);
}
