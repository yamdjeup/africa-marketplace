"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { saveCreatorProfile } from "@/lib/creator-admin";
import { db } from "@/lib/db";
import { isAdminEmail } from "@/lib/supplier";

const path = "/fr/admin/createurs";
const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function saveCreatorAction(f: FormData) {
  const session = await auth();
  const r = await saveCreatorProfile(db as unknown as Parameters<typeof saveCreatorProfile>[0], isAdminEmail(session?.user?.email), {
    slug: s(f, "slug"),
    name: s(f, "name"),
    countries: f.getAll("countries").map(String),
    madeIn: s(f, "madeIn"),
    madeInEn: s(f, "madeInEn"),
    categories: f.getAll("categories").map(String),
    specialty: s(f, "specialty"),
    specialtyEn: s(f, "specialtyEn"),
    bio: s(f, "bio"),
    bioEn: s(f, "bioEn"),
    image: s(f, "image"),
    website: s(f, "website"),
    email: s(f, "email"),
    instagram: s(f, "instagram"),
    published: f.get("published") === "on",
  });
  if (r === "forbidden") redirect("/");
  revalidatePath(path);
  revalidatePath("/fr/partenaires");
  redirect(`${path}?${r === "invalid" ? "error=invalid" : `ok=${r}`}`);
}
