import { supabase } from "./supabase";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  /** Arquivos anexados nesta mensagem (guardados no Storage do projeto). */
  attachments?: StoredAttachment[];
  /** Ficha da Biblioteca usada nesta pergunta. */
  promptId?: string;
}

/**
 * Anexo guardado no projeto. Vai ao modelo em TODA pergunta como referência;
 * a Edge Function busca o conteúdo no Storage (testes de 06/10, GAPs #7 e #9:
 * antes o arquivo só ia na pergunta em que foi anexado e o modelo o "esquecia").
 */
export interface StoredAttachment {
  documentId?: string;
  name: string;
  /** Como o modelo lê: PDF (documento), imagem, ou texto extraído (Word, PPT, transcrição). */
  kind: "pdf" | "image" | "text";
  /** Arquivo lido pelo modelo: o original, ou o .txt extraído quando kind = "text". */
  storagePath: string;
  mimeType?: string;
}

/** Bloco de conteúdo enviado à Edge Function. */
export type ApiContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
  | { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } }
  | { type: "stored_file"; path: string; name: string; as: StoredAttachment["kind"]; media_type?: string };

/** Mensagem como vai para a API: texto simples ou blocos (quando há anexo). */
export interface ApiMessage {
  role: "user" | "assistant";
  content: string | ApiContentBlock[];
}

export interface ChatOptions {
  agentType: "director" | "copilot";
  projectContext?: Record<string, unknown>;
  /** Portfólio real enviado ao agente executivo (antes ele tinha dados fictícios). */
  portfolio?: unknown;
  /** Tier da ficha da biblioteca (T1/T2/T3); o backend escolhe o modelo por ele. */
  tier?: "T1" | "T2" | "T3";
  /** Fichas disponíveis, para o agente apontar a certa em vez de improvisar. */
  promptCatalog?: { id: string; title: string; activity: string }[];
  /** Recebe cada trecho assim que chega, para a resposta aparecer enquanto é escrita. */
  onText?: (fullTextSoFar: string) => void;
  /** Etapa atual: "thinking" (raciocinando), "writing", "continuing" (emendando). */
  /** detail: nome do documento quando status = "reading". */
  onStatus?: (status: ChatStatus, detail?: string) => void;
  /** Projeto do co-piloto: ele pode abrir os documentos da aba Documentos. */
  projectId?: string;
  /** "Parar" no app (GAP #6): interrompe a resposta e mantém o que já veio. */
  signal?: AbortSignal;
  /** Etapa de continuação: o servidor reduz o raciocínio e só segue escrevendo. */
  continuation?: boolean;
}

export type ChatStatus = "waiting" | "thinking" | "writing" | "continuing" | "reading";

export interface ChatResult {
  content: string;
  /**
   * "end_turn" = completa. "max_tokens" = cortada pelo tamanho.
   * "time_limit" = a função parou perto do limite de tempo do servidor.
   * "connection_lost" = a conexão caiu depois de chegar parte do texto.
   * "aborted" = o usuário clicou em Parar.
   */
  stopReason: string | null;
  model: string | null;
}

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

/**
 * Chama a Edge Function `chat` (proxy para a Anthropic; a chave nunca sai do
 * servidor) e lê a resposta em streaming NDJSON. Uma única chamada: para
 * respostas longas use sendChatWithContinuation.
 */
