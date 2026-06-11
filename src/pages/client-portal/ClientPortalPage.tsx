import { Link, useParams } from "react-router-dom";
import { Check, Clock, AlertCircle, Mail } from "lucide-react";
import { useProjectsStore } from "@/store/projects-store";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import type { ProjectPhase } from "@/types";

const PHASES: { id: ProjectPhase; label: string }[] = [
  { id: "planejamento", label: "Planejamento" },
  { id: "diagnostico", label: "Diagnóstico" },
  { id: "execucao", label: "Execução" },
  { id: "validacao", label: "Validação" },
  { id: "entrega", label: "Entrega" },
];

export function ClientPortalPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const project = useProjectsStore((s) => s.projects.find((p) => p.id === projectId));
  const activities = useProjectsStore((s) => (projectId ? s.activitiesByProject[projectId] ?? [] : []));
  const pendencies = useProjectsStore((s) => s.pendencies.filter((p) => p.projectId === projectId && p.status === "open"));

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <h1 className="text-lg font-semibold">Projeto não encontrado</h1>
          <Link to="/" className="text-brand-primary text-sm hover:underline">Voltar</Link>
        </div>
      </div>
    );
  }

  const done = activities.filter((a) => a.status === "done");
  const progress = activities.length > 0 ? Math.round((done.length / activities.length) * 100) : 0;
  const currentPhaseIdx = 2;
  const nextMilestones = activities
    .filter((a) => a.status !== "done" && a.dueDate)
    .sort((x, y) => (x.dueDate ?? "").localeCompare(y.dueDate ?? ""))
    .slice(0, 4);
  const clientPendencies = pendencies.filter((p) => p.ownerType === "client");

  return (
    <div className="min-h-screen bg-[#F7F5EF]">
      {/* Header */}
      <header className="bg-white border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-brand-primary text-white flex items-center justify-center font-bold">
              C
            </div>
            <div>
              <div className="text-lg font-semibold text-text-primary">Consulcard</div>
              <div className="text-xs text-text-muted">Acompanhamento de Projeto</div>
            </div>
          </div>
          <Badge tone="green" size="md">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-green mr-1" />
            Em andamento
          </Badge>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Project info */}
        <div>
          <div className="text-xs uppercase tracking-wider text-text-faint font-semibold mb-1">
            Projeto
          </div>
          <h1 className="text-3xl font-semibold text-text-primary">{project.name}</h1>
          <p className="text-sm text-text-muted mt-1">{project.client}</p>
        </div>

        {/* Progress */}
        <Card>
          <div className="p-6">
            <div className="flex items-baseline justify-between mb-3">
              <div>
                <div className="text-xs text-text-muted">Progresso geral</div>
                <div className="text-3xl font-semibold text-text-primary mt-1 font-mono">{progress}%</div>
              </div>
              <div className="text-right text-xs text-text-muted">
                {done.length} de {activities.length} atividades concluídas
              </div>
            </div>
            <ProgressBar value={progress} size="lg" tone="brand" />
          </div>
        </Card>

        {/* Phases timeline */}
        <Card>
          <div className="p-6">
            <h2 className="text-sm font-semibold text-text-primary mb-4">Fases do projeto</h2>
            <div className="relative">
              <div className="absolute top-4 left-4 right-4 h-px bg-border" />
              <div
                className="absolute top-4 left-4 h-px bg-brand-primary transition-all"
                style={{ width: `calc(${(currentPhaseIdx / (PHASES.length - 1)) * 100}% - 16px)` }}
              />
              <div className="relative grid grid-cols-5 gap-2">
                {PHASES.map((p, i) => {
                  const done = i < currentPhaseIdx;
                  const active = i === currentPhaseIdx;
                  return (
                    <div key={p.id} className="flex flex-col items-center">
                      <div
                        className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 bg-white",
                          done && "border-brand-primary bg-brand-primary text-white",
                          active && "border-brand-primary ring-4 ring-brand-primary/15",
                          !done && !active && "border-border text-text-faint"
                        )}
                      >
                        {done ? <Check size={14} /> : active ? <Clock size={14} className="text-brand-primary" /> : i + 1}
                      </div>
                      <div
                        className={cn(
                          "mt-2 text-xs text-center",
                          (done || active) ? "text-text-primary font-medium" : "text-text-faint"
                        )}
                      >
                        {p.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>

        {/* Last status report */}
        <Card>
          <div className="p-6">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-sm font-semibold text-text-primary">Último Status Report</h2>
              <span className="text-xs text-text-muted font-mono">
                {new Date(project.lastUpdate).toLocaleDateString("pt-BR")}
              </span>
            </div>

            <Section title="Atividades concluídas recentemente">
              {done.length === 0 ? (
                <p className="text-sm text-text-muted italic">Aguardando primeiras entregas.</p>
              ) : (
                <ul className="space-y-1.5">
                  {done.slice(-5).map((a) => (
                    <li key={a.id} className="flex items-start gap-2 text-sm">
                      <Check size={14} className="text-accent-green mt-0.5" />
                      <span className="text-text-primary">{a.label}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Próximos marcos">
              {nextMilestones.length === 0 ? (
                <p className="text-sm text-text-muted italic">Sem marcos próximos definidos.</p>
              ) : (
                <ul className="space-y-2">
                  {nextMilestones.map((a) => (
                    <li key={a.id} className="flex items-center justify-between text-sm py-2 border-b border-border last:border-b-0">
                      <span className="text-text-primary">{a.label}</span>
                      <span className="text-xs text-text-muted font-mono">
                        {a.dueDate ? new Date(a.dueDate).toLocaleDateString("pt-BR") : "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>
        </Card>

        {/* Client pendencies */}
        {clientPendencies.length > 0 && (
          <Card className="border-accent-amber/40 bg-accent-amber/5">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle size={16} className="text-accent-amber" />
                <h2 className="text-sm font-semibold text-text-primary">Pendências que dependem de você</h2>
              </div>
              <ul className="space-y-2">
                {clientPendencies.map((p) => (
                  <li key={p.id} className="flex items-start gap-3 text-sm bg-white rounded-md border border-border p-3">
                    <div className="flex-1">
                      <div className="text-text-primary">{p.description}</div>
                      <div className="text-[11px] text-text-faint font-mono mt-1">
                        Prazo: {new Date(p.dueDate).toLocaleDateString("pt-BR")}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        )}

        {/* Contact */}
        <Card>
          <div className="p-6">
            <h2 className="text-sm font-semibold text-text-primary mb-3">Seu ponto de contato</h2>
            <div className="flex items-center gap-3">
              <Avatar initials={project.manager.initials} size="lg" tone="brand" />
              <div className="flex-1">
                <div className="text-sm font-medium text-text-primary">{project.manager.name}</div>
                <div className="text-xs text-text-muted">{project.manager.role}</div>
                <a
                  href={`mailto:${project.manager.name.toLowerCase().replace(/\s+/g, ".")}@consulcard.com.br`}
                  className="inline-flex items-center gap-1 mt-1.5 text-xs text-brand-primary hover:underline"
                >
                  <Mail size={12} />
                  {project.manager.name.toLowerCase().replace(/\s+/g, ".")}@consulcard.com.br
                </a>
              </div>
            </div>
          </div>
        </Card>

        <div className="text-center text-[11px] text-text-faint pt-4">
          © Consulcard · Consultoria em Mercado Financeiro
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 last:mb-0">
      <h3 className="text-[11px] uppercase tracking-wider text-text-muted font-semibold mb-2">{title}</h3>
      {children}
    </div>
  );
}
