"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { storeReturnPhotos } from "@/lib/return-photos";
import { confirmReturnShippedForUser, requestReturnForUser } from "@/lib/customer-orders";

// Demande de retour d'un colis livré (14 jours) : logique partagée avec l'API mobile (lib/customer-orders.ts).
export async function requestReturnAction(formData: FormData) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return;
  const reasonId = String(formData.get("reasonId") ?? "");
  const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  const stored = await storeReturnPhotos(userId, files);
  if (!stored.ok) return;
  await requestReturnForUser(userId, session.user?.email, String(formData.get("id") ?? ""), String(formData.get("reason") ?? ""), stored.ids, reasonId || null);
  revalidatePath("/", "layout");
}

// Confirmation de l'expédition du retour (transporteur + numéro de suivi), propriétaire vérifié côté serveur.
export async function confirmReturnShippedAction(formData: FormData) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return;
  await confirmReturnShippedForUser(userId, session.user?.email, String(formData.get("id") ?? ""), String(formData.get("carrier") ?? ""), String(formData.get("tracking") ?? ""));
  revalidatePath("/", "layout");
}
