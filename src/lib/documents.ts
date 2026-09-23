import { supabase } from "./supabase";
import type { Document } from "@/types";

/**
 * Documentos do projeto (tabela documents, migração 0007). Antes a aba vivia
 * em memória: os cards sumiam ao sair da tela e o link era gravado como "#".
 * A Consulcard usa SharePoint — não Google Drive.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToDocument(row: any): Document {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    date: row.doc_date,
    sharepointUrl: row.url,
  };
}

export async function listDocuments(projectId: string): Promise<Document[]> {
  const { data, error } = await supabase
    .from("documents")
    .select("id, name, type, url, doc_date")
    .eq("project_id", projectId)
    .order("doc_date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToDocument);
}

export async function createDocument(
  projectId: string,
  authorId: string,
  doc: { name: string; url: string; type: Document["type"] }
): Promise<Document> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("documents") as any)
    .insert({ project_id: projectId, created_by: authorId, name: doc.name, url: doc.url, type: doc.type })
    .select("id, name, type, url, doc_date")
    .single();
  if (error) throw new Error(error.message);
  return rowToDocument(data);
}

export async function deleteDocument(id: string): Promise<void> {
  // Zero linhas = a regra de acesso barrou (só quem vinculou, diretor ou admin).
  const { data, error } = await supabase.from("documents").delete().eq("id", id).select("id");
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("Só quem vinculou o documento, um diretor ou um admin pode removê-lo.");
}
