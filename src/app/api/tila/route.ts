import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { parseTurns, runTila } from "@/lib/tila/agent";
import { catalogDeps } from "@/lib/tila/catalog-deps";
import { getModel } from "@/lib/tila/provider";
import { checkRate } from "@/lib/tila/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const turns = parseTurns(body);
  if (!turns) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const locale = (body as { locale?: unknown }).locale === "en" ? "en" : "fr";

  const model = getModel();
  if (!model) return NextResponse.json({ error: "unavailable" }, { status: 503 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const userId = (await auth())?.user?.id;
  if (!(await checkRate(db, ip, userId))) return NextResponse.json({ error: "rate" }, { status: 429 });

  try {
    const answer = await runTila(model, turns, locale, catalogDeps(locale));
    return NextResponse.json({
      reply: answer.reply,
      products: answer.products.map((p) => ({ slug: p.slug, name: p.name, creatorName: p.creatorName, priceCents: p.priceCents, image: p.image })),
    });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
