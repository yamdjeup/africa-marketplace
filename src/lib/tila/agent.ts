import { maskPersonalData } from "@/lib/tila/privacy";
import type { ChatMessage, ChatModel } from "@/lib/tila/provider";
import { runTool, type TilaProduct, type ToolDeps } from "@/lib/tila/tools";
import { systemPrompt } from "@/lib/tila/prompt";

export const MAX_TOOL_CALLS = 4;
export const MAX_SHOWN = 3;
const SLUG_MARK = /\[\[([a-z0-9][a-z0-9-]*)\]\]/gi;

export type TilaTurn = { role: "user" | "assistant"; content: string };
const MAX_TURNS = 12;
const MAX_CHARS = 500;

/** Validation stricte : seuls les rôles user/assistant sont acceptés, jamais de message « system » venant du navigateur. */
export function parseTurns(body: unknown): TilaTurn[] | null {
  const raw = (body as { messages?: unknown } | null)?.messages;
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_TURNS) return null;
  const turns: TilaTurn[] = [];
  for (const m of raw) {
    const { role, content } = (m ?? {}) as { role?: unknown; content?: unknown };
    if ((role !== "user" && role !== "assistant") || typeof content !== "string" || !content.trim() || content.length > MAX_CHARS) return null;
    turns.push({ role, content });
  }
  return turns[turns.length - 1].role === "user" ? turns : null;
}

export type TilaAnswer = { reply: string; products: TilaProduct[] };

/** Boucle outils plafonnée ; seules les pièces réellement renvoyées par les outils peuvent être montrées. */
export async function runTila(model: ChatModel, history: TilaTurn[], locale: "fr" | "en", deps: ToolDeps): Promise<TilaAnswer> {
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt(locale) },
    ...history.map((m) => ({ role: m.role, content: maskPersonalData(m.content) }) as ChatMessage),
  ];
  const known = new Map<string, TilaProduct>();
  let calls = 0;
  let content = "";

  for (let round = 0; round <= MAX_TOOL_CALLS; round++) {
    const reply = await model.complete(messages, { tools: calls < MAX_TOOL_CALLS });
    if (!reply.toolCalls.length || calls >= MAX_TOOL_CALLS) {
      content = reply.content ?? "";
      break;
    }
    messages.push({ role: "assistant", content: reply.content, tool_calls: reply.toolCalls });
    for (const call of reply.toolCalls) {
      let result: unknown = { erreur: "Appel refusé : trop d'appels." };
      if (calls < MAX_TOOL_CALLS) {
        calls++;
        let args: unknown = {};
        try {
          args = JSON.parse(call.function.arguments || "{}");
        } catch {
          args = {};
        }
        const out = await runTool(call.function.name, args, deps);
        for (const p of out.products) known.set(p.slug, p);
        result = out.result;
      }
      messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
    }
  }

  const shown: TilaProduct[] = [];
  const text = content
    .replace(SLUG_MARK, (_, slug: string) => {
      const p = known.get(slug.toLowerCase()) ?? known.get(slug);
      if (p && !shown.includes(p) && shown.length < MAX_SHOWN) shown.push(p);
      return "";
    })
    .replace(/[ \t]+\n/g, "\n")
    .replace(/ {2,}/g, " ")
    .trim();
  const fallback = locale === "en" ? "Sorry, I could not find an answer. Could you rephrase?" : "Désolée, je n'ai pas de réponse. Pouvez-vous reformuler ?";
  return { reply: text || fallback, products: shown };
}
