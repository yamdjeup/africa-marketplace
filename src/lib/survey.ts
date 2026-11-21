import type { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";

// Enquête de satisfaction : logique pure + accès base injecté (testable sans serveur).
export const QUESTION_TYPES = ["TEXT", "SELECT", "STARS", "SCORE10"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];
export type SurveyOption = { fr: string; en: string };
export type SurveyQuestionRow = { id: string; key: string; version: number; position: number; type: string; labelFr: string; labelEn: string; required: boolean; options: string; active: boolean; archived: boolean };

export const DEFAULT_DELAY_DAYS = 3;
const DAY = 86_400_000;

export function parseOptions(raw: string): SurveyOption[] {
  try {
    const a = JSON.parse(raw);
    return Array.isArray(a) ? a.filter((o) => o && typeof o.fr === "string" && typeof o.en === "string") : [];
  } catch {
    return [];
  }
}

/** Une option par ligne : « FR | EN » (EN = FR si absent). */
export function parseOptionLines(raw: string): SurveyOption[] {
  return raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => {
    const [fr, en] = l.split("|").map((x) => x.trim());
    return { fr, en: en || fr };
  });
}

/** Valide et normalise une réponse ; null = invalide. Chaîne vide = non répondu. */
export function normalizeAnswer(q: Pick<SurveyQuestionRow, "type" | "options">, raw: unknown): string | null {
  const v = String(raw ?? "").trim();
  if (v === "") return "";
  switch (q.type) {
    case "TEXT":
      return v.slice(0, 2000);
    case "SELECT":
      return parseOptions(q.options).some((o) => o.fr === v) ? v : null;
    case "STARS":
      return /^[1-5]$/.test(v) ? v : null;
    case "SCORE10":
      return /^([1-9]|10)$/.test(v) ? v : null;
    default:
      return null;
  }
}

export async function getSurveyConfig(db: PrismaClient) {
  const c = await db.surveyConfig.findUnique({ where: { id: "main" } });
  return { enabled: c?.enabled ?? true, delayDays: c?.delayDays ?? DEFAULT_DELAY_DAYS };
}

export const listActiveQuestions = (db: PrismaClient) => db.surveyQuestion.findMany({ where: { active: true, archived: false }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] });

/** Réponse (et jeton) du colis : créée à la demande, une seule par colis. */
export async function ensureSurvey(db: PrismaClient, subOrderId: string, locale: string) {
  const ex = await db.surveyResponse.findUnique({ where: { subOrderId } });
  if (ex) return ex;
  try {
    return await db.surveyResponse.create({ data: { subOrderId, token: randomBytes(24).toString("hex"), locale: locale === "en" ? "en" : "fr" } });
  } catch {
    const again = await db.surveyResponse.findUnique({ where: { subOrderId } });
    if (!again) throw new Error("survey create failed");
    return again;
  }
}

export const surveyUrl = (base: string, locale: string, token: string) => `${base}/${locale === "en" ? "en" : "fr"}/avis/${token}`;

export async function findSurveyByToken(db: PrismaClient, token: string) {
  if (!/^[a-f0-9]{48}$/.test(token)) return null;
  return db.surveyResponse.findUnique({ where: { token }, include: { answers: true } });
}

export type SaveResult = "saved" | "completed" | "already" | "invalid" | "missing";

/** Enregistre les réponses (brouillon) ; `finish` exige les questions obligatoires. Réponse terminée = non modifiable. */
export async function saveSurveyAnswers(db: PrismaClient, token: string, values: Record<string, unknown>, finish: boolean, now = new Date()): Promise<{ result: SaveResult; missing?: string[] }> {
  const resp = await findSurveyByToken(db, token);
  if (!resp) return { result: "invalid" };
  if (resp.completedAt) return { result: "already" };
  const questions = await listActiveQuestions(db);
  const byId = new Map(questions.map((q) => [q.id, q]));
  const clean = new Map<string, string>();
  for (const [id, raw] of Object.entries(values)) {
    const q = byId.get(id);
    if (!q) continue;
    const n = normalizeAnswer(q, raw);
    if (n === null) return { result: "invalid" };
    clean.set(id, n);
  }
  for (const [questionId, value] of clean) {
    if (value === "") await db.surveyAnswer.deleteMany({ where: { responseId: resp.id, questionId } });
    else await db.surveyAnswer.upsert({ where: { responseId_questionId: { responseId: resp.id, questionId } }, create: { responseId: resp.id, questionId, value }, update: { value } });
  }
  if (!finish) return { result: "saved" };
  const have = new Set(resp.answers.filter((a) => !(clean.get(a.questionId) === "")).map((a) => a.questionId));
  for (const [id, v] of clean) if (v !== "") have.add(id);
  const missing = questions.filter((q) => q.required && !have.has(q.id)).map((q) => q.id);
  if (missing.length) return { result: "missing", missing };
  const done = await db.surveyResponse.updateMany({ where: { id: resp.id, completedAt: null }, data: { completedAt: now } });
  return { result: done.count === 1 ? "completed" : "already" };
}

