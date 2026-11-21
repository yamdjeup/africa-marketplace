import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { isLocale } from "@/lib/i18n";
import { findSurveyByToken, getSurveyConfig, listActiveQuestions, parseOptions } from "@/lib/survey";
import { SurveyWizard } from "./wizard";

export const metadata = { title: "Votre avis", robots: { index: false, follow: false } };

export default async function SurveyPage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { locale: l, token } = await params;
  if (!isLocale(l)) notFound();
  const locale = l === "en" ? "en" : "fr";
  const fr = locale === "fr";
  const resp = await findSurveyByToken(db, token);
  const cfg = await getSurveyConfig(db);
  if (!resp || !cfg.enabled) notFound();
  const banner = (
    <div className="bg-primary px-4 py-6 text-center text-primary-foreground">
      <p className="font-heading text-2xl">E póm ta’</p>
      <h1 className="mt-1 text-sm uppercase tracking-widest">{fr ? "Donnez votre avis" : "Rate your experience"}</h1>
    </div>
  );
  if (resp.completedAt)
    return (
      <main className="mx-auto max-w-xl">
        {banner}
        <p role="status" className="p-8 text-center text-lg">{fr ? "Nous avons déjà reçu votre avis, merci !" : "We have already received your feedback, thank you!"}</p>
      </main>
    );
  const qs = await listActiveQuestions(db);
  if (!qs.length) notFound();
  const questions = qs.map((q) => ({ id: q.id, type: q.type, label: fr ? q.labelFr : q.labelEn, required: q.required, options: parseOptions(q.options).map((o) => ({ value: o.fr, label: fr ? o.fr : o.en })) }));
  const initial = Object.fromEntries(resp.answers.filter((a) => qs.some((q) => q.id === a.questionId)).map((a) => [a.questionId, a.value]));
  return (
    <main className="mx-auto max-w-xl pb-10">
      {banner}
      <div className="p-5"><SurveyWizard token={token} locale={locale} questions={questions} initial={initial} /></div>
    </main>
  );
}
