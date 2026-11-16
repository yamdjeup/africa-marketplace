import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { sendAlertTest } from "@/lib/alert-test";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ status: "unauthenticated" }, { status: 401 });
  const locale = new URL(req.url).searchParams.get("lang") === "en" ? "en" : "fr";
  const r = await sendAlertTest(session.user.id, locale);
  return NextResponse.json({ status: r.status }, { status: r.http });
}