export async function hasAnswered(db: PrismaClient, subOrderId: string) {
  const r = await db.surveyResponse.findUnique({ where: { subOrderId }, select: { completedAt: true } });
  return !!r?.completedAt;
}

/** Colis livrés depuis ≥ délai, sans retour demandé, mail d'avis jamais envoyé : réservés (claim) puis renvoyés si l'envoi échoue. */
export async function claimReviewMails(db: PrismaClient, now = new Date()): Promise<{ id: string }[]> {
  const cfg = await getSurveyConfig(db);
  if (!cfg.enabled) return [];
  const due = await db.subOrder.findMany({
    where: { status: "DELIVERED", reviewMailSentAt: null, deliveredAt: { lte: new Date(now.getTime() - cfg.delayDays * DAY) }, returns: { none: {} } },
    select: { id: true },
    take: 100,
  });
  const out: { id: string }[] = [];
  for (const s of due) {
    const c = await db.subOrder.updateMany({ where: { id: s.id, reviewMailSentAt: null, status: "DELIVERED", returns: { none: {} } }, data: { reviewMailSentAt: now } });
    if (c.count === 1) out.push(s);
  }
  return out;
}

export const releaseReviewClaim = (db: PrismaClient, id: string) => db.subOrder.update({ where: { id }, data: { reviewMailSentAt: null } });

// ---- Administration (versionnage) ----
export type QuestionInput = { type: string; labelFr: string; labelEn: string; required: boolean; options: SurveyOption[] };

export function validateQuestionInput(i: QuestionInput): "ok" | "invalid" {
  if (!QUESTION_TYPES.includes(i.type as QuestionType)) return "invalid";
  if (i.labelFr.trim().length < 3 || i.labelEn.trim().length < 3) return "invalid";
  if (i.type === "SELECT" && (i.options.length < 2 || i.options.some((o) => !o.fr.trim() || !o.en.trim()))) return "invalid";
  return "ok";
}

export async function addQuestion(db: PrismaClient, i: QuestionInput) {
  if (validateQuestionInput(i) !== "ok") return "invalid" as const;
  const last = await db.surveyQuestion.findFirst({ where: { archived: false }, orderBy: { position: "desc" } });
  const key = `q_${randomBytes(4).toString("hex")}`;
  await db.surveyQuestion.create({ data: { key, position: (last?.position ?? 0) + 1, type: i.type, labelFr: i.labelFr.trim(), labelEn: i.labelEn.trim(), required: i.required, options: JSON.stringify(i.type === "SELECT" ? i.options : []) } });
  return "ok" as const;
}

/** Modifier = nouvelle version (même key, même position) ; l'ancienne est archivée et garde ses réponses. */
export async function editQuestion(db: PrismaClient, id: string, i: QuestionInput) {
  if (validateQuestionInput(i) !== "ok") return "invalid" as const;
  const q = await db.surveyQuestion.findUnique({ where: { id } });
  if (!q || q.archived) return "invalid" as const;
  const optionsJson = JSON.stringify(i.type === "SELECT" ? i.options : []);
  const same = q.type === i.type && q.labelFr === i.labelFr.trim() && q.labelEn === i.labelEn.trim() && q.required === i.required && q.options === optionsJson;
  if (same) return "ok" as const;
  const wasActive = q.active;
  await db.surveyQuestion.update({ where: { id }, data: { archived: true, active: false } });
  await db.surveyQuestion.create({ data: { key: q.key, version: q.version + 1, position: q.position, type: i.type, labelFr: i.labelFr.trim(), labelEn: i.labelEn.trim(), required: i.required, options: optionsJson, active: wasActive } });
  return "ok" as const;
}

export async function setQuestionActive(db: PrismaClient, id: string, active: boolean) {
  await db.surveyQuestion.updateMany({ where: { id, archived: false }, data: { active } });
}

