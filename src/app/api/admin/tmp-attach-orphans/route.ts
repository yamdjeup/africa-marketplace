import { timingSafeEqual } from "node:crypto";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { attachOrphans } from "@/lib/attach-orphans";
import { isAdminEmail } from "@/lib/supplier";

// TEMPORAIRE : à supprimer après usage (voir docs/BACKLOG.md).
export async function POST(req: Request) {
  const secret = process.env.TMP_ATTACH_SECRET;
  const given = req.headers.get("x-tmp-secret") ?? "";
  const ok = !!secret && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  const session = await auth();
  if (!ok || !isAdminEmail(session?.user?.email)) return Response.json({ error: "forbidden" }, { status: 403 });
  return Response.json(await attachOrphans(db));
}
