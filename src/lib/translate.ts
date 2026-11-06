export type Lang = "fr" | "en";

// Fournisseur choisi par TRANSLATE_PROVIDER = "deepl" | "google" ; sans clé, retourne null (repli géré par l'appelant).
async function withTimeout(url: string, init: RequestInit) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 5000);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

export function translationConfigured() {
  const p = provider();
  return (p === "deepl" && !!process.env.DEEPL_API_KEY) || (p === "google" && !!process.env.GOOGLE_TRANSLATE_API_KEY);
}

// DeepL (API Free) par défaut ; quota atteint (456) ou erreur : pas de traduction, sans message.
function provider() {
  return (process.env.TRANSLATE_PROVIDER || "deepl").toLowerCase();
}

/** Traduit une liste de textes ; ne lève jamais d'erreur : retourne null si indisponible ou en échec. */
export async function translateTexts(texts: string[], from: Lang, to: Lang): Promise<string[] | null> {
  if (!translationConfigured() || texts.every((t) => !t.trim())) return null;
  try {
    if (provider() === "deepl") {
      const base = process.env.DEEPL_API_URL || "https://api-free.deepl.com";
      const res = await withTimeout(`${base}/v2/translate`, {
        method: "POST",
        headers: { Authorization: `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ text: texts, source_lang: from.toUpperCase(), target_lang: to.toUpperCase() }),
      });
      if (!res.ok) return null;
      const json = (await res.json()) as { translations?: { text: string }[] };
      return json.translations && json.translations.length === texts.length ? json.translations.map((t) => t.text) : null;
    }
    const res = await withTimeout(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(process.env.GOOGLE_TRANSLATE_API_KEY ?? "")}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: texts, source: from, target: to, format: "text" }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { translations?: { translatedText: string }[] } };
    const tr = json.data?.translations;
    return tr && tr.length === texts.length ? tr.map((t) => t.translatedText) : null;
  } catch (e) {
    console.warn("[translate] échec", e instanceof Error ? e.message : e);
    return null;
  }
}
