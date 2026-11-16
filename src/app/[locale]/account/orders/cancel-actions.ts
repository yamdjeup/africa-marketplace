"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { cancelParcelForUser } from "@/lib/customer-orders";

export async function cancelMySubOrder(formData: FormData) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return;
  await cancelParcelForUser(userId, session?.user?.email, String(formData.get("id") ?? ""));
  revalidatePath("/", "layout");
}
