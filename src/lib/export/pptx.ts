import type { StatusReportData } from "@/features/status-report/report-data";
import { extractSummarySection, factualSummary } from "@/features/status-report/report-data";
import { CONSULCARD_LOGO_PNG, CONSULCARD_LOGO_RATIO as LOGO_RATIO } from "./brand-logo";

// Manual de Uso de Marca Consulcard v1c: Azul rgb(53,68,84) e Verde
// rgb(141,198,63); cinzas de apoio rgb(209,211,212) e rgb(87,87,86).
const BRAND = "354454"; // Azul Consulcard
const GREEN = "8DC63F"; // Verde Consulcard
const INK = "354454";
const MUTED = "575756";
const FAINT = "9A9A99";
const LINE = "D1D3D4";
const SOFT = "F5F6F7";
// O manual permite Arial quando não for possível usar Roboto — caso do
// PowerPoint, que depende da fonte instalada em quem abre o arquivo.
const FONT = "Arial";

/**
 * Status Report em PowerPoint (item 13). Biblioteca carregada só na hora do uso.
 * Slides: capa · resumo e números · atividades · pendências · próximos marcos.
 */
export async function statusReportToPptxBlob(d: StatusReportData, aiMarkdown?: string): Promise<Blob> {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const pres = new PptxGenJS();
  pres.layout = "LAYOUT_WIDE"; // 13,33" × 7,5"
  pres.theme = { headFontFace: FONT, bodyFontFace: FONT };
  pres.title = `Status Report — ${d.projectName}`;
  pres.company = "Consulcard";

  const W = 13.33;
  const footer = (slide: ReturnType<typeof pres.addSlide>, n: number) => {
    slide.addText(`Consulcard · ${d.projectName} · ${d.referenceDate}`, { x: 0.5, y: 7.0, w: 9, h: 0.3, fontSize: 9, color: FAINT });
    slide.addText(String(n), { x: W - 1.0, y: 7.0, w: 0.5, h: 0.3, fontSize: 9, color: FAINT, align: "right" });
  };
  const heading = (slide: ReturnType<typeof pres.addSlide>, title: string) => {
    slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: W, h: 0.12, fill: { color: GREEN } });
    slide.addText(title, { x: 0.5, y: 0.35, w: W - 1, h: 0.6, fontSize: 24, bold: true, color: INK });
  };
  // Tabela com cabeçalho estilizado; quebra em várias páginas se precisar.
  const table = (slide: ReturnType<typeof pres.addSlide>, header: string[], rows: string[][], y: number, colW: number[]) => {
    slide.addTable(
      [
        header.map((h) => ({ text: h, options: { bold: true, color: INK, fill: { color: SOFT } } })),
        ...rows.map((r) => r.map((c) => ({ text: c, options: { color: INK } }))),
      ],
      { x: 0.5, y, w: W - 1, colW, fontSize: 12, border: { type: "solid", pt: 0.5, color: LINE }, autoPage: true, autoPageRepeatHeader: true }
    );
  };

  // 1 · Capa — fundo Azul Consulcard com a logo sobre placa branca, como manda
  // o manual para fundos escuros (seções 6 e 7).
  const cover = pres.addSlide();
  cover.background = { color: BRAND };
  cover.addShape(pres.ShapeType.rect, { x: 0.8, y: 0.7, w: 3.4, h: 1.0, fill: { color: "FFFFFF" } });
  cover.addImage({ data: CONSULCARD_LOGO_PNG, x: 1.0, y: 0.95, w: 3.0, h: 3.0 / LOGO_RATIO });
  cover.addText("STATUS REPORT", { x: 0.8, y: 2.0, w: 11, h: 0.5, fontSize: 16, bold: true, color: GREEN, charSpacing: 4, fontFace: FONT });
  cover.addText(d.projectName, { x: 0.8, y: 2.6, w: 11.5, h: 1.2, fontSize: 40, bold: true, color: "FFFFFF" });
  cover.addText(`Cliente: ${d.client}`, { x: 0.8, y: 3.9, w: 11, h: 0.5, fontSize: 18, color: "FFFFFF" });
  cover.addText(`Referência: ${d.referenceDate}  ·  Gerente: ${d.manager}  ·  Período: ${d.period}`, {
    x: 0.8, y: 4.5, w: 11.5, h: 0.4, fontSize: 13, color: GREEN,
  });

  // 2 · Resumo e números
  const s2 = pres.addSlide();
  heading(s2, "Resumo executivo");
  const summary = aiMarkdown ? extractSummarySection(aiMarkdown) : factualSummary(d);
  s2.addText(summary, { x: 0.5, y: 1.2, w: W - 1, h: 2.4, fontSize: 15, color: INK, valign: "top" });
  const kpis: [string, string][] = [
    [`${d.progress}%`, "concluído"],
    [`${d.totals.done}/${d.totals.activities}`, "atividades"],
    [String(d.totals.inProgress), "em andamento"],
    [String(d.totals.delayed), "atrasadas"],
    [String(d.totals.openPendencies), "pendências abertas"],
  ];
  const kw = (W - 1 - 0.3 * 4) / 5;
  kpis.forEach(([value, label], i) => {
    const x = 0.5 + i * (kw + 0.3);
    const alert = (label === "atrasadas" || label === "pendências abertas") && value !== "0";
    s2.addShape(pres.ShapeType.rect, { x, y: 4.1, w: kw, h: 1.8, fill: { color: SOFT }, line: { color: LINE, width: 0.5 } });
    s2.addText(value, { x, y: 4.3, w: kw, h: 0.9, fontSize: 36, bold: true, align: "center", color: alert ? "9B1C1C" : BRAND });
    s2.addText(label, { x, y: 5.2, w: kw, h: 0.5, fontSize: 13, align: "center", color: MUTED });
  });
  footer(s2, 2);

  // 3 · Atividades
  const s3 = pres.addSlide();
  heading(s3, "Atividades");
  const colX = [0.5, 4.75, 9.0];
  const colW = 3.95;
  const blocks: [string, string[]][] = [
    ["Concluídas", d.done],
    ["Em andamento", d.inProgress.map((x) => `${x.label} (${x.status})`)],
    ["Atrasadas", d.delayed.map((x) => `${x.label} — venceu em ${x.dueDate}`)],
  ];
  blocks.forEach(([title, items], i) => {
    s3.addText(title, { x: colX[i], y: 1.2, w: colW, h: 0.45, fontSize: 16, bold: true, color: i === 2 && items.length ? "9B1C1C" : BRAND });
    s3.addText(
      items.length
        ? items.slice(0, 10).map((t) => ({ text: t, options: { bullet: true, breakLine: true } }))
        : [{ text: "Nenhuma", options: { italic: true, color: FAINT } }],
      { x: colX[i], y: 1.75, w: colW, h: 4.9, fontSize: 13, color: INK, valign: "top" }
    );
    if (items.length > 10) {
      s3.addText(`+ ${items.length - 10} outras`, { x: colX[i], y: 6.55, w: colW, h: 0.3, fontSize: 10, color: FAINT });
    }
  });
  footer(s3, 3);

  // 4 · Pendências
  const s4 = pres.addSlide();
  heading(s4, "Pendências abertas");
  if (d.pendencies.length) {
    table(s4, ["Pendência", "Responsável", "Prazo"], d.pendencies.map((p) => [p.description, p.owner, p.dueDate]), 1.2, [7.3, 3.2, 1.83]);
  } else {
    s4.addText("Sem pendências em aberto.", { x: 0.5, y: 1.3, w: W - 1, h: 0.5, fontSize: 15, italic: true, color: FAINT });
  }
  footer(s4, 4);

  // 5 · Próximos marcos
  const s5 = pres.addSlide();
  heading(s5, "Próximos marcos");
  if (d.milestones.length) {
    table(s5, ["Marco", "Data"], d.milestones.map((m) => [m.label, m.dueDate]), 1.2, [10.0, 2.33]);
  } else {
    s5.addText("Sem marcos próximos definidos.", { x: 0.5, y: 1.3, w: W - 1, h: 0.5, fontSize: 15, italic: true, color: FAINT });
  }
  // Aviso de IA só quando houver texto da IA; o resto é dado do sistema.
  s5.addText(
    aiMarkdown
      ? "Resumo executivo gerado com apoio de IA — revisar antes de enviar ao cliente."
      : "Gerado a partir dos dados do sistema.",
    { x: 0.5, y: 6.5, w: W - 1, h: 0.3, fontSize: 10, italic: true, color: FAINT }
  );
  footer(s5, 5);

  return (await pres.write({ outputType: "blob" })) as Blob;
}
