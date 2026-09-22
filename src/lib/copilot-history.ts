import { supabase } from "./supabase";
import type { ChatMessage } from "./chat";

/**
 * Histórico do co-piloto por projeto (tabela copilot_messages, migração 0005).
 * Antes vivia só em memória no navegador e sumia ao sair da tela (itens 1 e 12).
 */
export async function loadCopilotHistory(projectId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("copilot_messages")
    .select("role, content, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({ role: r.role as ChatMessage["role"], content: r.content as string }));
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
  question: { content: string; at: Date },
  answer: { content: string; at: Date }
): Promise<void> {
  // A resposta nunca pode empatar ou vir antes da pergunta.
  const answerAt = answer.at.getTime() <= question.at.getTime()
    ? new Date(question.at.getTime() + 1)
    : answer.at;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("copilot_messages") as any).insert([
    { project_id: projectId, author_id: authorId, role: "user", content: question.content, created_at: question.at.toISOString() },
    { project_id: projectId, author_id: authorId, role: "assistant", content: answer.content, created_at: answerAt.toISOString() },
  ]);
  if (error) throw new Error(error.message);
}
