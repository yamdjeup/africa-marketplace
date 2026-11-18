"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { addReason, deleteReason, editReason, isKind, moveReason, setReasonActive } from "@/lib/refusal-reasons";
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
  back((await addReason(db, kind as "ORDER" | "RETURN", s(f, "fr"), s(f, "en"), s(f, "mailFr"), s(f, "mailEn"))) === "ok" ? "ok=added" : "error=invalid");
}

const selected = (f: FormData) => f.getAll("sel").map(String).filter(Boolean);
const NONE = "error=none";

export async function saveReasonsAction(f: FormData) {
  await admin();
  const ids = selected(f);
  if (!ids.length) back(NONE);
  let bad = false;
  for (const id of ids) bad = (await editReason(db, id, s(f, `fr_${id}`), s(f, `en_${id}`), s(f, `mailFr_${id}`), s(f, `mailEn_${id}`))) !== "ok" || bad;
  back(bad ? "error=invalid" : "ok=saved");
}

export async function toggleReasonsAction(f: FormData) {
  await admin();
  const ids = selected(f);
  if (!ids.length) back(NONE);
  for (const id of ids) {
    const cur = await db.refusalReason.findUnique({ where: { id }, select: { active: true } });
    if (cur) await setReasonActive(db, id, !cur.active);
  }
  back("ok=saved");
}

export async function deleteReasonsAction(f: FormData) {
  await admin();
  const ids = selected(f);
  if (!ids.length) back(NONE);
  let used = false;
  for (const id of ids) used = (await deleteReason(db, id)) === "used" || used;
  back(used ? "error=used" : "ok=deleted");
}

export async function moveReasonAction(f: FormData) {
  await admin();
  const [mid, dir] = s(f, "move").split(":");
  await moveReason(db, mid, dir === "up" ? "up" : "down");
  back("ok=saved");
}
