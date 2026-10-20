import { AlertOctagon, AlertTriangle, Info, CheckCircle2, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { PortfolioMetrics } from "./portfolio-metrics";

type Severity = "critical" | "warning" | "info" | "positive";

interface Insight {
  id: string;
  severity: Severity;
  title: string;
  description: string;
  recommendation: string;
  projectIds: string[];
}

const SEVERITY_META: Record<Severity, { icon: typeof Info; ring: string; bg: string; tone: "red" | "amber" | "blue" | "green"; label: string }> = {
  critical: { icon: AlertOctagon, ring: "ring-accent-red/30", bg: "bg-accent-red/10 text-accent-red", tone: "red", label: "Crítico" },
  warning: { icon: AlertTriangle, ring: "ring-accent-amber/30", bg: "bg-accent-amber/10 text-accent-amber", tone: "amber", label: "Alerta" },
  info: { icon: Info, ring: "ring-brand-primary/20", bg: "bg-brand-primary/10 text-brand-primary", tone: "blue", label: "Info" },
  positive: { icon: CheckCircle2, ring: "ring-accent-green/20", bg: "bg-accent-green/10 text-accent-green", tone: "green", label: "Positivo" },
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Alertas calculados com regras simples sobre os dados reais. Antes eram
 * textos de exemplo fixos, com projetos e consultores que não existem
 * (testes de 06/10, backlog 9 e 17).
 */
function buildInsights(m: PortfolioMetrics, usageLoaded: boolean): Insight[] {
  const out: Insight[] = [];
  const h = m.activeHealth;

  const delayed = h.filter((x) => x.delayedActivities > 0).sort((a, b) => b.delayedActivities - a.delayedActivities);
  if (delayed.length) {
    const worst = delayed[0];
    out.push({
      id: "delayed",
      severity: delayed.some((x) => x.delayedActivities >= 3) ? "critical" : "warning",
      title: `${plural(delayed.length, "projeto", "projetos")} com atividades atrasadas`,
      description: `${plural(m.kpis.delayedActivities, "atividade", "atividades")} com prazo vencido. O mais afetado é "${worst.project.name}", com ${plural(worst.delayedActivities, "atividade atrasada", "atividades atrasadas")}.`,
      recommendation: "Revisar prazos e responsáveis no quadro de atividades com os gerentes desses projetos.",
      projectIds: delayed.slice(0, 4).map((x) => x.project.id),
    });
  }

  const overdue = h.filter((x) => x.overduePendencies > 0).sort((a, b) => b.overduePendencies - a.overduePendencies);
  if (overdue.length) {
    out.push({
      id: "overdue-pendencies",
      severity: "warning",
      title: `${plural(m.kpis.overduePendencies, "pendência vencida", "pendências vencidas")}`,
      description: `Em ${plural(overdue.length, "projeto", "projetos")}. Pendência vencida costuma travar a atividade que depende dela.`,
      recommendation: "Cobrar os responsáveis ou renegociar o prazo na aba Pendências de cada projeto.",
      projectIds: overdue.slice(0, 4).map((x) => x.project.id),
    });
  }

  if (usageLoaded) {
    const idle = h.filter((x) => x.copilotQuestions30d === 0);
    if (idle.length) {
      out.push({
        id: "copilot-idle",
        severity: "info",
        title: `${plural(idle.length, "projeto ativo", "projetos ativos")} sem uso do co-piloto em 30 dias`,
        description: "Nenhuma pergunta ao co-piloto nesses projetos no período.",
        recommendation: "Verificar com as equipes se há barreira de uso (acesso, treinamento ou tipo de atividade).",
        projectIds: idle.slice(0, 4).map((x) => x.project.id),
      });
    }
  }

  if (!out.length && h.length) {
    out.push({
      id: "all-good",
      severity: "positive",
      title: "Nenhum atraso no portfólio ativo",
      description: "Não há atividades nem pendências com prazo vencido nos projetos ativos.",
      recommendation: "Manter a rotina de atualização do quadro para o indicador continuar confiável.",
      projectIds: [],
    });
  }
  return out;
}

export function InsightsPanel({ metrics, usageLoaded }: { metrics: PortfolioMetrics; usageLoaded: boolean }) {
  const insights = buildInsights(metrics, usageLoaded);
  const byId = new Map(metrics.projects.map((p) => [p.id, p]));

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div>
          <CardTitle>Alertas do portfólio</CardTitle>
          <p className="text-[11px] text-text-faint mt-0.5">calculados com os prazos e o uso registrados no sistema</p>
        </div>
        <div className="flex items-center gap-1">
          <Badge tone="red" size="sm">{insights.filter((i) => i.severity === "critical").length} críticos</Badge>
          <Badge tone="amber" size="sm">{insights.filter((i) => i.severity === "warning").length} alertas</Badge>
        </div>
      </CardHeader>
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        {insights.length === 0 && (
          <div className="col-span-full py-6 text-center text-xs text-text-faint">Nenhum projeto ativo.</div>
        )}
        {insights.map((ins) => {
          const meta = SEVERITY_META[ins.severity];
          const Icon = meta.icon;
          return (
            <div key={ins.id} className={`rounded-lg border border-border bg-white p-4 ring-1 ${meta.ring}`}>
              <div className="flex items-start gap-3">
                <div className={`h-8 w-8 rounded-md flex items-center justify-center shrink-0 ${meta.bg}`}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <Badge tone={meta.tone} size="sm">{meta.label}</Badge>
                  <div className="mt-1 text-sm font-semibold text-text-primary leading-snug">{ins.title}</div>
                  <p className="text-xs text-text-muted mt-1.5 leading-relaxed">{ins.description}</p>
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="text-[10px] uppercase tracking-wider text-text-faint mb-1">Recomendação</div>
                    <p className="text-xs text-text-primary leading-relaxed">{ins.recommendation}</p>
                  </div>
                  {ins.projectIds.length > 0 && (
                    <div className="mt-3 flex items-center gap-x-3 gap-y-1 flex-wrap">
                      {ins.projectIds.map((pid) => {
                        const p = byId.get(pid);
                        return p ? (
                          <Link key={pid} to={`/projects/${pid}`} className="inline-flex items-center gap-1 text-[10px] text-brand-primary hover:underline">
                            {p.name.slice(0, 34)} <ArrowRight size={9} />
                          </Link>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
