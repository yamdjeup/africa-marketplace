"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isAdminEmail } from "@/lib/supplier";
import { emailApplicantDecision } from "@/lib/supplier-email";

export async function decideApplication(formData: FormData) {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) redirect("/");
  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 1000) || null;
  if (!["ACCEPTED", "REFUSED", "NEEDS_INFO"].includes(decision)) return;
  const app = await db.supplierApplication.findUnique({ where: { id } });
  if (!app || app.status === "ACCEPTED") return;
  const status = decision as "ACCEPTED" | "REFUSED" | "NEEDS_INFO";
  await db.$transaction(async (tx) => {
    await tx.supplierApplication.update({ where: { id }, data: { status, adminNote: note, decidedAt: new Date() } });
    if (status === "ACCEPTED") {
      const existing = await tx.supplier.findUnique({ where: { userId: app.userId } });
      const data = { displayName: app.name, country: app.country, craftType: app.craftType, bio: app.about, status: "ACTIVE" };
      if (existing) await tx.supplier.update({ where: { id: existing.id }, data });
      else await tx.supplier.create({ data: { ...data, userId: app.userId } });
    }
  });
  await emailApplicantDecision(app, status, note);
  revalidatePath("/[locale]/admin/candidatures", "page");
}
