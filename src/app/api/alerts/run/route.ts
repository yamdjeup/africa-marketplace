import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runAlerts } from "@/lib/alerts";

export const dynamic = "force-dynamic";

// Protégée par CRON_SECRET (Vercel Cron envoie « Authorization: Bearer <CRON_SECRET> »).
async function handle(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(secret ?? "");
  const b = Buffer.from(given);
  if (!secret || a.length !== b.length || !timingSafeEqual(a, b)) return new NextResponse("Unauthorized", { status: 401 });
  return NextResponse.json(await runAlerts());
}

export const GET = handle;
export const POST = handle;
