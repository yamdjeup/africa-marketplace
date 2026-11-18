"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { addReason, editReason, isKind, moveReason, setReasonActive } from "@/lib/refusal-reasons";
import { isAdminEmail } from "@/lib/supplier";

const path = "/fr/admin/motifs";
const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

async function admin() {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) redirect("/");
}

function back(r: string) {
  revalidatePath(path);
  redirect(`${path}?${r}`);
}

export async function addReasonAction(f: FormData) {
  await admin();
  const kind = s(f, "kind");
  if (!isKind(kind)) back("error=kind");
  back((await addReason(db, kind as "ORDER" | "RETURN", s(f, "fr"), s(f, "en"))) === "ok" ? "ok=added" : "error=invalid");
}

export async function editReasonAction(f: FormData) {
  await admin();
  back((await editReason(db, s(f, "id"), s(f, "fr"), s(f, "en"))) === "ok" ? "ok=saved" : "error=invalid");
}

export async function toggleReasonAction(f: FormData) {
  await admin();
  await setReasonActive(db, s(f, "id"), s(f, "active") === "1");
  back("ok=saved");
}

export async function moveReasonAction(f: FormData) {
  await admin();
  await moveReason(db, s(f, "id"), s(f, "dir") === "up" ? "up" : "down");
  back("ok=saved");
}
