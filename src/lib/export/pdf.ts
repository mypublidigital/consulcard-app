import { AI_NOTICE, DATA_NOTICE, type Block, type DocModel, type Run } from "./blocks";
import { CONSULCARD_LOGO_PNG } from "./brand-logo";

/**
 * A fonte embutida no pdfmake (Roboto) não tem alguns símbolos comuns nas
 * respostas: "→" vira um quadrado vazio — e há projeto real chamado
 * "Migração Orbital → Dock". Troca pelos equivalentes em texto.
 */
export function pdfSafe(s: string): string {
  return s
    .replace(/[→⇒➔➜⟶]/g, "->")
    .replace(/[←⇐⟵]/g, "<-")
    .replace(/[↔⇔]/g, "<->")
    .replace(/[✓✔☑]/g, "OK")
    .replace(/[✗✘❌]/g, "X")
    .replace(/[⚠]/g, "!")
    // Emojis e pictogramas não existem na fonte: somem em vez de virar quadrado.
    .replace(/[\p{Extended_Pictographic}\u{FE0F}]/gu, "");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Node = any;

function runs(rs: Run[]): Node[] {
  return rs.map((r) => ({
    text: pdfSafe(r.text),
    bold: r.bold || undefined,
    italics: r.italic || undefined,
    ...(r.code ? { font: "Roboto", background: "#EDEEEF", fontSize: 9 } : {}),
  }));
}

function block(b: Block): Node {
  switch (b.kind) {
    case "heading":
      return { text: runs(b.runs), style: `h${b.level}` };
    case "paragraph":
      return { text: runs(b.runs), margin: [0, 0, 0, 6] };
    case "list":
      return { [b.ordered ? "ol" : "ul"]: b.items.map((it) => ({ text: runs(it) })), margin: [0, 0, 0, 6] };
    case "table":
      return {
        table: {
          headerRows: 1,
          widths: b.header.map(() => "*"),
          body: [
            b.header.map((c) => ({ text: runs(c), bold: true, fillColor: "#F5F6F7" })),
            ...b.rows.map((r) => r.map((c) => ({ text: runs(c) }))),
          ],
        },
        layout: { hLineColor: "#D1D3D4", vLineColor: "#D1D3D4" },
        fontSize: 9,
        margin: [0, 2, 0, 8],
      };
    case "code":
      return { text: pdfSafe(b.text), fontSize: 8, background: "#F5F6F7", margin: [0, 2, 0, 8], preserveLeadingSpaces: true };
    case "quote":
      return { text: runs(b.runs), italics: true, color: "#575756", margin: [12, 0, 0, 6] };
    case "hr":
      return { canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: "#D1D3D4" }], margin: [0, 6, 0, 6] };
  }
}

/** Gera o PDF de um documento. As bibliotecas são carregadas só na hora do uso. */
export async function docToPdfBlob(doc: DocModel): Promise<Blob> {
  const [{ default: pdfMake }, { default: vfs }] = await Promise.all([
    import("pdfmake/build/pdfmake"),
    import("pdfmake/build/vfs_fonts"),
  ]);
  pdfMake.addVirtualFileSystem(vfs);

  const today = new Date().toLocaleDateString("pt-BR");
  return pdfMake
    .createPdf({
      pageSize: "A4",
      pageMargins: [40, 50, 40, 50],
      info: { title: pdfSafe(doc.title), creator: "Consulcard" },
      defaultStyle: { font: "Roboto", fontSize: 10, lineHeight: 1.25, color: "#354454" },
      styles: {
        title: { fontSize: 18, bold: true, margin: [0, 0, 0, 2] },
        subtitle: { fontSize: 10, color: "#575756", margin: [0, 0, 0, 14] },
        h1: { fontSize: 14, bold: true, margin: [0, 10, 0, 4] },
        h2: { fontSize: 12, bold: true, margin: [0, 8, 0, 4] },
        h3: { fontSize: 10, bold: true, color: "#575756", margin: [0, 6, 0, 3] },
      },
      // Logo institucional no cabeçalho (versão primária horizontal).
      header: { image: CONSULCARD_LOGO_PNG, width: 90, margin: [40, 22, 40, 0] },
      footer: (page: number, count: number) => ({
        columns: [
          { text: `Gerado em ${today} · ${doc.aiGenerated ? AI_NOTICE : DATA_NOTICE}`, fontSize: 7, color: "#9A9A99" },
          { text: `${page} / ${count}`, alignment: "right", fontSize: 7, color: "#9A9A99" },
        ],
        margin: [40, 16, 40, 0],
      }),
      content: [
        { text: pdfSafe(doc.title), style: "title" },
        ...(doc.subtitle ? [{ text: pdfSafe(doc.subtitle), style: "subtitle" }] : [{ text: "", margin: [0, 0, 0, 10] }]),
        ...doc.blocks.map(block),
      ],
    })
    .getBlob();
}
