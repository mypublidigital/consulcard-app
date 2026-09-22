import { supabase } from "./supabase";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  agentType: "director" | "copilot";
  projectContext?: Record<string, unknown>;
  /** Portfólio real enviado ao agente executivo (antes ele tinha dados fictícios). */
  portfolio?: unknown;
  /** Tier da ficha da biblioteca (T1/T2/T3); o backend escolhe o modelo por ele. */
  tier?: "T1" | "T2" | "T3";
  /** Recebe cada trecho assim que chega, para a resposta aparecer enquanto é escrita. */
  onText?: (fullTextSoFar: string) => void;
}

export interface ChatResult {
  content: string;
  /** "max_tokens" = a resposta foi cortada pelo limite de tamanho. */
  stopReason: string | null;
  model: string | null;
}

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

/**
 * Chama a Edge Function `chat` (proxy para a Anthropic; a chave nunca sai do
 * servidor) e lê a resposta em streaming NDJSON.
 *
 * Streaming evita timeout em respostas longas — antes o limite era 1.500
 * tokens e respostas grandes chegavam cortadas (itens 8 e 10).
 */
export async function sendChatMessage(messages: ChatMessage[], options: ChatOptions): Promise<ChatResult> {
  const { data: { session } } = await supabase.auth.getSession();
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${session?.access_token ?? anonKey}`,
    },
    body: JSON.stringify({
      messages,
      agentType: options.agentType,
      projectContext: options.projectContext,
      portfolio: options.portfolio,
      tier: options.tier,
      stream: true,
    }),
  });

  if (!res.ok || !res.body) {
    let detail = `Erro ${res.status} ao chamar o co-piloto.`;
    try {
      const j = await res.json();
      if (j?.error) detail = String(j.error);
    } catch { /* corpo não-JSON */ }
    throw new Error(detail);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  let stopReason: string | null = null;
  let model: string | null = null;

  const handleLine = (line: string) => {
    if (!line.trim()) return;
    const evt = JSON.parse(line);
    if (evt.type === "text") {
      content += evt.text;
      options.onText?.(content);
    } else if (evt.type === "done") {
      stopReason = evt.stop_reason ?? null;
      model = evt.model ?? null;
    } else if (evt.type === "error") {
      throw new Error(evt.error || "Erro no co-piloto.");
    }
  };

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    // Um evento por linha; a última pode estar incompleta e fica no buffer.
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    lines.forEach(handleLine);
  }
  handleLine(buffer);

  if (stopReason === null) throw new Error("A conexão caiu antes de a resposta terminar.");
  if (!content && stopReason !== "refusal") throw new Error("Resposta vazia do co-piloto.");
  if (stopReason === "refusal") throw new Error("O modelo recusou esta solicitação.");

  return { content, stopReason, model };
}
