"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { parseOptionLines, addQuestion, duplicateQuestion, editQuestion, moveQuestion, saveSurveyConfig, setQuestionActive, type QuestionInput, type SurveyOption } from "@/lib/survey";
import { isAdminEmail } from "@/lib/supplier";

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const PATH = "/fr/admin/enquete";

async function admin() {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) redirect("/");
}

function back(r: string): never {
  revalidatePath(PATH);
  revalidatePath("/[locale]/admin/enquete", "page");
  redirect(`${PATH}?${r}&t=${Date.now()}`);
}

function input(f: FormData, suffix = ""): QuestionInput {
  return { type: s(f, `type${suffix}`), labelFr: s(f, `labelFr${suffix}`), labelEn: s(f, `labelEn${suffix}`), required: f.get(`required${suffix}`) === "on", options: parseOptionLines(s(f, `options${suffix}`)) };
}

export async function saveSurveyConfigAction(f: FormData) {
  await admin();
  const r = await saveSurveyConfig(db, f.get("enabled") === "on", Number(s(f, "delayDays")));
  back(r === "ok" ? "ok=config" : "error=invalid");
}

export async function addQuestionAction(f: FormData) {
  await admin();
  back((await addQuestion(db, input(f))) === "ok" ? "ok=added" : "error=invalid");
}

export async function saveQuestionAction(f: FormData) {
  await admin();
  back((await editQuestion(db, s(f, "id"), input(f))) === "ok" ? "ok=saved" : "error=invalid");
}

export async function toggleQuestionAction(f: FormData) {
  await admin();
  await setQuestionActive(db, s(f, "id"), f.get("to") === "1");
  back("ok=saved");
}

export async function duplicateQuestionAction(f: FormData) {
  await admin();
  await duplicateQuestion(db, s(f, "id"));
  back("ok=duplicated");
}

export async function moveQuestionAction(f: FormData) {
  await admin();
  const [id, dir] = s(f, "move").split(":");
  await moveQuestion(db, id, dir === "up" ? "up" : "down");
  back("ok=saved");
}
