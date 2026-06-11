import { AlertOctagon, AlertTriangle, Info, CheckCircle2, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { INSIGHTS, type Insight } from "@/mocks/admin";
import { useProjectsStore } from "@/store/projects-store";
import { Link } from "react-router-dom";

const SEVERITY_META: Record<Insight["severity"], { icon: any; ring: string; bg: string; tone: any; label: string }> = {
  critical: { icon: AlertOctagon, ring: "ring-accent-red/30", bg: "bg-accent-red/10 text-accent-red", tone: "red", label: "Crítico" },
  warning: { icon: AlertTriangle, ring: "ring-accent-amber/30", bg: "bg-accent-amber/10 text-accent-amber", tone: "amber", label: "Alerta" },
  info: { icon: Info, ring: "ring-brand-primary/20", bg: "bg-brand-primary/10 text-brand-primary", tone: "blue", label: "Info" },
  positive: { icon: CheckCircle2, ring: "ring-accent-green/20", bg: "bg-accent-green/10 text-accent-green", tone: "green", label: "Positivo" },
};

const CAT_LABEL: Record<Insight["category"], string> = {
  time: "Tempos e movimentos",
  quality: "Qualidade",
  copilot: "Co-piloto",
  risk: "Risco",
};

export function InsightsPanel() {
  const projects = useProjectsStore((s) => s.projects);

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div>
          <CardTitle>Insights acionáveis</CardTitle>
          <p className="text-[11px] text-text-faint mt-0.5">análise automática · co-piloto executivo</p>
        </div>
        <div className="flex items-center gap-1">
          <Badge tone="red" size="sm">{INSIGHTS.filter((i) => i.severity === "critical").length} críticos</Badge>
          <Badge tone="amber" size="sm">{INSIGHTS.filter((i) => i.severity === "warning").length} alertas</Badge>
        </div>
      </CardHeader>
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        {INSIGHTS.map((ins) => {
          const meta = SEVERITY_META[ins.severity];
          const Icon = meta.icon;
          return (
            <div
              key={ins.id}
              className={`rounded-lg border border-border bg-white p-4 ring-1 ${meta.ring}`}
            >
              <div className="flex items-start gap-3">
                <div className={`h-8 w-8 rounded-md flex items-center justify-center shrink-0 ${meta.bg}`}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    <Badge tone={meta.tone} size="sm">{meta.label}</Badge>
                    <Badge tone="neutral" size="sm">{CAT_LABEL[ins.category]}</Badge>
                  </div>
                  <div className="text-sm font-semibold text-text-primary leading-snug">{ins.title}</div>
                  <p className="text-xs text-text-muted mt-1.5 leading-relaxed">{ins.description}</p>

                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="text-[10px] uppercase tracking-wider text-text-faint mb-1">Recomendação</div>
                    <p className="text-xs text-text-primary leading-relaxed">{ins.recommendation}</p>
                  </div>

                  {ins.affectedProjects && ins.affectedProjects.length > 0 && (
                    <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                      {ins.affectedProjects.map((pid) => {
                        const p = projects.find((x) => x.id === pid);
                        if (!p) return null;
                        return (
                          <Link
                            key={pid}
                            to={`/projects/${pid}`}
                            className="inline-flex items-center gap-1 text-[10px] text-brand-primary hover:underline font-mono"
                          >
                            {p.name.slice(0, 30)}
                            <ArrowRight size={9} />
                          </Link>
                        );
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
