import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cancelHoldWithToken } from "@/lib/checkout-hold";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const jar = (await import("next/headers")).cookies;
  const store = await jar();
  const v = store.get("ep_hold")?.value ?? "";
  const i = v.indexOf(".");
  let released = false;
  if (i > 0) released = await cancelHoldWithToken(db, v.slice(0, i), v.slice(i + 1)).catch(() => false);
  if (v) store.delete("ep_hold");
  void req;
  return NextResponse.json({ released });
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  const n = u.searchParams.get("n") ?? "";
  const t = u.searchParams.get("t") ?? "";
  const l = u.searchParams.get("l") === "en" ? "en" : "fr";
  if (n && t) await cancelHoldWithToken(db, n, t).catch(() => false);
  return NextResponse.redirect(new URL(`/${l}/cart`, u.origin), 303);
}
