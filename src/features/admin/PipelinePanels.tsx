import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";
import { USERS } from "@/mocks/users";
import { useProjectsStore } from "@/store/projects-store";
import { CONSULTANT_METRICS, MANAGER_METRICS } from "@/mocks/admin";
import { findMacro, findProjectType, MACRO_COLOR_CLASSES } from "@/mocks/project-types";
import { Link } from "react-router-dom";

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export function PipelineByManager() {
  const projects = useProjectsStore((s) => s.projects);

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div>
          <CardTitle>Pipeline por gerente</CardTitle>
          <p className="text-[11px] text-text-faint mt-0.5">workflow consolidado por carteira</p>
        </div>
        <Badge tone="blue" size="sm">{MANAGER_METRICS.length} gerentes</Badge>
      </CardHeader>
      <div className="divide-y divide-border">
        {MANAGER_METRICS.map((m) => {
          const user = USERS.find((u) => u.id === m.userId)!;
          const managerProjects = projects.filter((p) => p.manager.id === m.userId);
          return (
            <div key={m.userId} className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Avatar initials={user.initials} size="md" tone="brand" />
                  <div>
                    <div className="text-sm font-semibold text-text-primary">{user.name}</div>
                    <div className="text-[11px] text-text-faint">{user.role}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-text-faint uppercase tracking-wider">Receita carteira</div>
                  <div className="text-sm font-semibold font-mono text-text-primary">{formatBRL(m.portfolioRevenueR)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <Stat label="Projetos" value={m.projectsManaged} />
                <Stat label="Progresso médio" value={`${m.avgProgress}%`} />
                <Stat
                  label="Em atraso"
                  value={m.delayedProjects}
                  tone={m.delayedProjects > 0 ? "red" : "neutral"}
                />
                <Stat label="Adoção co-piloto" value={`${m.copilotAdoption}%`} tone={m.copilotAdoption > 70 ? "green" : "amber"} />
              </div>

              <div className="space-y-2">
                {managerProjects.map((p) => {
                  const macro = findMacro(p.macroCategory);
                  const type = findProjectType(p.macroCategory, p.projectType);
                  const macroColor = macro ? MACRO_COLOR_CLASSES[macro.color] : null;
                  return (
                    <Link
                      key={p.id}
                      to={`/projects/${p.id}`}
                      className="flex items-center gap-3 rounded-md border border-border bg-surface px-3 py-2 hover:border-brand-primary/30"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-text-primary truncate">{p.name}</div>
                        <div className="text-[10px] text-text-faint truncate">
                          {macroColor && type && (
                            <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0 text-[10px] ${macroColor.soft} ${macroColor.text} mr-1`}>
                              {type.label}
                            </span>
                          )}
                          {p.client}
                        </div>
                      </div>
                      <div className="w-32">
                        <ProgressBar value={p.progress} size="sm" />
                        <div className="text-[10px] text-right text-text-faint mt-0.5 font-mono">{p.progress}%</div>
                      </div>
                    </Link>
                  );
                })}
                {managerProjects.length === 0 && (
                  <div className="text-[11px] text-text-faint italic px-2 py-1">Sem projetos ativos sob esta gerência.</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function PipelineByConsultant() {
  const projects = useProjectsStore((s) => s.projects);
  const activitiesByProject = useProjectsStore((s) => s.activitiesByProject);

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div>
          <CardTitle>Consultores — carga e desempenho</CardTitle>
          <p className="text-[11px] text-text-faint mt-0.5">cycle time, qualidade e uso do co-piloto</p>
        </div>
        <Badge tone="blue" size="sm">{CONSULTANT_METRICS.length} consultores</Badge>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-text-faint border-b border-border">
              <th className="px-5 py-3 font-medium">Consultor</th>
              <th className="py-3 font-medium">Projetos</th>
              <th className="py-3 font-medium w-[180px]">Atividades</th>
              <th className="py-3 font-medium">Cycle time</th>
              <th className="py-3 font-medium">Co-piloto</th>
              <th className="py-3 font-medium">Qualidade</th>
              <th className="px-5 py-3 font-medium">Utilização</th>
            </tr>
          </thead>
          <tbody>
            {CONSULTANT_METRICS.map((c) => {
              const user = USERS.find((u) => u.id === c.userId)!;
              const consultantProjects = projects.filter((p) => p.consultants.some((x) => x.id === c.userId));
              const totalAssigned = consultantProjects.reduce((acc, p) => {
                const acts = activitiesByProject[p.id] ?? [];
                return acc + acts.filter((a) => a.assignee?.id === c.userId).length;
              }, 0);
              const totalDone = consultantProjects.reduce((acc, p) => {
                const acts = activitiesByProject[p.id] ?? [];
                return acc + acts.filter((a) => a.assignee?.id === c.userId && a.status === "done").length;
              }, 0);
              const assigned = Math.max(totalAssigned, c.activitiesAssigned);
              const done = Math.max(totalDone, c.activitiesDone);
              const cycleTone = c.avgCycleTimeDays === 0 ? "neutral" : c.avgCycleTimeDays > 7 ? "red" : c.avgCycleTimeDays > 5.5 ? "amber" : "green";
              const utilTone = c.utilizationPct < 30 ? "red" : c.utilizationPct > 90 ? "amber" : "green";

              return (
                <tr key={c.userId} className="border-b border-border last:border-b-0 hover:bg-surface">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar initials={user.initials} size="sm" />
                      <div>
                        <div className="text-xs font-medium text-text-primary">{user.name}</div>
                        <div className="text-[10px] text-text-faint">{user.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 text-xs text-text-muted">{c.projectsActive}</td>
                  <td className="py-3 pr-4">
                    <ProgressBar value={assigned > 0 ? (done / assigned) * 100 : 0} size="sm" />
                    <div className="text-[10px] text-text-faint mt-0.5 font-mono">{done}/{assigned}</div>
                  </td>
                  <td className="py-3">
                    {c.avgCycleTimeDays > 0 ? (
                      <Badge tone={cycleTone as any} size="sm">{c.avgCycleTimeDays.toFixed(1)} d</Badge>
                    ) : (
                      <span className="text-[11px] text-text-faint">—</span>
                    )}
                  </td>
                  <td className="py-3">
                    <div className="text-xs text-text-primary font-mono">{c.copilotMessages}</div>
                    <div className="text-[10px] text-text-faint">{c.copilotArtifacts} artefatos</div>
                  </td>
                  <td className="py-3">
                    {c.qualityScore > 0 ? (
                      <span className="text-xs font-mono text-text-primary">{c.qualityScore}</span>
                    ) : (
                      <span className="text-[11px] text-text-faint">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <ProgressBar value={c.utilizationPct} size="sm" className="w-20" tone={utilTone === "red" || utilTone === "amber" ? "amber" : "green"} />
                      <span className="text-[11px] text-text-muted font-mono">{c.utilizationPct}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Stat({ label, value, tone = "neutral" }: { label: string; value: string | number; tone?: "neutral" | "red" | "green" | "amber" }) {
  const colors = {
    neutral: "text-text-primary",
    red: "text-accent-red",
    green: "text-accent-green",
    amber: "text-accent-amber",
  };
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2">
      <div className="text-[10px] text-text-faint uppercase tracking-wider">{label}</div>
      <div className={`text-base font-semibold mt-0.5 ${colors[tone]}`}>{value}</div>
    </div>
  );
}
