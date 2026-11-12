import { auth } from "@/auth";
import { archiveUnpaidOrders } from "@/lib/archive-unpaid";
import { db } from "@/lib/db";
import { isAdminEmail } from "@/lib/supplier";

// Route TEMPORAIRE (à supprimer après l'archivage). GET = simulation, POST = exécution ; session admin obligatoire.
export const runtime = "nodejs";

async function run(execute: boolean) {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) return new Response("forbidden", { status: 403 });
  return Response.json(await archiveUnpaidOrders(db, execute));
}

export const GET = () => run(false);
export const POST = () => run(true);
