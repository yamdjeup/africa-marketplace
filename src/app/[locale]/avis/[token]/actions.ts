"use server";

import { db } from "@/lib/db";
import { saveSurveyAnswers } from "@/lib/survey";

// Le jeton secret tient lieu d'authentification (lien du mail) ; aucune autre donnée n'est lisible ici.
export async function submitSurveyAction(token: string, values: Record<string, string>, finish: boolean): Promise<{ result: string; missing?: string[] }> {
  return saveSurveyAnswers(db, String(token), values, finish);
}
