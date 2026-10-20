import { supabase } from "./supabase";
import type { ChatMessage, StoredAttachment } from "./chat";

/**
 * Histórico do co-piloto por projeto (tabela copilot_messages, migrações 0005
 * e 0008). Antes vivia só em memória no navegador e sumia ao sair da tela
 * (itens 1 e 12). Desde 0008 guarda também os anexos de cada pergunta e a
 * ficha da Biblioteca usada.
 */
export async function loadCopilotHistory(projectId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("copilot_messages")
    .select("role, content, created_at, attachments, prompt_id")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({
    role: r.role as ChatMessage["role"],
    content: r.content as string,
    attachments: (r.attachments as StoredAttachment[] | null) ?? undefined,
    promptId: r.prompt_id ?? undefined,
  }));
}

/**
 * Grava pergunta e resposta de uma vez, depois que a resposta chegou: se o
 * envio falhar, nada fica gravado pela metade.
 *
 * Os horários vão explícitos porque as duas linhas saem no mesmo INSERT e o
 * default now() daria o mesmo instante às duas, embaralhando a ordem.
 */
export async function appendCopilotExchange(
  projectId: string,
  authorId: string,
  question: { content: string; at: Date; attachments?: StoredAttachment[]; promptId?: string },
  answer: { content: string; at: Date }
): Promise<void> {
  // A resposta nunca pode empatar ou vir antes da pergunta.
  const answerAt = answer.at.getTime() <= question.at.getTime()
    ? new Date(question.at.getTime() + 1)
    : answer.at;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("copilot_messages") as any).insert([
    {
      project_id: projectId,
      author_id: authorId,
      role: "user",
      content: question.content,
      attachments: question.attachments?.length ? question.attachments : null,
      prompt_id: question.promptId ?? null,
      created_at: question.at.toISOString(),
    },
    { project_id: projectId, author_id: authorId, role: "assistant", content: answer.content, created_at: answerAt.toISOString() },
  ]);
  if (error) throw new Error(error.message);
}

/** Uso do co-piloto num período, para o Painel Executivo (dados reais). */
export interface CopilotUsageRow {
  projectId: string;
  authorId: string | null;
  role: "user" | "assistant";
  createdAt: string;
  promptId: string | null;
}

export async function loadCopilotUsage(sinceDays = 30): Promise<CopilotUsageRow[]> {
  const since = new Date(Date.now() - sinceDays * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("copilot_messages")
    .select("project_id, author_id, role, created_at, prompt_id")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) throw new Error(error.message);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({
    projectId: r.project_id,
    authorId: r.author_id,
    role: r.role,
    createdAt: r.created_at,
    promptId: r.prompt_id,
  }));
}

/** Perguntas mais recentes feitas ao co-piloto (trecho inicial de cada uma). */
export async function loadRecentQuestions(limit = 12): Promise<{ projectId: string; authorId: string | null; text: string; createdAt: string }[]> {
  const { data, error } = await supabase
    .from("copilot_messages")
    .select("project_id, author_id, content, created_at")
    .eq("role", "user")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({
    projectId: r.project_id,
    authorId: r.author_id,
    text: String(r.content).replace(/\s+/g, " ").slice(0, 180),
    createdAt: r.created_at,
  }));
}
