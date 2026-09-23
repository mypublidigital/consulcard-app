import type { ApiContentBlock } from "./chat";
import type { ImageAttachment } from "./images";

/**
 * Anexos do co-piloto além de imagem (relatado na reunião de 17/09: "não está
 * deixando carregar PowerPoint, nada para fazer a leitura" e "arquivo
 * corrompido, binário" ao subir PDF/DOC).
 *
 * - PDF vai inteiro ao modelo como documento: ele lê texto, tabelas e layout.
 * - PPTX é lido aqui (texto dos slides), porque o modelo não abre .pptx.
 */
export interface PdfAttachment {
  kind: "pdf";
  id: string;
  name: string;
  /** Base64 sem o prefixo data:. */
  data: string;
  sizeLabel: string;
}

export type Attachment = (ImageAttachment & { kind: "image" }) | PdfAttachment;

/** Limite da API é 32 MB por requisição; base64 cresce ~33%. */
const MAX_PDF_BYTES = 15 * 1024 * 1024;

const sizeLabel = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;

export async function toPdfAttachment(file: File): Promise<PdfAttachment> {
  if (file.size > MAX_PDF_BYTES) {
    throw new Error(`"${file.name}" tem ${sizeLabel(file.size)} — o limite é 15 MB por PDF.`);
  }
  const buf = await file.arrayBuffer();
  // Conversão em blocos: String.fromCharCode com o array inteiro estoura a pilha.
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return { kind: "pdf", id: crypto.randomUUID(), name: file.name, data: btoa(binary), sizeLabel: sizeLabel(file.size) };
}

/** Texto dos slides de um .pptx, na ordem. */
export async function readPptxText(file: File): Promise<string> {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const slides = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));

  if (slides.length === 0) throw new Error(`"${file.name}" não parece um PowerPoint válido.`);

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

/** Blocos de conteúdo da API para os anexos da mensagem. */
export function attachmentBlocks(list: Attachment[]): ApiContentBlock[] {
  return list.map((a) =>
    a.kind === "pdf"
      ? ({ type: "document", source: { type: "base64", media_type: "application/pdf", data: a.data } } as ApiContentBlock)
      : ({ type: "image", source: { type: "base64", media_type: a.mediaType, data: a.data } } as ApiContentBlock)
  );
}
