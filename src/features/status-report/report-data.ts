import type { Activity, Pendency, Project } from "@/types";
import { type Block, type DocModel, dropDuplicateTitle, markdownToBlocks, text } from "@/lib/export/blocks";

/** Dados factuais do Status Report — tudo vem do sistema, nada é estimado. */
export interface StatusReportData {
  projectName: string;
  client: string;
  manager: string;
  consultants: string[];
  period: string;
  referenceDate: string;
  progress: number;
  done: string[];
  inProgress: { label: string; status: string }[];
  delayed: { label: string; dueDate: string }[];
  /** owner já vem como "Nome (Cliente)" quando o responsável é do cliente. */
  pendencies: { description: string; owner: string; dueDate: string; ownerType: string }[];
  milestones: { label: string; dueDate: string }[];
  totals: { activities: number; done: number; inProgress: number; delayed: number; openPendencies: number };
}

const STATUS_LABEL: Record<string, string> = {
  todo: "A fazer",
  in_progress: "Em andamento",
  review: "Em revisão",
  done: "Concluída",
};

const br = (iso?: string) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR") : "—");

export function buildReportData(project: Project, activities: Activity[], pendencies: Pendency[]): StatusReportData {
  const today = new Date().toISOString().slice(0, 10);
  const done = activities.filter((a) => a.status === "done");
  const inProgress = activities.filter((a) => a.status === "in_progress" || a.status === "review");
  const delayed = activities.filter((a) => a.status !== "done" && a.dueDate && a.dueDate < today);
  const open = pendencies.filter((p) => p.projectId === project.id && p.status === "open");
  const progress = activities.length ? Math.round((done.length / activities.length) * 100) : 0;

  return {
    projectName: project.name,
    client: project.client,
    manager: project.manager?.name ?? "—",
    consultants: project.consultants.map((c) => c.name),
    period: `${br(project.startDate)} a ${br(project.targetEndDate)}`,
    referenceDate: br(today),
    progress,
    done: done.map((a) => a.label),
    inProgress: inProgress.map((a) => ({ label: a.label, status: STATUS_LABEL[a.status ?? "todo"] })),
    delayed: delayed.map((a) => ({ label: a.label, dueDate: br(a.dueDate) })),
    pendencies: open.map((p) => {
      const ownerType = p.ownerType === "client" ? "Cliente" : "Consulcard";
      // Sem repetir quando o nome gravado já é o próprio tipo ("Cliente (Cliente)").
      const owner = p.ownerType === "client" && p.owner.name !== ownerType
        ? `${p.owner.name} (${ownerType})`
        : p.owner.name;
      return { description: p.description, owner, dueDate: br(p.dueDate), ownerType };
    }),
    milestones: activities
      .filter((a) => a.status !== "done" && a.dueDate)
      .sort((x, y) => (x.dueDate ?? "").localeCompare(y.dueDate ?? ""))
      .slice(0, 5)
      .map((a) => ({ label: a.label, dueDate: br(a.dueDate) })),
    totals: {
      activities: activities.length,
      done: done.length,
      inProgress: inProgress.length,
      delayed: delayed.length,
      openPendencies: open.length,
    },
  };
}

/** Resumo em texto a partir dos números — usado quando não há resumo da IA. */
export function factualSummary(d: StatusReportData): string {
  const t = d.totals;
  const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;
  return (
    `O projeto ${d.projectName} está com ${d.progress}% das atividades concluídas ` +
    `(${plural(t.done, "atividade concluída", "atividades concluídas")} de ${t.activities}), ` +
    `${plural(t.inProgress, "em execução", "em execução")} e ` +
    `${plural(t.openPendencies, "pendência em aberto", "pendências em aberto")}.` +
    (t.delayed > 0 ? ` Há ${plural(t.delayed, "atividade com prazo vencido", "atividades com prazo vencido")}.` : "")
  );
}

/**
 * Texto que substitui [NOTAS] na ficha M1.2 (Relatório de Status Semanal) da
 * biblioteca: os dados do sistema + as notas livres do consultor.
 */
