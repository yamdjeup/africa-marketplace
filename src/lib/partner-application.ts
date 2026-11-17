import type { PrismaClient } from "@prisma/client";

export type ApplicationInput = { name: string; country: string; craftType: string; portfolioUrl: string; about: string };
export type ApplicationError = "invalid" | "name" | "pending" | "proof" | "rate" | "partner" | "user";

const clip = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

/** Nettoyage des champs (mêmes longueurs que le formulaire du site). */
export function cleanApplication(raw: Record<string, unknown>): ApplicationInput {
  return { name: clip(raw.name, 120), country: clip(raw.country, 80), craftType: clip(raw.craftType, 80), portfolioUrl: clip(raw.portfolioUrl, 300), about: clip(raw.about, 3000) };
}

export type SubmitDeps = { nameTaken: (name: string) => Promise<boolean>; notify: (app: ApplicationInput & { email: string; locale: string }) => Promise<void> };

/** Candidature partenaire : mêmes contrôles pour le site (Server Action) et l'API mobile. */
export async function submitPartnerApplication(db: PrismaClient, userId: string, data: ApplicationInput, locale: "fr" | "en", deps: SubmitDeps): Promise<{ ok: true } | { ok: false; error: ApplicationError; redirectToSpace?: boolean }> {
  const urlOk = !data.portfolioUrl || /^https?:\/\/\S+\.\S+/.test(data.portfolioUrl);
  if (!data.name || !data.country || !data.craftType || data.about.length < 20 || !urlOk) return { ok: false, error: "invalid" };
  if (await db.supplier.findUnique({ where: { userId } })) return { ok: false, error: "partner", redirectToSpace: true };
  if (await deps.nameTaken(data.name)) return { ok: false, error: "name" };
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: "user" };
  const open = await db.supplierApplication.findFirst({ where: { userId, status: { in: ["PENDING", "NEEDS_INFO"] } }, orderBy: { createdAt: "desc" } });
  if (open?.status === "PENDING") return { ok: false, error: "pending" };
  const pending = await db.applicationFile.count({ where: { userId, applicationId: null } });
  const attached = open ? await db.applicationFile.count({ where: { applicationId: open.id } }) : 0;
  if (!data.portfolioUrl && pending + attached === 0) return { ok: false, error: "proof" };
  if (!open && (await db.supplierApplication.count({ where: { userId, createdAt: { gt: new Date(Date.now() - 24 * 3600_000) } } })) >= 3) return { ok: false, error: "rate" };
  const saved = open
    ? await db.supplierApplication.update({ where: { id: open.id }, data: { ...data, status: "PENDING", locale } })
    : await db.supplierApplication.create({ data: { ...data, userId, email: user.email, locale } });
  await db.applicationFile.updateMany({ where: { userId, applicationId: null }, data: { applicationId: saved.id } });
  await deps.notify({ ...data, email: user.email, locale });
  return { ok: true };
}
