import { NextResponse } from "next/server";
import { listFavorites, replaceFavorites } from "@/lib/mobile-account";
import { userFromRequest } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";
const unauthorized = () => NextResponse.json({ error: "unauthorized" }, { status: 401 });

export async function GET(req: Request) {
  const u = await userFromRequest(req);
  return u ? NextResponse.json({ slugs: await listFavorites(u.id) }) : unauthorized();
}

export async function PUT(req: Request) {
  const u = await userFromRequest(req);
  if (!u) return unauthorized();
  const body = (await req.json().catch(() => ({}))) as { slugs?: unknown };
  return NextResponse.json({ slugs: await replaceFavorites(u.id, body.slugs) });
}
