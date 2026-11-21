"use client";

import { useState, useTransition } from "react";
import { submitSurveyAction } from "./actions";

export type WizardQuestion = { id: string; type: string; label: string; required: boolean; options: { value: string; label: string }[] };

const T = {
  fr: { q: "Question", of: "sur", prev: "Précédent", next: "Suivant", finish: "Terminer", required: "Réponse obligatoire.", err: "Une erreur est survenue, réessayez.", thanksT: "Merci pour votre avis !", thanksP: "Vos réponses nous aident à améliorer E póm ta’ et à mieux accompagner les créateurs.", choose: "Choisir…", optional: "facultatif", stars: "étoiles", home: "Retour à la boutique" },
  en: { q: "Question", of: "of", prev: "Previous", next: "Next", finish: "Finish", required: "Answer required.", err: "Something went wrong, please try again.", thanksT: "Thank you for your feedback!", thanksP: "Your answers help us improve E póm ta’ and better support our creators.", choose: "Choose…", optional: "optional", stars: "stars", home: "Back to the shop" },
};

const btnPlain = "inline-flex min-h-12 items-center justify-center rounded-md bg-primary px-6 text-sm font-semibold uppercase tracking-wide text-primary-foreground disabled:opacity-50";
const btnOutline = "inline-flex min-h-12 items-center justify-center rounded-md border-2 border-foreground px-6 text-sm font-semibold uppercase tracking-wide disabled:opacity-50";

export function SurveyWizard({ token, locale, questions, initial }: { token: string; locale: "fr" | "en"; questions: WizardQuestion[]; initial: Record<string, string> }) {
  const t = T[locale];
  const [i, setI] = useState(0);
  const [vals, setVals] = useState<Record<string, string>>(initial);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  const q = questions[i];
  const last = i === questions.length - 1;
  const set = (v: string) => setVals((p) => ({ ...p, [q.id]: v }));

  if (done)
    return (
      <div className="space-y-4 py-10 text-center" role="status">
        <h2 className="font-heading text-3xl">{t.thanksT}</h2>
        <div className="mx-auto h-px w-10 bg-accent" />
        <p className="text-muted-foreground">{t.thanksP}</p>
        <a href={`/${locale}`} className={btnOutline}>{t.home}</a>
      </div>
    );
  if (!q) return null;

  function go(delta: number) {
    setError("");
    if (delta > 0 && q.required && !(vals[q.id] ?? "").trim()) return setError(t.required);
    start(async () => {
      const finish = delta > 0 && last;
      const res = await submitSurveyAction(token, vals, finish).catch(() => ({ result: "error" } as { result: string; missing?: string[] }));
      if (res.result === "completed" || res.result === "already") return setDone(true);
      if (res.result === "missing") {
        const idx = questions.findIndex((x) => res.missing?.includes(x.id));
        if (idx >= 0) setI(idx);
        return setError(t.required);
      }
      if (res.result !== "saved") return setError(t.err);
      setI((n) => Math.min(questions.length - 1, Math.max(0, n + delta)));
    });
  }

  const v = vals[q.id] ?? "";
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">{t.q} {i + 1} {t.of} {questions.length}</p>
        <div className="mt-2 h-0.5 w-full overflow-hidden bg-border" role="progressbar" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={i + 1}>
          <div className="h-full bg-accent transition-all" style={{ width: `${((i + 1) / questions.length) * 100}%` }} />
        </div>
      </div>
      <fieldset className="space-y-4">
        <legend className="text-xl font-semibold">{q.label}{!q.required && <span className="ml-2 text-sm font-normal text-muted-foreground">({t.optional})</span>}</legend>
        {q.type === "TEXT" && <textarea value={v} onChange={(e) => set(e.target.value)} maxLength={2000} rows={5} className="w-full rounded-md border bg-background p-3" aria-label={q.label} />}
        {q.type === "SELECT" && (
          <select value={v} onChange={(e) => set(e.target.value)} className="min-h-12 w-full rounded-md border bg-background px-3" aria-label={q.label}>
            <option value="">{t.choose}</option>
            {q.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}
        {q.type === "STARS" && (
          <div className="flex gap-1" role="radiogroup" aria-label={q.label}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={v === String(n)} aria-label={`${n} ${t.stars}`} onClick={() => set(String(n))} className={`size-12 text-3xl leading-none ${Number(v) >= n ? "text-amber-500" : "text-muted-foreground/40"}`}>★</button>
            ))}
          </div>
        )}
        {q.type === "SCORE10" && (
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-10" role="radiogroup" aria-label={q.label}>
            {Array.from({ length: 10 }, (_, k) => k + 1).map((n) => (
              <button key={n} type="button" role="radio" aria-checked={v === String(n)} onClick={() => set(String(n))} className={`min-h-12 rounded-md border text-base font-semibold ${v === String(n) ? "bg-primary text-primary-foreground" : ""}`}>{n}</button>
            ))}
          </div>
        )}
      </fieldset>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex justify-between gap-3">
        <button type="button" className={btnOutline} disabled={pending || i === 0} onClick={() => go(-1)}>{t.prev}</button>
        <button type="button" className={btnPlain} disabled={pending} onClick={() => go(1)}>{last ? t.finish : t.next}</button>
      </div>
    </div>
  );
}
