import { TOOL_DEFS } from "@/lib/tila/tools";

export type ChatMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };

export type ModelReply = { content: string | null; toolCalls: ToolCall[] };

/** Fournisseur interchangeable : le reste du code ne connaît que cette interface. */
export interface ChatModel {
  complete(messages: ChatMessage[], opts: { tools: boolean }): Promise<ModelReply>;
}

export class ModelUnavailableError extends Error {}

class OpenAIChatModel implements ChatModel {
  constructor(private apiKey: string, private model: string, private baseUrl: string) {}

  async complete(messages: ChatMessage[], opts: { tools: boolean }): Promise<ModelReply> {
    // Modèles de raisonnement : le raisonnement consomme le plafond de sortie, d'où un plafond large et un effort bas.
    const base = {
      model: this.model,
      messages,
      max_completion_tokens: 4000,
      ...(opts.tools ? { tools: TOOL_DEFS.map((t) => ({ type: "function", function: t })) } : {}),
    };
    let res = await this.post({ ...base, reasoning_effort: "low" });
    if (res.status === 400) res = await this.post(base); // modèle sans reasoning_effort
    if (!res.ok) {
      console.error(`[tila] model-http-${res.status}`);
      throw new ModelUnavailableError(`model-http-${res.status}`);
    }
    const data = (await res.json()) as {
      choices?: { finish_reason?: string; message?: { content?: string | null; tool_calls?: ToolCall[] } }[];
      usage?: { completion_tokens?: number; completion_tokens_details?: { reasoning_tokens?: number } };
    };
    const c = data.choices?.[0];
    const reply = { content: c?.message?.content ?? null, toolCalls: c?.message?.tool_calls ?? [] };
    if (!reply.content?.trim() && !reply.toolCalls.length) {
      console.error(`[tila] empty-reply model=${this.model} finish=${c?.finish_reason} completion=${data.usage?.completion_tokens} reasoning=${data.usage?.completion_tokens_details?.reasoning_tokens}`);
    }
    return reply;
  }

  private post(body: object) {
    return fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${this.apiKey}` },
      signal: AbortSignal.timeout(25_000),
      body: JSON.stringify(body),
    });
  }
}
/** Choisi par TILA_PROVIDER (openai par défaut) ; TILA_MODEL fixe le modèle. Null si non configuré. */
export function getModel(env: NodeJS.ProcessEnv = process.env): ChatModel | null {
  const provider = (env.TILA_PROVIDER ?? "openai").toLowerCase();
  if (provider !== "openai" || !env.OPENAI_API_KEY) return null;
  return new OpenAIChatModel(env.OPENAI_API_KEY, env.TILA_MODEL?.trim() || "gpt-5-mini", env.TILA_BASE_URL?.trim() || "https://api.openai.com/v1");
}
