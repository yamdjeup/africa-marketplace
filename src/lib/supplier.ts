import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";

// Admins = adresses listées (séparées par des virgules) dans ADMIN_EMAILS.
export function isAdminEmail(email?: string | null) {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return list.includes(email.toLowerCase());
}

export const VIEW_AS_COOKIE = "view-as-supplier";

export async function requireAdmin(locale: string) {
  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/admin`)}`);
  if (!isAdminEmail(session.user.email)) redirect(`/${locale}`);
  return session.user;
}

export type PortalContext = {
  supplier: NonNullable<Awaited<ReturnType<typeof db.supplier.findUnique>>>;
  /** Vrai si un admin consulte l'espace d'un fournisseur de démonstration. */
  viewingAs: boolean;
};

// Fournisseur actif de l'utilisateur ; sinon, pour un admin seulement, le fournisseur de démo choisi (cookie).
export async function getPortalContext(): Promise<PortalContext | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const own = await db.supplier.findUnique({ where: { userId: session.user.id } });
  if (own) return own.status === "ACTIVE" ? { supplier: own, viewingAs: false } : null;
  if (!isAdminEmail(session.user.email)) return null;
  const id = (await cookies()).get(VIEW_AS_COOKIE)?.value;
  if (!id) return null;
  const demo = await db.supplier.findFirst({ where: { id, isDemo: true, status: "ACTIVE" } });
  return demo ? { supplier: demo, viewingAs: true } : null;
}
