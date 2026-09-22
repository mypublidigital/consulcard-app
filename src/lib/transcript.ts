/**
 * Transcrições de reunião (itens 17 e 18).
 *
 * Antes: o arquivo era cortado em 8.000 caracteres sem aviso (uma reunião de
 * 1 hora tem 40–60 mil), e .docx era lido como texto cru — chegava ao modelo
 * como lixo binário do zip.
 */

/**
 * Acima disto a transcrição é dividida em partes. É bem menor que a janela do
 * modelo de propósito: cada parte precisa caber junto com o prompt e com
 * espaço para a resposta, e partes menores deixam o resumo de cada uma mais fiel.
 * ~120 mil caracteres ≈ 30 mil tokens ≈ 2 a 3 horas de reunião.
 */
export const TRANSCRIPT_CHUNK_CHARS = 120_000;

export const TRANSCRIPT_ACCEPT = ".txt,.md,.docx,.vtt,.srt";

export async function readTranscriptFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return value.trim();
  }
  if (name.endsWith(".doc")) {
    throw new Error("Arquivos .doc (Word antigo) não são suportados — salve como .docx ou .txt.");
  }
  return (await file.text()).trim();
}

/**
 * Divide em partes de até maxChars, sempre em quebra de parágrafo ou de linha
 * — nunca no meio de uma fala. Só corta no meio de um trecho se ele sozinho
 * passar do limite.
 */
export function splitTranscript(text: string, maxChars = TRANSCRIPT_CHUNK_CHARS): string[] {
  if (text.length <= maxChars) return [text];

  const units = text.split(/\n{2,}/).flatMap((para) =>
    para.length <= maxChars ? [para] : para.split(/\n/)
  );

  const parts: string[] = [];
  let current = "";
  for (let unit of units) {
    while (unit.length > maxChars) {
      if (current) { parts.push(current); current = ""; }
      parts.push(unit.slice(0, maxChars));
      unit = unit.slice(maxChars);
    }
    const joined = current ? `${current}\n\n${unit}` : unit;
    if (joined.length > maxChars) {
      parts.push(current);
      current = unit;
    } else {
      current = joined;
    }
  }
  if (current) parts.push(current);
  return parts;
}

/** Prompt de cada parte: extrair o que importa, sem resumir demais. */
export function partPrompt(fileName: string, index: number, total: number, part: string): string {
  return `Esta é a parte ${index} de ${total} da transcrição da reunião "${fileName}".
Extraia desta parte, de forma fiel e sem inventar nada:
- assuntos discutidos
- decisões tomadas
- pendências, com responsável e prazo quando citados
- riscos e bloqueios mencionados
- números, datas e nomes citados (exatamente como aparecem)

Não escreva a ata ainda — outra etapa vai consolidar todas as partes.

TRANSCRIÇÃO (parte ${index}/${total}):

${part}`;
}

/** Prompt final: consolidar os extratos das partes numa ata. */
export function consolidatePrompt(fileName: string, extracts: string[]): string {
  return `A transcrição da reunião "${fileName}" era longa e foi processada em ${extracts.length} partes. Abaixo estão os extratos de cada parte, em ordem.

Consolide tudo em uma única ata de reunião, com: resumo, decisões tomadas, pendências (tabela com responsável e prazo), riscos e próximos passos. Elimine repetições entre partes. Não invente nada que não esteja nos extratos.

${extracts.map((e, i) => `=== EXTRATO DA PARTE ${i + 1} ===\n${e}`).join("\n\n")}`;
}