export async function duplicateQuestion(db: PrismaClient, id: string) {
  const q = await db.surveyQuestion.findUnique({ where: { id } });
  if (!q || q.archived) return;
  const last = await db.surveyQuestion.findFirst({ where: { archived: false }, orderBy: { position: "desc" } });
  await db.surveyQuestion.create({ data: { key: `q_${randomBytes(4).toString("hex")}`, position: (last?.position ?? 0) + 1, type: q.type, labelFr: `${q.labelFr} (copie)`, labelEn: `${q.labelEn} (copy)`, required: q.required, options: q.options, active: false } });
}

export async function moveQuestion(db: PrismaClient, id: string, dir: "up" | "down") {
  const list = await db.surveyQuestion.findMany({ where: { archived: false }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] });
  const i = list.findIndex((q) => q.id === id);
  if (i < 0) return;
  const step = dir === "up" ? -1 : 1;
  let j = i + step;
  // une question active saute les inactives : l'échange doit être visible dans l'aperçu
  if (list[i].active) while (j >= 0 && j < list.length && !list[j].active) j += step;
  if (j < 0 || j >= list.length) return;
  const order = list.map((q) => q.id);
  [order[i], order[j]] = [order[j], order[i]];
  for (let p = 0; p < order.length; p++) await db.surveyQuestion.update({ where: { id: order[p] }, data: { position: p + 1 } });
}

export async function saveSurveyConfig(db: PrismaClient, enabled: boolean, delayDays: number) {
  const d = Math.min(60, Math.max(0, Math.floor(delayDays)));
  if (!Number.isFinite(delayDays)) return "invalid" as const;
  await db.surveyConfig.upsert({ where: { id: "main" }, create: { id: "main", enabled, delayDays: d }, update: { enabled, delayDays: d } });
  return "ok" as const;
}

// ---- Résultats ----
export type QuestionStat = { key: string; version: number; type: string; labelFr: string; labelEn: string; count: number; average: number | null; unit: string; distribution: Record<string, number>; texts: string[] };

const UNITS: Record<string, string> = { STARS: "étoiles (1–5)", SCORE10: "note (1–10)", SELECT: "choix", TEXT: "texte libre" };

/** Statistiques par question (version) sur les réponses terminées dans [from, to] (bornes incluses). */
export async function surveyStats(db: PrismaClient, from: Date, to: Date) {
  const responses = await db.surveyResponse.findMany({ where: { completedAt: { gte: from, lte: to } }, select: { id: true, completedAt: true, subOrder: { select: { number: true } }, answers: { select: { questionId: true, value: true } } }, orderBy: { completedAt: "asc" } });
  const ids = [...new Set(responses.flatMap((r) => r.answers.map((a) => a.questionId)))];
  const qs = await db.surveyQuestion.findMany({ where: { id: { in: ids } }, orderBy: [{ position: "asc" }, { version: "asc" }] });
  const stats: QuestionStat[] = qs.map((q) => {
    const vals = responses.flatMap((r) => r.answers.filter((a) => a.questionId === q.id).map((a) => a.value));
    const nums = q.type === "STARS" || q.type === "SCORE10" ? vals.map(Number) : [];
    const distribution: Record<string, number> = {};
    if (q.type !== "TEXT") for (const v of vals) distribution[v] = (distribution[v] ?? 0) + 1;
    return { key: q.key, version: q.version, type: q.type, labelFr: q.labelFr, labelEn: q.labelEn, count: vals.length, average: nums.length ? Math.round((nums.reduce((s, n) => s + n, 0) / nums.length) * 100) / 100 : null, unit: UNITS[q.type] ?? "", distribution, texts: q.type === "TEXT" ? vals : [] };
  });
  return { responseCount: responses.length, stats, responses, questions: qs };
}

const csvCell = (s: string) => `"${s.replace(/"/g, '""')}"`;
/** CSV : une ligne par réponse terminée, une colonne par version de question (en-tête = libellé FR + v + unité). */
export function surveyCsv(data: Awaited<ReturnType<typeof surveyStats>>): string {
  const head = ["Colis", "Date de réponse (UTC)", ...data.questions.map((q) => `${q.labelFr} [v${q.version}; ${UNITS[q.type] ?? ""}]`)];
  const rows = data.responses.map((r) => [r.subOrder.number, r.completedAt ? r.completedAt.toISOString() : "", ...data.questions.map((q) => r.answers.find((a) => a.questionId === q.id)?.value ?? "")]);
  return [head, ...rows].map((l) => l.map(csvCell).join(",")).join("\r\n");
}
