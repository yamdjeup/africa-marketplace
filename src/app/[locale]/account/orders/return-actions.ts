"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { storeReturnPhotos } from "@/lib/return-photos";
import { requestReturnForUser } from "@/lib/customer-orders";

// Demande de retour d'un colis livré (30 jours) : logique partagée avec l'API mobile (lib/customer-orders.ts).
export async function requestReturnAction(formData: FormData) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return;
  const files = formData.getAll("photos").filter((f): f is File => f instanceof File);
  const stored = await storeReturnPhotos(userId, files);
  if (!stored.ok) return;
  await requestReturnForUser(userId, session.user?.email, String(formData.get("id") ?? ""), String(formData.get("reason") ?? ""), stored.ids);
  revalidatePath("/", "layout");
}
