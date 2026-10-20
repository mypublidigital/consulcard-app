import { supabase } from "./supabase";
import type { ApiContentBlock, StoredAttachment } from "./chat";
import { toImageAttachment } from "./images";
import { readTranscriptFile } from "./transcript";
import type { Document } from "@/types";

/**
 * Anexos do co-piloto.
 *
 * Testes da Consulcard de 06/10:
 * - GAP #9 / backlog 5: o anexo ia ao modelo só na pergunta em que foi
 *   anexado e não aparecia na aba Documentos. Agora todo anexo é guardado no
 *   Storage do projeto, registrado em Documentos e reenviado (por referência)
 *   em todas as perguntas seguintes.
 * - GAP #5 (imagem da evidência): "Anexar" recusava .docx e mandava usar o
 *   botão Transcrição. Agora aceita Word, PowerPoint, texto, XML e CSV.
 * - GAP #5: .mp4 não é lido pelo modelo — a mensagem orienta a usar a
 *   transcrição do Teams em vez de só dizer "formato não suportado".
 */

/** Anexo escolhido no navegador, ainda não enviado. */
export interface PendingAttachment {
  id: string;
  name: string;
  kind: StoredAttachment["kind"];
  file: Blob;
  mimeType: string;
  sizeLabel: string;
  /** Miniatura (imagens). */
  previewUrl?: string;
  /** Texto extraído (Word, PowerPoint, transcrição, XML...). */
  text?: string;
}

/** Limite da API é 32 MB por requisição; base64 cresce ~33%. */
const MAX_PDF_BYTES = 20 * 1024 * 1024;
export const MAX_ATTACHMENTS_PER_MESSAGE = 5;

const TEXT_EXTENSIONS = ["docx", "txt", "md", "vtt", "srt", "xml", "drawio", "csv", "json", "html", "htm"];
const MEDIA_EXTENSIONS = ["mp4", "mov", "avi", "mkv", "webm", "mp3", "wav", "m4a", "ogg"];

export const ATTACHMENT_ACCEPT = [
  "image/png", "image/jpeg", "image/webp", "image/gif",
  "application/pdf", ".pdf", ".pptx",
  ...TEXT_EXTENSIONS.map((e) => `.${e}`),
].join(",");

export const sizeLabel = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const extOf = (name: string) => name.toLowerCase().split(".").pop() ?? "";

/** Lê o arquivo e decide como o modelo vai recebê-lo. Não envia nada. */
export async function prepareAttachment(file: File): Promise<PendingAttachment> {
  const name = file.name || "arquivo";
  const ext = extOf(name);
  const base = { id: crypto.randomUUID(), name, sizeLabel: sizeLabel(file.size) };

  if (file.type.startsWith("video/") || file.type.startsWith("audio/") || MEDIA_EXTENSIONS.includes(ext)) {
    throw new Error(
      `"${name}": áudio e vídeo não são lidos pela IA. Anexe a transcrição da reunião — no Teams, ` +
      `em "Transcrição" → "Baixar" (.docx ou .vtt) — e ela será lida inteira.`
    );
  }
  if (file.type.startsWith("image/")) {
    const img = await toImageAttachment(file, name);
    const bytes = Uint8Array.from(atob(img.data), (c) => c.charCodeAt(0));
    return { ...base, kind: "image", file: new Blob([bytes], { type: img.mediaType }), mimeType: img.mediaType, previewUrl: img.previewUrl };
  }
  if (file.type === "application/pdf" || ext === "pdf") {
    if (file.size > MAX_PDF_BYTES) {
      throw new Error(`"${name}" tem ${sizeLabel(file.size)} — o limite é 20 MB por PDF.`);
    }
    return { ...base, kind: "pdf", file, mimeType: "application/pdf" };
  }
  if (ext === "pptx") {
    return { ...base, kind: "text", file, mimeType: file.type || "application/vnd.openxmlformats-officedocument.presentationml.presentation", text: await readPptxText(file) };
  }
  if (TEXT_EXTENSIONS.includes(ext) || file.type.startsWith("text/")) {
    const text = await readTranscriptFile(file);
    if (!text) throw new Error(`"${name}" está vazio ou não pôde ser lido.`);
    return { ...base, kind: "text", file, mimeType: file.type || "text/plain", text };
  }
  if (ext === "doc" || ext === "ppt" || ext === "xls" || ext === "xlsx") {
    throw new Error(`"${name}": salve como PDF (ou .docx/.pptx) e anexe de novo.`);
  }
  throw new Error(`"${name}": formato não suportado. Envie PDF, imagem, Word (.docx), PowerPoint (.pptx) ou texto.`);
}

