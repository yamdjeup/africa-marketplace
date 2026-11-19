"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { addCarrier, addReturnReason, deleteCarrier, deleteReturnReason, editCarrier, editReturnReason, moveCarrier, moveReturnReason, setCarrierActive, setReturnReasonActive } from "@/lib/config-lists";
import { isAdminEmail } from "@/lib/supplier";

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const selected = (f: FormData) => f.getAll("sel").map(String).filter(Boolean);

async function admin() {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) redirect("/");
}

function back(path: string, r: string): never {
  revalidatePath(path);
  redirect(`${path}?${r}`);
}

const RR = "/fr/admin/motifs-retour";
const CA = "/fr/admin/transporteurs";

export async function addReturnReasonAction(f: FormData) {
  await admin();
  back(RR, (await addReturnReason(db, s(f, "fr"), s(f, "en"), f.get("requiresPhotos") === "on")) === "ok" ? "ok=added" : "error=invalid");
}

export async function saveReturnReasonsAction(f: FormData) {
  await admin();
  const ids = selected(f);
  if (!ids.length) back(RR, "error=none");
  let bad = false;
  for (const id of ids) bad = (await editReturnReason(db, id, s(f, `fr_${id}`), s(f, `en_${id}`), f.get(`photos_${id}`) === "on")) !== "ok" || bad;
  back(RR, bad ? "error=invalid" : "ok=saved");
}

export async function toggleReturnReasonsAction(f: FormData) {
  await admin();
  const ids = selected(f);
  if (!ids.length) back(RR, "error=none");
  for (const id of ids) {
    const cur = await db.returnReason.findUnique({ where: { id }, select: { active: true } });
    if (cur) await setReturnReasonActive(db, id, !cur.active);
  }
  back(RR, "ok=saved");
}

export async function deleteReturnReasonsAction(f: FormData) {
  await admin();
  const ids = selected(f);
  if (!ids.length) back(RR, "error=none");
  let used = false;
  for (const id of ids) used = (await deleteReturnReason(db, id)) === "used" || used;
  back(RR, used ? "error=used" : "ok=deleted");
}

export async function moveReturnReasonAction(f: FormData) {
  await admin();
  const [id, dir] = s(f, "move").split(":");
  await moveReturnReason(db, id, dir === "up" ? "up" : "down");
  back(RR, "ok=saved");
}

export async function addCarrierAction(f: FormData) {
  await admin();
  const r = await addCarrier(db, s(f, "name"));
  back(CA, r === "ok" ? "ok=added" : `error=${r}`);
}

export async function saveCarriersAction(f: FormData) {
  await admin();
  const ids = selected(f);
  if (!ids.length) back(CA, "error=none");
  let err = "";
  for (const id of ids) {
    const r = await editCarrier(db, id, s(f, `name_${id}`));
    if (r !== "ok") err = r;
  }
  back(CA, err ? `error=${err}` : "ok=saved");
}

export async function toggleCarriersAction(f: FormData) {
  await admin();
  const ids = selected(f);
  if (!ids.length) back(CA, "error=none");
  for (const id of ids) {
    const cur = await db.carrier.findUnique({ where: { id }, select: { active: true } });
    if (cur) await setCarrierActive(db, id, !cur.active);
  }
  back(CA, "ok=saved");
}

export async function deleteCarriersAction(f: FormData) {
  await admin();
  const ids = selected(f);
  if (!ids.length) back(CA, "error=none");
  let used = false;
  for (const id of ids) used = (await deleteCarrier(db, id)) === "used" || used;
  back(CA, used ? "error=used" : "ok=deleted");
}

export async function moveCarrierAction(f: FormData) {
  await admin();
  const [id, dir] = s(f, "move").split(":");
  await moveCarrier(db, id, dir === "up" ? "up" : "down");
  back(CA, "ok=saved");
}
