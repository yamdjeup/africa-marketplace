import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { surveyCsv, surveyStats } from "@/lib/survey";
import { isAdminEmail } from "@/lib/supplier";
import { parsePeriod } from "../period";

export async function GET(req: Request) {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) return new NextResponse("Forbidden", { status: 403 });
  const u = new URL(req.url);
  const p = parsePeriod(u.searchParams.get("from"), u.searchParams.get("to"));
  if (!p) return new NextResponse("Période obligatoire (from, to : AAAA-MM-JJ)", { status: 400 });
  const csv = "\uFEFF" + surveyCsv(await surveyStats(db, p.from, p.to));
  return new NextResponse(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="enquete-${u.searchParams.get("from")}_${u.searchParams.get("to")}.csv"` } });
}
