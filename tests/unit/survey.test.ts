import { describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { claimReviewMails, editQuestion, ensureSurvey, findSurveyByToken, hasAnswered, normalizeAnswer, releaseReviewClaim, saveSurveyAnswers, surveyCsv, surveyStats, addQuestion } from "../../src/lib/survey";
import { parsePeriod } from "../../src/app/[locale]/admin/enquete/period";
import { renderEmailHtml } from "../../src/lib/email-layout";

type Q = { id: string; key: string; version: number; position: number; type: string; labelFr: string; labelEn: string; required: boolean; options: string; active: boolean; archived: boolean; createdAt: Date };
type R = { id: string; subOrderId: string; token: string; locale: string; createdAt: Date; completedAt: Date | null };
type A = { id: string; responseId: string; questionId: string; value: string };
type S = { id: string; status: string; reviewMailSentAt: Date | null; deliveredAt: Date | null; returns: number; number: string };

function fake() {
  let n = 0;
  const qs: Q[] = [];
  const rs: R[] = [];
  const as: A[] = [];
  const subs: S[] = [];
  const cfg = { enabled: true, delayDays: 3 };
  const mk = (type: string, required: boolean, options = "[]", pos = qs.length + 1): Q => ({ id: `q${++n}`, key: `k${n}`, version: 1, position: pos, type, labelFr: `Question ${n}`, labelEn: `Question ${n}`, required, options, active: true, archived: false, createdAt: new Date(n) });
  const match = (o: Record<string, unknown>, w: Record<string, unknown>) => Object.entries(w).every(([k, v]) => (v && typeof v === "object" && !(v instanceof Date) ? (k === "returns" ? (v as { none?: unknown }).none !== undefined ? o.returns === 0 : true : k === "deliveredAt" ? !!o.deliveredAt && (o.deliveredAt as Date) <= (v as { lte: Date }).lte : true) : o[k] === v));
  const db = {
    surveyConfig: { findUnique: async () => ({ id: "main", ...cfg }), upsert: async () => ({}) },
    surveyQuestion: {
      findMany: async (a: { where?: { active?: boolean; archived?: boolean; id?: { in: string[] } } } = {}) => qs.filter((q) => (a.where?.active === undefined || q.active === a.where.active) && (a.where?.archived === undefined || q.archived === a.where.archived) && (!a.where?.id || a.where.id.in.includes(q.id))).sort((x, y) => x.position - y.position || x.version - y.version),
      findUnique: async (a: { where: { id: string } }) => qs.find((q) => q.id === a.where.id) ?? null,
      findFirst: async () => [...qs].filter((q) => !q.archived).sort((x, y) => y.position - x.position)[0] ?? null,
      update: async (a: { where: { id: string }; data: Partial<Q> }) => Object.assign(qs.find((q) => q.id === a.where.id)!, a.data),
      create: async (a: { data: Partial<Q> }) => { const q = { ...mk("TEXT", false), ...a.data, id: `q${++n}`, version: a.data.version ?? 1, archived: false, active: a.data.active ?? true } as Q; qs.push(q); return q; },
    },
    surveyResponse: {
      findUnique: async (a: { where: { subOrderId?: string; token?: string }; include?: unknown }) => { const r = rs.find((x) => (a.where.subOrderId ? x.subOrderId === a.where.subOrderId : x.token === a.where.token)); return r ? { ...r, answers: as.filter((x) => x.responseId === r.id) } : null; },
      create: async (a: { data: { subOrderId: string; token: string; locale: string } }) => { if (rs.some((r) => r.subOrderId === a.data.subOrderId)) throw new Error("unique"); const r = { id: `r${++n}`, createdAt: new Date(), completedAt: null, ...a.data }; rs.push(r); return r; },
      updateMany: async (a: { where: { id: string; completedAt: null }; data: { completedAt: Date } }) => { const r = rs.find((x) => x.id === a.where.id && x.completedAt === null); if (r) r.completedAt = a.data.completedAt; return { count: r ? 1 : 0 }; },
      findMany: async (a: { where: { completedAt: { gte: Date; lte: Date } } }) => rs.filter((r) => r.completedAt && r.completedAt >= a.where.completedAt.gte && r.completedAt <= a.where.completedAt.lte).map((r) => ({ ...r, subOrder: { number: subs.find((s) => s.id === r.subOrderId)?.number ?? "" }, answers: as.filter((x) => x.responseId === r.id) })),
    },
    surveyAnswer: {
      upsert: async (a: { where: { responseId_questionId: { responseId: string; questionId: string } }; create: A; update: { value: string } }) => { const k = a.where.responseId_questionId; const e = as.find((x) => x.responseId === k.responseId && x.questionId === k.questionId); if (e) e.value = a.update.value; else as.push({ ...a.create, id: `a${++n}` }); },
      deleteMany: async (a: { where: { responseId: string; questionId: string } }) => { const i = as.findIndex((x) => x.responseId === a.where.responseId && x.questionId === a.where.questionId); if (i >= 0) as.splice(i, 1); },
    },
    subOrder: {
      findMany: async (a: { where: Record<string, unknown> }) => subs.filter((s) => match(s as never, a.where)),
      updateMany: async (a: { where: Record<string, unknown>; data: Partial<S> }) => { const s = subs.find((x) => x.id === a.where.id && x.reviewMailSentAt === null && x.status === "DELIVERED" && x.returns === 0); if (s) Object.assign(s, a.data); return { count: s ? 1 : 0 }; },
      update: async (a: { where: { id: string }; data: Partial<S> }) => Object.assign(subs.find((x) => x.id === a.where.id)!, a.data),
    },
  };
  return { db: db as unknown as PrismaClient, qs, rs, as, subs, cfg, mk };
}

const DAY = 86_400_000;
const sub = (id: string, o: Partial<S> = {}): S => ({ id, status: "DELIVERED", reviewMailSentAt: null, deliveredAt: new Date(Date.now() - 5 * DAY), returns: 0, number: `AM-${id}`, ...o });

describe("types de question", () => {
  it("valide chaque type", () => {
    const sel = { type: "SELECT", options: JSON.stringify([{ fr: "A", en: "a" }, { fr: "B", en: "b" }]) };
    expect(normalizeAnswer({ type: "STARS", options: "[]" }, "5")).toBe("5");
    expect(normalizeAnswer({ type: "STARS", options: "[]" }, "6")).toBeNull();
    expect(normalizeAnswer({ type: "SCORE10", options: "[]" }, "10")).toBe("10");
    expect(normalizeAnswer({ type: "SCORE10", options: "[]" }, "0")).toBeNull();
    expect(normalizeAnswer(sel, "A")).toBe("A");
    expect(normalizeAnswer(sel, "Z")).toBeNull();
    expect(normalizeAnswer({ type: "TEXT", options: "[]" }, "  bonjour ")).toBe("bonjour");
    expect(normalizeAnswer({ type: "TEXT", options: "[]" }, "")).toBe("");
  });
});

describe("enquête : réponses", () => {
  it("obligatoire, brouillon repris, une seule réponse, lien invalide, déjà répondu", async () => {
    const f = fake();
    f.qs.push(f.mk("STARS", true), f.mk("TEXT", false));
    f.subs.push(sub("s1"));
    const r = await ensureSurvey(f.db, "s1", "fr");
    expect((await ensureSurvey(f.db, "s1", "fr")).token).toBe(r.token);
    expect(f.rs).toHaveLength(1);
    expect((await findSurveyByToken(f.db, "nope"))).toBeNull();
    expect((await saveSurveyAnswers(f.db, "x".repeat(48), {}, false)).result).toBe("invalid");
    expect((await saveSurveyAnswers(f.db, r.token, { [f.qs[0].id]: "9" }, false)).result).toBe("invalid");
    expect((await saveSurveyAnswers(f.db, r.token, { [f.qs[1].id]: "brouillon" }, false)).result).toBe("saved");
    const miss = await saveSurveyAnswers(f.db, r.token, {}, true);
    expect(miss).toEqual({ result: "missing", missing: [f.qs[0].id] });
    expect(await hasAnswered(f.db, "s1")).toBe(false);
    const resume = await findSurveyByToken(f.db, r.token);
    expect(resume?.answers.map((a) => a.value)).toEqual(["brouillon"]);
    expect((await saveSurveyAnswers(f.db, r.token, { [f.qs[0].id]: "4" }, true)).result).toBe("completed");
    expect(await hasAnswered(f.db, "s1")).toBe(true);
    expect((await saveSurveyAnswers(f.db, r.token, { [f.qs[0].id]: "1" }, true)).result).toBe("already");
    expect(f.as.find((a) => a.questionId === f.qs[0].id)?.value).toBe("4");
  });
});

describe("mail d'avis J+3", () => {
  it("envoyé une seule fois, pas avant le délai, pas si retour, pas si enquête désactivée, rejoué si échec", async () => {
    const f = fake();
    f.subs.push(sub("ok"), sub("tot", { deliveredAt: new Date(Date.now() - 1 * DAY) }), sub("retour", { returns: 1 }));
    const first = await claimReviewMails(f.db);
    expect(first.map((s) => s.id)).toEqual(["ok"]);
    expect(await claimReviewMails(f.db)).toEqual([]);
    await releaseReviewClaim(f.db, "ok");
    expect((await claimReviewMails(f.db)).map((s) => s.id)).toEqual(["ok"]);
    f.cfg.enabled = false;
    f.subs.push(sub("autre"));
    expect(await claimReviewMails(f.db)).toEqual([]);
  });
});

describe("versionnage et résultats", () => {
  it("modifier crée une nouvelle version, l'ancienne garde ses réponses ; stats et CSV par période", async () => {
    const f = fake();
    f.qs.push(f.mk("STARS", true));
    f.subs.push(sub("s1"), sub("s2"));
    const old = f.qs[0];
    const r1 = await ensureSurvey(f.db, "s1", "fr");
    await saveSurveyAnswers(f.db, r1.token, { [old.id]: "5" }, true, new Date("2026-11-10T10:00:00Z"));
    expect(await editQuestion(f.db, old.id, { type: "STARS", labelFr: "Nouvelle question", labelEn: "New question", required: true, options: [] })).toBe("ok");
    expect(old.archived).toBe(true);
    const v2 = f.qs.find((q) => !q.archived)!;
    expect(v2.version).toBe(2);
    expect(v2.key).toBe(old.key);
    const r2 = await ensureSurvey(f.db, "s2", "fr");
    await saveSurveyAnswers(f.db, r2.token, { [v2.id]: "3" }, true, new Date("2026-11-12T10:00:00Z"));
    const p = parsePeriod("2026-11-01", "2026-11-30")!;
    const st = await surveyStats(f.db, p.from, p.to);
    expect(st.responseCount).toBe(2);
    expect(st.stats.map((s) => [s.version, s.average, s.count])).toEqual([[1, 5, 1], [2, 3, 1]]);
    expect(st.stats[0].unit).toContain("étoiles");
    const csv = surveyCsv(st);
    expect(csv.split("\r\n")).toHaveLength(3);
    expect(csv).toContain("AM-s1");
    const narrow = parsePeriod("2026-11-11", "2026-11-30")!;
    expect((await surveyStats(f.db, narrow.from, narrow.to)).responseCount).toBe(1);
    expect(await addQuestion(f.db, { type: "SELECT", labelFr: "Liste", labelEn: "List", required: false, options: [{ fr: "A", en: "A" }] })).toBe("invalid");
  });

  it("période obligatoire et valide", () => {
    expect(parsePeriod(null, "2026-11-30")).toBeNull();
    expect(parsePeriod("2026-12-01", "2026-11-30")).toBeNull();
    expect(parsePeriod("2026-11-01", "2026-11-30")).not.toBeNull();
  });
});

describe("e-mail : boutons", () => {
  it("bouton plein « Donner mon avis » + bouton contour « Voir ma commande »", () => {
    const html = renderEmailHtml({ locale: "fr", title: "Votre avis compte", paragraphs: ["Bonjour"], cta: { label: "Donner mon avis", url: "https://x/fr/avis/t" }, secondaryCta: { label: "Voir ma commande", url: "https://x/o" } });
    expect(html).toMatch(/background:#000[^"]*">Donner mon avis/);
    expect(html).toMatch(/border:2px solid #000[^"]*">Voir ma commande/);
  });
});
