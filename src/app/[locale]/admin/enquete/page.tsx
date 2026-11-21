import { db } from "@/lib/db";
import type { Locale } from "@/lib/i18n";
import { tr } from "@/lib/tr";
import { getSurveyConfig, parseOptions, surveyStats } from "@/lib/survey";
import { ConfigTabs } from "../config-tabs";
import { addQuestionAction, duplicateQuestionAction, moveQuestionAction, saveQuestionAction, saveSurveyConfigAction, toggleQuestionAction } from "./actions";
import { parsePeriod } from "./period";

export const metadata = { title: "Enquête de satisfaction", robots: { index: false } };

const btn = "inline-flex min-h-11 items-center rounded-md border px-3 text-sm";
const btnPlain = "inline-flex min-h-11 items-center rounded-md bg-primary px-3 text-sm text-primary-foreground";
const btnOutline = "inline-flex min-h-11 items-center rounded-md border-2 border-foreground/60 px-3 text-sm";
const cell = "w-full rounded-md border bg-background px-2 py-1 text-sm";
const TYPES: [string, string, string][] = [["TEXT", "Texte libre", "Free text"], ["SELECT", "Liste déroulante", "Dropdown"], ["STARS", "Étoiles (1–5)", "Stars (1–5)"], ["SCORE10", "Note 1–10", "Score 1–10"]];

