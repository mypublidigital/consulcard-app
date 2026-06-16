import { supabase } from "./supabase";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  agentType: "director" | "copilot";
  projectContext?: Record<string, unknown>;
}

/**
 * Calls the Supabase Edge Function `chat` which proxies to the Anthropic API.
 * The API key never leaves the server.
 */
export async function sendChatMessage(
  messages: ChatMessage[],
  options: ChatOptions
): Promise<string> {
  const { data, error } = await supabase.functions.invoke("chat", {
    body: {
      messages,
      agentType: options.agentType,
      projectContext: options.projectContext,
    },
  });

  if (error) {
    // On non-2xx, supabase-js puts the response body in error.context, not data.
    let detail = error.message ?? "Erro ao chamar o co-piloto.";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = (error as any)?.context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const body = await ctx.json();
        if (body?.error) detail = String(body.error);
      } catch {
        try {
          const txt = await ctx.text?.();
          if (txt) detail = txt;
        } catch { /* ignore */ }
      }
    }
    throw new Error(detail);
  }
  if (data?.error) throw new Error(data.error);
  if (!data?.content) throw new Error("Resposta vazia do co-piloto.");

  return data.content as string;
}
