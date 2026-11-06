import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runSubOrderSweep } from "@/lib/order-notify";

export const dynamic = "force-dynamic";

// Relances 24 h, escalade 36 h, expiration 48 h des sous-commandes. Protégée par CRON_SECRET.
async function handle(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(secret ?? "");
  const b = Buffer.from(given);
  if (!secret || a.length !== b.length || !timingSafeEqual(a, b)) return new NextResponse("Unauthorized", { status: 401 });
  return NextResponse.json(await runSubOrderSweep());
}

export const GET = handle;
export const POST = handle;
