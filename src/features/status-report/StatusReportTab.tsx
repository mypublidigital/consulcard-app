import { useState } from "react";
import { Download, RefreshCw, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useProjectsStore } from "@/store/projects-store";
import type { Project } from "@/types";
import { Avatar } from "@/components/ui/Avatar";
import { ActivityStatus } from "@/components/ui/StatusPills";

export function StatusReportTab({ project }: { project: Project }) {
  const activities = useProjectsStore((s) => s.activitiesByProject[project.id] ?? []);
  const pendencies = useProjectsStore((s) => s.pendencies.filter((p) => p.projectId === project.id && p.status === "open"));
  const [generatedAt, setGeneratedAt] = useState<string>(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);

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

  function regenerate() {
    setLoading(true);
    setTimeout(() => {
      setGeneratedAt(new Date().toISOString().slice(0, 10));
      setLoading(false);
    }, 2000);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Status Report</h2>
          <p className="text-xs text-text-muted">
            Última versão: {new Date(generatedAt).toLocaleDateString("pt-BR")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" leftIcon={<Download size={14} />}>
            Exportar PDF
          </Button>
          <Button
            size="sm"
            leftIcon={loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            onClick={regenerate}
            disabled={loading}
          >
            {loading ? "Gerando..." : "Gerar novo relatório"}
          </Button>
        </div>
      </div>

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
            <span>Gerado automaticamente pelo co-piloto Consulcard</span>
            <span className="font-mono">{project.id.toUpperCase()}</span>
          </div>
        </div>
      </Card>
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
