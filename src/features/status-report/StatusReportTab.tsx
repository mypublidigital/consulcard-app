import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Download, Sparkles, Loader2, FileText } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Input";
import { useProjectsStore } from "@/store/projects-store";
import type { Project } from "@/types";
import { Avatar } from "@/components/ui/Avatar";
import { ActivityStatus } from "@/components/ui/StatusPills";
import { PROMPTS, withDataProtocol } from "@/mocks/prompts";
import { sendChatMessage } from "@/lib/chat";
import { downloadBlob, safeFilename } from "@/lib/download";
import { buildReportData, notesForM12, reportToDocModel } from "./report-data";

type ExportFormat = "pdf" | "pptx" | "docx";

export function StatusReportTab({ project }: { project: Project }) {
  const activities = useProjectsStore((s) => s.activitiesByProject[project.id] ?? []);
  const allPendencies = useProjectsStore((s) => s.pendencies);
  const pendencies = allPendencies.filter((p) => p.projectId === project.id && p.status === "open");
  const generatedAt = new Date().toISOString().slice(0, 10);

  // Relatório da IA (ficha M1.2) e qual versão está na tela.
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [showAi, setShowAi] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [error, setError] = useState("");

  const data = buildReportData(project, activities, allPendencies);
  const showingAi = showAi && !!aiReport;

  async function generateWithAi() {
    setGenerating(true);
    setError("");
    try {
      // Usa a ficha oficial da biblioteca: M1.2 · Relatório de Status Semanal (T1).
      const m12 = PROMPTS.find((p) => p.id === "M1.2");
      const body = (m12?.body ?? "Gere um Relatório de Status Executivo a partir destes dados: [NOTAS]")
        .replace("[NOTAS]", `\n\n${notesForM12(data, notes)}\n\n`);
      const result = await sendChatMessage(
        [{ role: "user", content: withDataProtocol(body) }],
        { agentType: "copilot", tier: m12?.tier ?? "T1" }
      );
      setAiReport(result.content);
      setShowAi(true);
      setNotesOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível gerar o relatório.");
    } finally {
      setGenerating(false);
    }
  }

  async function exportAs(format: ExportFormat) {
    setExporting(format);
    setError("");
    try {
      const ai = showingAi ? aiReport ?? undefined : undefined;
      const base = `Status_Report_${project.name}_${generatedAt}`;
      let blob: Blob;
      if (format === "pptx") {
        const { statusReportToPptxBlob } = await import("@/lib/export/pptx");
        blob = await statusReportToPptxBlob(data, ai);
      } else if (format === "pdf") {
        const { docToPdfBlob } = await import("@/lib/export/pdf");
        blob = await docToPdfBlob(reportToDocModel(data, ai));
      } else {
        const { docToDocxBlob } = await import("@/lib/export/docx");
        blob = await docToDocxBlob(reportToDocModel(data, ai));
      }
      downloadBlob(safeFilename(base, format), blob);
    } catch (err) {
      setError(`Falha ao exportar: ${err instanceof Error ? err.message : err}`);
    } finally {
      setExporting(null);
    }
  }

  const done = activities.filter((a) => a.status === "done");
  const inProgress = activities.filter((a) => a.status === "in_progress" || a.status === "review");
  const delayed = activities.filter((a) => {
    if (!a.dueDate || a.status === "done") return false;
    return new Date(a.dueDate).getTime() < Date.now();
  });
  const nextMilestones = activities
    .filter((a) => a.status !== "done" && a.dueDate)
    .sort((x, y) => (x.dueDate ?? "").localeCompare(y.dueDate ?? ""))
    .slice(0, 4);

  const exportButton = (format: ExportFormat, label: string) => (
    <Button
      variant="secondary"
      size="sm"
      disabled={exporting !== null}
      leftIcon={exporting === format ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
      onClick={() => exportAs(format)}
    >
      {label}
    </Button>
  );

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Status Report</h2>
          <p className="text-xs text-text-muted">
            {showingAi
              ? "Versão escrita pela IA (ficha M1.2) a partir dos dados do projeto"
              : `Dados do sistema em ${new Date(`${generatedAt}T12:00:00`).toLocaleDateString("pt-BR")}`}
          </p>
          {aiReport && (
            <button onClick={() => setShowAi((v) => !v)} className="mt-1 text-xs text-brand-primary hover:underline">
              {showingAi ? "Ver dados do sistema" : "Ver versão da IA"}
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {exportButton("pdf", "PDF")}
          {exportButton("pptx", "PowerPoint")}
          {exportButton("docx", "Word")}
          <Button size="sm" leftIcon={<Sparkles size={14} />} onClick={() => setNotesOpen(true)} disabled={generating}>
            {aiReport ? "Gerar de novo com IA" : "Gerar com IA"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-accent-red/30 bg-accent-red/10 px-4 py-3 text-sm text-accent-red">{error}</div>
      )}

      <Modal open={notesOpen} onClose={() => !generating && setNotesOpen(false)} title="Gerar Status Report com IA">
        <div className="space-y-3">
          <p className="text-xs text-text-muted">
            A IA usa a ficha <strong>M1.2 · Relatório de Status Semanal</strong> da biblioteca, com as atividades e
            pendências reais deste projeto. Acrescente o que o sistema não sabe — decisões, riscos, conversas com o
            cliente. O Protocolo de Dados (PD.0) é anexado: a IA não inventa números.
          </p>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notas da semana (opcional): o que aconteceu, decisões, riscos, bloqueios..."
            rows={6}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setNotesOpen(false)} disabled={generating}>Cancelar</Button>
            <Button
              onClick={generateWithAi}
              disabled={generating}
              leftIcon={generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            >
              {generating ? "Gerando..." : "Gerar relatório"}
            </Button>
          </div>
        </div>
      </Modal>

      {showingAi ? (
        <Card>
          <div className="p-6 md:p-8 max-w-3xl mx-auto">
            <div className="flex items-center gap-2 mb-4 text-xs text-text-faint">
              <FileText size={14} /> Conteúdo gerado com apoio de IA — revise antes de enviar ao cliente.
            </div>
            <div className="prose-sm max-w-none text-sm text-text-primary leading-relaxed">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => <h2 className="text-base font-semibold mt-4 mb-2">{children}</h2>,
                  h2: ({ children }) => <h3 className="text-sm font-semibold mt-4 mb-2">{children}</h3>,
                  h3: ({ children }) => <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted mt-3 mb-1">{children}</h4>,
                  p: ({ children }) => <p className="mb-2">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-0.5">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-0.5">{children}</ol>,
                  table: ({ children }) => <table className="w-full text-xs border-collapse my-2">{children}</table>,
                  th: ({ children }) => <th className="border border-border bg-surface px-2 py-1 text-left font-medium">{children}</th>,
                  td: ({ children }) => <td className="border border-border px-2 py-1">{children}</td>,
                }}
              >
                {aiReport ?? ""}
              </ReactMarkdown>
            </div>
          </div>
        </Card>
      ) : (
      <Card>
        <div className="p-6 md:p-8 max-w-3xl mx-auto">
          {/* Report header */}
          <div className="border-b border-border pb-5 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-7 w-7 rounded-md bg-brand-primary text-white flex items-center justify-center font-bold text-xs">
                C
              </div>
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Consulcard · Status Report</span>
            </div>
            <h1 className="text-2xl font-semibold text-text-primary mt-2">{project.name}</h1>
            <div className="flex items-center justify-between mt-3 text-xs text-text-muted">
              <span>Cliente: <strong className="text-text-primary">{project.client}</strong></span>
              <span className="font-mono">Referência: {new Date(generatedAt).toLocaleDateString("pt-BR")}</span>
            </div>
          </div>

          {/* Executive summary */}
          <Section title="Resumo Executivo">
            <p className="text-sm text-text-primary leading-relaxed">
              O projeto <strong>{project.name}</strong> avança em ritmo {delayed.length === 0 ? "saudável" : "com atenção"},
              com <strong>{done.length}</strong> atividade{done.length !== 1 && "s"} concluída{done.length !== 1 && "s"},
              <strong> {inProgress.length}</strong> em execução e <strong>{pendencies.length}</strong> pendência{pendencies.length !== 1 && "s"} em aberto.
              {delayed.length > 0 && ` Há ${delayed.length} atividade${delayed.length !== 1 ? "s" : ""} com prazo vencido demandando atenção.`}
            </p>
          </Section>

          <Section title="Atividades concluídas no período">
            {done.length === 0 ? (
              <p className="text-sm text-text-muted italic">Nenhuma atividade concluída no período.</p>
            ) : (
              <ul className="space-y-1.5">
                {done.map((a) => (
                  <li key={a.id} className="flex items-start gap-2 text-sm">
                    <span className="text-accent-green mt-1">✓</span>
                    <span className="text-text-primary">{a.label}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Em andamento">
            {inProgress.length === 0 ? (
              <p className="text-sm text-text-muted italic">Sem atividades em andamento.</p>
            ) : (
              <div className="space-y-2">
                {inProgress.map((a) => (
                  <div key={a.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-b-0">
                    <span className="text-text-primary">{a.label}</span>
                    <ActivityStatus status={a.status!} />
                  </div>
                ))}
              </div>
            )}
          </Section>

          {delayed.length > 0 && (
            <Section title="Atrasadas">
              <ul className="space-y-1.5">
                {delayed.map((a) => (
                  <li key={a.id} className="flex items-center justify-between text-sm">
                    <span className="text-text-primary">{a.label}</span>
                    <span className="text-xs text-accent-red font-mono">
                      venceu em {a.dueDate ? new Date(a.dueDate).toLocaleDateString("pt-BR") : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section title="Pendências abertas">
            {pendencies.length === 0 ? (
              <p className="text-sm text-text-muted italic">Sem pendências em aberto.</p>
            ) : (
              <ul className="space-y-2">
                {pendencies.map((p) => (
                  <li key={p.id} className="flex items-start gap-2 text-sm">
                    <Avatar
                      initials={p.owner.initials}
                      size="xs"
                      tone={p.ownerType === "client" ? "amber" : "brand"}
                    />
                    <div className="flex-1">
                      <div className="text-text-primary">{p.description}</div>
                      <div className="text-[11px] text-text-faint font-mono">
                        {p.owner.name} · até {new Date(p.dueDate).toLocaleDateString("pt-BR")}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Próximos marcos">
            {nextMilestones.length === 0 ? (
              <p className="text-sm text-text-muted italic">Sem marcos próximos definidos.</p>
            ) : (
              <ul className="space-y-1.5">
                {nextMilestones.map((a) => (
                  <li key={a.id} className="flex items-center justify-between text-sm">
                    <span className="text-text-primary">{a.label}</span>
                    <span className="text-xs text-text-muted font-mono">
                      {a.dueDate ? new Date(a.dueDate).toLocaleDateString("pt-BR") : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <div className="pt-5 mt-6 border-t border-border text-[11px] text-text-faint flex items-center justify-between">
            <span>Gerado a partir dos dados do sistema</span>
            <span className="font-mono">{project.id.toUpperCase()}</span>
          </div>
        </div>
      </Card>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="text-[11px] uppercase tracking-wider text-text-muted font-semibold mb-2">{title}</h3>
      {children}
    </div>
  );
}
