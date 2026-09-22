/** Dispara o download de um arquivo gerado no navegador. */
export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoga depois: revogar na hora cancela o download em alguns navegadores.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadText(filename: string, content: string, mime = "text/plain;charset=utf-8"): void {
  downloadBlob(filename, new Blob([content], { type: mime }));
}

/** Nome de arquivo seguro a partir de um título livre. */
export function safeFilename(title: string, ext: string): string {
  const base = title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9-_ ]+/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 60) || "arquivo";
  return `${base}.${ext}`;
}

/**
 * Extrai e valida o XML do draw.io de uma resposta do agente.
 * "invalid" = há um <mxfile> mas o XML está quebrado (típico de resposta
 * cortada no meio — a causa do item 10).
 */
export function extractDrawio(text: string): { status: "none" } | { status: "invalid" } | { status: "ok"; xml: string } {
  const start = text.indexOf("<mxfile");
  if (start === -1) return { status: "none" };
  const end = text.indexOf("</mxfile>", start);
  if (end === -1) return { status: "invalid" };
  const xml = text.slice(start, end + "</mxfile>".length);
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length > 0) return { status: "invalid" };
  return { status: "ok", xml };
}
