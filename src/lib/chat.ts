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
    const detail = data?.error ?? error.message ?? "Erro ao chamar o co-piloto.";
    throw new Error(detail);
  }
  if (data?.error) throw new Error(data.error);
  if (!data?.content) throw new Error("Resposta vazia do co-piloto.");

  return data.content as string;
}