/** Texto dos slides de um .pptx, na ordem. */
export async function readPptxText(file: Blob & { name?: string }): Promise<string> {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const slides = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));

  if (slides.length === 0) throw new Error(`"${file.name ?? "arquivo"}" não parece um PowerPoint válido.`);

  const parts: string[] = [];
  for (const [i, path] of slides.entries()) {
    const xml = await zip.file(path)!.async("string");
    // <a:t> carrega o texto; <a:p> separa parágrafos.
    const text = xml
      .replace(/<\/a:p>/g, "\n")
      .replace(/<a:t>([^<]*)<\/a:t>/g, (_, t) => t)
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .split("\n").map((l) => l.trim()).filter(Boolean)
      .join("\n");
    parts.push(`--- Slide ${i + 1} ---\n${text || "(sem texto)"}`);
  }
  return parts.join("\n\n");
}

/** Nome seguro para o Storage: sem acento, espaço ou barra. */
function storageName(name: string): string {
  return name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9._-]+/g, "_").slice(-120);
}

function guessDocType(name: string): Document["type"] {
  const n = name.toLowerCase();
  if (/\bata\b|transcri|reuni/.test(n)) return "ata";
  if (/cronograma/.test(n)) return "cronograma";
  if (/status|report|relat/.test(n)) return "report";
  return "outro";
}

/**
 * Guarda o arquivo no projeto e registra em Documentos. Para Word, PowerPoint
 * e texto, guarda também o texto extraído (.txt), que é o que o modelo lê.
 */
export async function uploadAttachment(projectId: string, userId: string, a: PendingAttachment): Promise<StoredAttachment> {
  const folder = `${projectId}/${userId}`;
  const original = `${folder}/${a.id}-${storageName(a.name)}`;

  const up = await supabase.storage.from("project-files").upload(original, a.file, { contentType: a.mimeType, upsert: false });
  if (up.error) throw new Error(`Não foi possível guardar "${a.name}": ${up.error.message}`);

  let readPath = original;
  if (a.kind === "text") {
    readPath = `${original}.txt`;
    const txt = new Blob([a.text ?? ""], { type: "text/plain;charset=utf-8" });
    const r = await supabase.storage.from("project-files").upload(readPath, txt, { contentType: "text/plain;charset=utf-8", upsert: false });
    if (r.error) throw new Error(`Não foi possível guardar o texto de "${a.name}": ${r.error.message}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("documents") as any)
    .insert({
      project_id: projectId,
      created_by: userId,
      name: a.name,
      type: guessDocType(a.name),
      storage_path: original,
      mime_type: a.mimeType,
      size_bytes: a.file.size,
      source: "copiloto",
    })
    .select("id")
    .single();
  // O anexo já está guardado e vai ao modelo; falhar o registro em Documentos
  // não deve impedir a pergunta.
  if (error) console.error("documents insert:", error.message);

  return { documentId: data?.id, name: a.name, kind: a.kind, storagePath: readPath, mimeType: a.kind === "text" ? "text/plain" : a.mimeType };
}

/** Bloco que referencia o arquivo guardado; a Edge Function busca o conteúdo. */
export function attachmentBlock(a: StoredAttachment): ApiContentBlock {
  return { type: "stored_file", path: a.storagePath, name: a.name, as: a.kind, media_type: a.mimeType };
}

/** Link temporário para abrir/baixar um arquivo guardado. */
export async function signedFileUrl(path: string, downloadName?: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("project-files")
    .createSignedUrl(path, 60 * 10, downloadName ? { download: downloadName } : undefined);
  if (error || !data) throw new Error(error?.message ?? "Não foi possível gerar o link do arquivo.");
  return data.signedUrl;
}
