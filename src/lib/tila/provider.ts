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
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${this.apiKey}` },
      signal: AbortSignal.timeout(25_000),
      body: JSON.stringify({
        model: this.model,
        messages,
        max_completion_tokens: 700,
        ...(opts.tools ? { tools: TOOL_DEFS.map((t) => ({ type: "function", function: t })) } : {}),
      }),
    });
    if (!res.ok) throw new ModelUnavailableError(`model-http-${res.status}`);
    const data = (await res.json()) as { choices?: { message?: { content?: string | null; tool_calls?: ToolCall[] } }[] };
    const m = data.choices?.[0]?.message;
    return { content: m?.content ?? null, toolCalls: m?.tool_calls ?? [] };
  }
}

/** Choisi par TILA_PROVIDER (openai par défaut) ; TILA_MODEL fixe le modèle. Null si non configuré. */
export function getModel(env: NodeJS.ProcessEnv = process.env): ChatModel | null {
  const provider = (env.TILA_PROVIDER ?? "openai").toLowerCase();
  if (provider !== "openai" || !env.OPENAI_API_KEY) return null;
  return new OpenAIChatModel(env.OPENAI_API_KEY, env.TILA_MODEL?.trim() || "gpt-5-mini", env.TILA_BASE_URL?.trim() || "https://api.openai.com/v1");
}