export function notesForM12(d: StatusReportData, consultantNotes: string): string {
  const lines = [
    `Projeto: ${d.projectName} — Cliente: ${d.client}`,
    `Gerente: ${d.manager} · Consultores: ${d.consultants.join(", ") || "nenhum alocado"}`,
    `Período: ${d.period} · Data de referência: ${d.referenceDate}`,
    `Avanço (atividades concluídas / total): ${d.progress}% (${d.totals.done}/${d.totals.activities})`,
    "",
    "Concluídas:", ...(d.done.length ? d.done.map((x) => `- ${x}`) : ["- nenhuma"]),
    "", "Em andamento / em revisão:", ...(d.inProgress.length ? d.inProgress.map((x) => `- ${x.label} (${x.status})`) : ["- nenhuma"]),
    "", "Atrasadas:", ...(d.delayed.length ? d.delayed.map((x) => `- ${x.label} — venceu em ${x.dueDate}`) : ["- nenhuma"]),
    "", "Pendências abertas:", ...(d.pendencies.length ? d.pendencies.map((p) => `- ${p.description} — ${p.owner}, até ${p.dueDate}`) : ["- nenhuma"]),
    "", "Próximos marcos:", ...(d.milestones.length ? d.milestones.map((m) => `- ${m.label} — ${m.dueDate}`) : ["- nenhum com prazo"]),
  ];
  if (consultantNotes.trim()) lines.push("", "Notas do consultor sobre a semana:", consultantNotes.trim());
  return lines.join("\n");
}

/** Documento para PDF/Word: o relatório da IA, se houver; senão, o factual. */
export function reportToDocModel(d: StatusReportData, aiMarkdown?: string): DocModel {
  const title = `Status Report — ${d.projectName}`;
  const subtitle = `Cliente: ${d.client} · Referência: ${d.referenceDate} · Gerente: ${d.manager}`;
  if (aiMarkdown) {
    return { title, subtitle, blocks: dropDuplicateTitle(markdownToBlocks(aiMarkdown), title), aiGenerated: true };
  }

  const blocks: Block[] = [
    { kind: "heading", level: 2, runs: text("Resumo executivo") },
    { kind: "paragraph", runs: text(factualSummary(d)) },
    { kind: "heading", level: 2, runs: text("Atividades concluídas") },
    d.done.length ? { kind: "list", ordered: false, items: d.done.map((x) => text(x)) } : { kind: "paragraph", runs: text("Nenhuma no período.", { italic: true }) },
    { kind: "heading", level: 2, runs: text("Em andamento") },
    d.inProgress.length
      ? { kind: "table", header: [text("Atividade"), text("Status")], rows: d.inProgress.map((x) => [text(x.label), text(x.status)]) }
      : { kind: "paragraph", runs: text("Sem atividades em andamento.", { italic: true }) },
  ];
  if (d.delayed.length) {
    blocks.push(
      { kind: "heading", level: 2, runs: text("Atrasadas") },
      { kind: "table", header: [text("Atividade"), text("Venceu em")], rows: d.delayed.map((x) => [text(x.label), text(x.dueDate)]) }
    );
  }
  blocks.push(
    { kind: "heading", level: 2, runs: text("Pendências abertas") },
    d.pendencies.length
      ? { kind: "table", header: [text("Pendência"), text("Responsável"), text("Prazo")], rows: d.pendencies.map((p) => [text(p.description), text(p.owner), text(p.dueDate)]) }
      : { kind: "paragraph", runs: text("Sem pendências em aberto.", { italic: true }) },
    { kind: "heading", level: 2, runs: text("Próximos marcos") },
    d.milestones.length
      ? { kind: "table", header: [text("Marco"), text("Data")], rows: d.milestones.map((m) => [text(m.label), text(m.dueDate)]) }
      : { kind: "paragraph", runs: text("Sem marcos próximos definidos.", { italic: true }) }
  );
  return { title, subtitle, blocks, aiGenerated: false };
}

/** Primeira seção do relatório da IA (o resumo executivo), para o slide. */
export function extractSummarySection(md: string): string {
  const parts = md.split(/^#{1,3}\s+.*$/m).map((s) => s.trim()).filter(Boolean);
  return (parts[0] ?? "").replace(/[*_`]/g, "").slice(0, 900);
}
