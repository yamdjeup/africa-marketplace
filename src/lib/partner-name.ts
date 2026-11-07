import { db } from "@/lib/db";

// Clé de comparaison : insensible à la casse, aux accents et aux espaces.
export const nameKey = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, "");

// Un nom est pris s'il appartient à un partenaire (actif, suspendu ou révoqué). Une candidature refusée ne le réserve pas.
export async function partnerNameTaken(name: string, exceptSupplierId?: string): Promise<boolean> {
  const key = nameKey(name);
  if (!key) return false;
  const all = await db.supplier.findMany({ where: { isDemo: false }, select: { id: true, displayName: true } });
  return all.some((s) => s.id !== exceptSupplierId && s.displayName !== "Partenaire retiré" && nameKey(s.displayName) === key);
}