export default async function AdminSurvey({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ ok?: string; error?: string; from?: string; to?: string }> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const fr = locale !== "en";
  const cfg = await getSurveyConfig(db);
  const questions = await db.surveyQuestion.findMany({ where: { archived: false }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] });
  const period = parsePeriod(sp.from, sp.to);
  const stats = period ? await surveyStats(db, period.from, period.to) : null;
  const typeSelect = (name: string, v?: string) => (
    <select name={name} defaultValue={v} className={cell} aria-label="Type">{TYPES.map(([k, f, e]) => <option key={k} value={k}>{fr ? f : e}</option>)}</select>
  );
  return (
    <>
      <ConfigTabs locale={locale} current="enquete" />
      <h2 className="text-2xl font-semibold text-primary">{tr(locale, "Enquête de satisfaction", "Satisfaction survey")}</h2>
      <p className="text-sm text-muted-foreground">{tr(locale, "Visible uniquement par l'administration. Modifier une question crée une nouvelle version : les anciennes réponses restent liées à l'ancienne version.", "Visible to administrators only. Editing a question creates a new version: earlier answers stay linked to the earlier version.")}</p>
      {sp.ok && <p role="status" className="rounded-md border border-green-300 bg-green-50 p-3 text-sm">{tr(locale, "Enregistré.", "Saved.")}</p>}
      {sp.error && <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm">{tr(locale, "Données invalides (libellés FR/EN de 3 caractères minimum ; liste : 2 options minimum, une par ligne « FR | EN »).", "Invalid data (FR/EN labels of at least 3 characters; dropdown: at least 2 options, one per line “FR | EN”).")}</p>}

      <form action={saveSurveyConfigAction} className="flex flex-wrap items-end gap-3 rounded-lg border p-3">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="enabled" defaultChecked={cfg.enabled} className="size-5" />{tr(locale, "Enquête active (mail d'avis envoyé)", "Survey enabled (review e-mail sent)")}</label>
        <label className="text-sm">{tr(locale, "Délai après livraison (jours)", "Delay after delivery (days)")}<input type="number" name="delayDays" min={0} max={60} defaultValue={cfg.delayDays} className={`${cell} w-24`} /></label>
        <button className={btnPlain} type="submit">{tr(locale, "Enregistrer", "Save")}</button>
      </form>

      <h3 className="text-lg font-semibold">{tr(locale, "Questions", "Questions")}</h3>
      <div className="space-y-3">
        {questions.map((q) => (
          <div key={q.id}><form action={saveQuestionAction} className={`grid items-end gap-2 rounded-lg border p-3 sm:grid-cols-2 ${q.active ? "" : "bg-muted/40"}`}>
            <input type="hidden" name="id" value={q.id} />
            <label className="text-sm">FR<input name="labelFr" defaultValue={q.labelFr} className={cell} maxLength={300} /></label>
            <label className="text-sm">EN<input name="labelEn" defaultValue={q.labelEn} className={cell} maxLength={300} /></label>
            <label className="text-sm">Type{typeSelect("type", q.type)}</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="required" defaultChecked={q.required} className="size-5" />{tr(locale, "Obligatoire", "Required")}</label>
            <label className="text-sm sm:col-span-2">{tr(locale, "Options (liste uniquement, une par ligne « FR | EN »)", "Options (dropdown only, one per line “FR | EN”)")}<textarea name="options" rows={3} defaultValue={parseOptions(q.options).map((o) => `${o.fr} | ${o.en}`).join("\n")} className={cell} /></label>
            <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
              <span className="text-xs text-muted-foreground">v{q.version} · {q.active ? tr(locale, "Active", "Active") : tr(locale, "Désactivée", "Disabled")}</span>
              <button className={btnPlain} type="submit">{tr(locale, "Enregistrer", "Save")}</button>
            </div>
          </form>
          <div className="flex flex-wrap items-center gap-2 -mt-1 mb-1 px-3">
            <form action={toggleQuestionAction}><input type="hidden" name="id" value={q.id} /><input type="hidden" name="to" value={q.active ? "0" : "1"} /><button className={btnOutline} type="submit">{q.active ? tr(locale, "Désactiver", "Disable") : tr(locale, "Activer", "Enable")}</button></form>
            <form action={duplicateQuestionAction}><input type="hidden" name="id" value={q.id} /><button className={btnOutline} type="submit">{tr(locale, "Dupliquer", "Duplicate")}</button></form>
            <form action={moveQuestionAction}><input type="hidden" name="move" value={`${q.id}:up`} /><button className={btn} type="submit" aria-label={tr(locale, "Monter", "Move up")}>↑</button></form>
            <form action={moveQuestionAction}><input type="hidden" name="move" value={`${q.id}:down`} /><button className={btn} type="submit" aria-label={tr(locale, "Descendre", "Move down")}>↓</button></form>
          </div>
        </div>
        ))}
      </div>

      <form action={addQuestionAction} className="grid gap-2 rounded-lg border border-dashed p-3 sm:grid-cols-2">
        <label className="text-sm">FR<input name="labelFr" required minLength={3} maxLength={300} className={cell} /></label>
        <label className="text-sm">EN<input name="labelEn" required minLength={3} maxLength={300} className={cell} /></label>
        <label className="text-sm">Type{typeSelect("type")}</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="required" className="size-5" />{tr(locale, "Obligatoire", "Required")}</label>
        <label className="text-sm sm:col-span-2">{tr(locale, "Options (liste uniquement)", "Options (dropdown only)")}<textarea name="options" rows={3} className={cell} placeholder="Réseaux sociaux | Social media" /></label>
        <div className="sm:col-span-2"><button className={btnPlain} type="submit">{tr(locale, "Ajouter une question", "Add a question")}</button></div>
      </form>

      <h3 className="text-lg font-semibold">{tr(locale, "Aperçu avant publication (questions actives)", "Preview before publishing (active questions)")}</h3>
      <ol className="list-decimal space-y-1 rounded-lg border p-3 pl-8 text-sm">
        {questions.filter((q) => q.active).map((q) => (
          <li key={q.id}>{fr ? q.labelFr : q.labelEn} — <em>{TYPES.find((t) => t[0] === q.type)?.[fr ? 1 : 2]}{q.required ? (fr ? ", obligatoire" : ", required") : ""}</em></li>
        ))}
      </ol>

      <h3 className="text-lg font-semibold">{tr(locale, "Résultats", "Results")}</h3>
      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="text-sm">{tr(locale, "Du (obligatoire)", "From (required)")}<input type="date" name="from" required defaultValue={sp.from} className={cell} /></label>
        <label className="text-sm">{tr(locale, "Au (obligatoire)", "To (required)")}<input type="date" name="to" required defaultValue={sp.to} className={cell} /></label>
        <button className={btnPlain} type="submit">{tr(locale, "Afficher", "Show")}</button>
        {period && <a className={btnOutline} href={`/${locale}/admin/enquete/export?from=${sp.from}&to=${sp.to}`}>{tr(locale, "Exporter en CSV", "Export CSV")}</a>}
      </form>
      {!period && <p className="text-sm text-muted-foreground">{tr(locale, "Choisissez une période (dates UTC, bornes incluses).", "Choose a period (UTC dates, inclusive).")}</p>}
      {stats && (
        <div className="space-y-3">
          <p className="text-sm">{stats.responseCount} {tr(locale, "enquêtes complétées sur la période.", "completed surveys in the period.")}</p>
          {stats.stats.map((s) => (
            <div key={`${s.key}-${s.version}`} className="rounded-lg border p-3 text-sm">
              <p className="font-medium">{fr ? s.labelFr : s.labelEn} <span className="text-xs text-muted-foreground">(v{s.version} · {s.unit})</span></p>
              <p>{tr(locale, "Réponses", "Answers")} : {s.count}{s.average !== null && ` · ${tr(locale, "Moyenne", "Average")} : ${s.average.toFixed(2)} (${s.unit})`}</p>
              {Object.keys(s.distribution).length > 0 && <p className="text-muted-foreground">{Object.entries(s.distribution).sort().map(([k, n]) => `${k}: ${n}`).join(" · ")}</p>}
              {s.texts.length > 0 && <ul className="mt-1 list-disc pl-5">{s.texts.map((t, i) => <li key={i}>{t}</li>)}</ul>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
