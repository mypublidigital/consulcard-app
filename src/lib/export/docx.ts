import { AI_NOTICE, DATA_NOTICE, type Block, type DocModel, type Run } from "./blocks";

/** Gera o .docx de um documento. A biblioteca é carregada só na hora do uso. */
export async function docToDocxBlob(doc: DocModel): Promise<Blob> {
  const {
    AlignmentType, BorderStyle, Document, HeadingLevel, LevelFormat, Packer,
    Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType,
  } = await import("docx");

  const toRuns = (rs: Run[]) =>
    rs.map(
      (r) =>
        new TextRun({
          text: r.text,
          bold: r.bold,
          italics: r.italic,
          ...(r.code ? { font: "Consolas", shading: { type: ShadingType.CLEAR, fill: "F0EDE6", color: "auto" } } : {}),
        })
    );

  const HEADING = { 1: HeadingLevel.HEADING_1, 2: HeadingLevel.HEADING_2, 3: HeadingLevel.HEADING_3 } as const;
  const border = { style: BorderStyle.SINGLE, size: 4, color: "D8D4CC" };

  // Cada lista numerada ganha uma instância própria para recomeçar do 1.
  let listInstance = 0;

  const render = (b: Block): (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] => {
    switch (b.kind) {
      case "heading":
        return [new Paragraph({ heading: HEADING[b.level], children: toRuns(b.runs) })];
      case "paragraph":
        return [new Paragraph({ children: toRuns(b.runs), spacing: { after: 120 } })];
      case "list": {
        const instance = ++listInstance;
        return b.items.map((it) =>
          b.ordered
            ? new Paragraph({ numbering: { reference: "ordered", level: 0, instance }, children: toRuns(it) })
            : new Paragraph({ bullet: { level: 0 }, children: toRuns(it) })
        );
      }
      case "table": {
        const cell = (rs: Run[], header = false) =>
          new TableCell({
            children: [new Paragraph({ children: toRuns(header ? rs.map((r) => ({ ...r, bold: true })) : rs) })],
            ...(header ? { shading: { type: ShadingType.CLEAR, fill: "F4F2EE", color: "auto" } } : {}),
            borders: { top: border, bottom: border, left: border, right: border },
          });
        return [
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({ tableHeader: true, children: b.header.map((c) => cell(c, true)) }),
              ...b.rows.map((r) => new TableRow({ children: r.map((c) => cell(c)) })),
            ],
          }),
          new Paragraph({ text: "" }),
        ];
      }
      case "code":
        return b.text.split("\n").map(
          (line) =>
            new Paragraph({
              children: [new TextRun({ text: line || " ", font: "Consolas", size: 18 })],
              shading: { type: ShadingType.CLEAR, fill: "F4F2EE", color: "auto" },
            })
        );
      case "quote":
        return [new Paragraph({ children: toRuns(b.runs.map((r) => ({ ...r, italic: true }))), indent: { left: 360 } })];
      case "hr":
        return [new Paragraph({ border: { bottom: border }, spacing: { after: 120 } })];
    }
  };

  const document = new Document({
    creator: "Consulcard",
    title: doc.title,
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    numbering: {
      config: [
        {
          reference: "ordered",
          levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT }],
        },
      ],
    },
    sections: [
      {
        children: [
          new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(doc.title)] }),
          ...(doc.subtitle ? [new Paragraph({ children: [new TextRun({ text: doc.subtitle, color: "5B5A56" })] })] : []),
          ...doc.blocks.flatMap(render),
          new Paragraph({
            spacing: { before: 240 },
            children: [
              new TextRun({
                text: `Gerado em ${new Date().toLocaleDateString("pt-BR")} · ${doc.aiGenerated ? AI_NOTICE : DATA_NOTICE}.`,
                size: 16,
                color: "8A8883",
              }),
            ],
          }),
        ],
      },
    ],
  });

  return Packer.toBlob(document);
}