export async function sendChatMessage(messages: ApiMessage[], options: ChatOptions): Promise<ChatResult> {
  const { data: { session } } = await supabase.auth.getSession();
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

  let res: Response;
  try {
    res = await fetch(FUNCTION_URL, {
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
        promptCatalog: options.promptCatalog,
        tier: options.tier,
        stream: true,
        continuation: options.continuation || undefined,
        projectId: options.projectId,
      }),
      signal: options.signal,
    });
  } catch (err) {
    if (options.signal?.aborted) return { content: "", stopReason: "aborted", model: null };
    throw new Error(`Não foi possível conectar ao co-piloto: ${err instanceof Error ? err.message : err}`);
  }

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
  let serverError: string | null = null;

  const handleLine = (line: string) => {
    if (!line.trim()) return;
    const evt = JSON.parse(line);
    if (evt.type === "text") {
      if (!content) options.onStatus?.("writing");
      content += evt.text;
      options.onText?.(content);
    } else if (evt.type === "status" && evt.status === "thinking") {
      options.onStatus?.("thinking");
    } else if (evt.type === "status" && evt.status === "reading") {
      options.onStatus?.("reading", evt.document);
    } else if (evt.type === "done") {
      stopReason = evt.stop_reason ?? null;
      model = evt.model ?? null;
    } else if (evt.type === "error") {
      serverError = evt.error || "Erro no co-piloto.";
    }
    // "ping": só mantém a conexão viva.
  };

  try {
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
  } catch (err) {
    if (options.signal?.aborted) return { content, stopReason: "aborted", model };
    // Queda no meio da leitura: o que já chegou é aproveitado e a continuação emenda o resto.
    if (content && !(err instanceof SyntaxError)) return { content, stopReason: "connection_lost", model };
    throw err;
  }

  if (serverError) throw new Error(serverError);
  if (stopReason === null) {
    if (options.signal?.aborted) return { content, stopReason: "aborted", model };
    if (content) return { content, stopReason: "connection_lost", model };
    throw new Error("A conexão caiu antes de a resposta começar.");
  }
  if (stopReason === "refusal") throw new Error("O modelo recusou esta solicitação.");
  if (!content && stopReason !== "time_limit") throw new Error("Resposta vazia do co-piloto.");

  return { content, stopReason, model };
}

/** Quantas vezes, no máximo, uma resposta é emendada (≈ 2 min por etapa). */
const MAX_CONTINUATIONS = 8;

export const CONTINUE_INSTRUCTION =
  "Continue exatamente do ponto em que sua resposta anterior parou, a partir do próximo caractere. " +
  "Não repita nada do que já foi escrito, não faça introdução e não reabra bloco de código que já estava aberto.";

/**
 * Resposta longa em várias etapas (testes de 06/10, GAPs #10, #12 e #14).
 *
 * O servidor encerra a função perto do limite de tempo do plano. Antes isso
 * aparecia como "A conexão caiu" e o fluxograma nunca saía. Agora, quando a
 * etapa termina por tempo, queda de conexão ou tamanho, o texto recebido vai
 * como resposta parcial e uma nova chamada pede a continuação; as partes são
 * emendadas e o usuário vê uma resposta só.
 */
export async function sendChatWithContinuation(messages: ApiMessage[], options: ChatOptions): Promise<ChatResult> {
  let full = "";
  let last: ChatResult = { content: "", stopReason: null, model: null };
  let emptyRounds = 0;

  for (let round = 0; round <= MAX_CONTINUATIONS; round++) {
    const history: ApiMessage[] = full
      ? [...messages, { role: "assistant", content: full }, { role: "user", content: CONTINUE_INSTRUCTION }]
      : messages;
    if (round > 0) options.onStatus?.("continuing");

    const prefix = full;
    last = await sendChatMessage(history, {
      ...options,
      continuation: round > 0,
      onText: (t) => options.onText?.(joinContinuation(prefix, t)),
    });
    full = joinContinuation(prefix, last.content);

    const resumable = last.stopReason === "time_limit" || last.stopReason === "connection_lost" || last.stopReason === "max_tokens";
    if (!resumable) break;
    if (!last.content) {
      // Etapa inteira só raciocinando, sem escrever: tenta de novo uma vez.
      if (++emptyRounds > 1) {
        if (!full) throw new Error("O co-piloto levou tempo demais raciocinando sem começar a responder. Tente dividir o pedido em partes menores.");
        break;
      }
    }
  }

  return { ...last, content: full };
}

/**
 * Emenda a continuação ao texto anterior, removendo o trecho que o modelo
 * eventualmente repete na junção e a reabertura de bloco de código.
 */
export function joinContinuation(previous: string, next: string): string {
  if (!previous) return next;
  let tail = next;
  // Dentro de um bloco de código ainda aberto, o modelo às vezes reabre "```xml".
  const openFence = (previous.match(/```/g)?.length ?? 0) % 2 === 1;
  if (openFence) tail = tail.replace(/^\s*```[a-zA-Z]*\s*\n/, "");
  // Sobreposição: o fim do anterior repetido no começo da continuação.
  const max = Math.min(400, previous.length, tail.length);
  for (let n = max; n >= 12; n--) {
    if (previous.endsWith(tail.slice(0, n))) {
      tail = tail.slice(n);
      break;
    }
  }
  return previous + tail;
}
