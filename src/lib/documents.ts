import { supabase } from "./supabase";
import type { Document } from "@/types";

/**
 * Documentos do projeto (tabela documents, migrações 0007 e 0008): links do
 * SharePoint vinculados à mão e arquivos guardados no sistema — anexos do
 * co-piloto e respostas salvas (testes de 06/10, backlog 5: os anexos do
 * co-piloto não apareciam aqui).
 */
const COLUMNS = "id, name, type, url, doc_date, storage_path, mime_type, size_bytes, source, created_by";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToDocument(row: any): Document {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    date: row.doc_date,
    sharepointUrl: row.url ?? undefined,
    storagePath: row.storage_path ?? undefined,
    mimeType: row.mime_type ?? undefined,
    sizeBytes: row.size_bytes ?? undefined,
    source: row.source ?? "link",
    createdBy: row.created_by ?? undefined,
  };
}

export async function listDocuments(projectId: string): Promise<Document[]> {
  const { data, error } = await supabase
    .from("documents")
    .select(COLUMNS)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToDocument);
}

/** Documento mais recente do projeto ("Último artefato" no co-piloto, GAP #11). */
export async function latestDocument(projectId: string): Promise<Document | null> {
  const { data, error } = await supabase
    .from("documents")
    .select(COLUMNS)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  return data?.[0] ? rowToDocument(data[0]) : null;
}

export async function createDocument(
  projectId: string,
  authorId: string,
  doc: { name: string; url: string; type: Document["type"] }
): Promise<Document> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("documents") as any)
    .insert({ project_id: projectId, created_by: authorId, name: doc.name, url: doc.url, type: doc.type, source: "link" })
    .select(COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return rowToDocument(data);
}

/** Envia um arquivo do computador para o projeto (aba Documentos). */
export async function uploadDocument(
  projectId: string,
  authorId: string,
  file: Blob,
  meta: { name: string; type: Document["type"]; source?: "upload" | "copiloto" }
): Promise<Document> {
  const safe = meta.name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9._-]+/g, "_").slice(-120);
  const path = `${projectId}/${authorId}/${crypto.randomUUID()}-${safe}`;
  const up = await supabase.storage.from("project-files").upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (up.error) throw new Error(`Não foi possível enviar "${meta.name}": ${up.error.message}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("documents") as any)
    .insert({
      project_id: projectId,
      created_by: authorId,
      name: meta.name,
      type: meta.type,
      storage_path: path,
      mime_type: file.type || null,
      size_bytes: file.size,
      source: meta.source ?? "upload",
    })
    .select(COLUMNS)
    .single();
  if (error) {
    // Sem o registro, o arquivo ficaria órfão no Storage.
    await supabase.storage.from("project-files").remove([path]);
    throw new Error(error.message);
  }
  return rowToDocument(data);
}

export async function deleteDocument(doc: Pick<Document, "id" | "storagePath">): Promise<void> {
  // Zero linhas = a regra de acesso barrou (só quem vinculou, diretor ou admin).
  const { data, error } = await supabase.from("documents").delete().eq("id", doc.id).select("id");
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("Só quem adicionou o documento, um diretor ou um admin pode removê-lo.");
  if (doc.storagePath) {
    // O texto extraído (.txt) de Word/PowerPoint fica ao lado do original.
    await supabase.storage.from("project-files").remove([doc.storagePath, `${doc.storagePath}.txt`]);
  }
}
