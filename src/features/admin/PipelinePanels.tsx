import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";
import { useProjectsStore } from "@/store/projects-store";
import { useUsersStore } from "@/store/users-store";
import { findMacro, findProjectType, MACRO_COLOR_CLASSES } from "@/mocks/project-types";
import type { PortfolioMetrics } from "./portfolio-metrics";
import type { User } from "@/types";

/**
 * Carteira por gerente e carga por consultor, com dados reais. Antes os
 * números (receita da carteira, NPS, cycle time, qualidade, utilização)
 * vinham de um arquivo de exemplo; o sistema não registra esses dados, então
 * as colunas saíram (testes de 06/10, backlog 9).
 */
function useActiveUsers() {
  const users = useUsersStore((s) => s.users);
  const fetchUsers = useUsersStore((s) => s.fetchUsers);
  useEffect(() => { if (users.length === 0) fetchUsers(); }, [users.length, fetchUsers]);
  return users.filter((u) => u.active !== false);
}

export function PipelineByManager({ metrics }: { metrics: PortfolioMetrics }) {
  const users = useActiveUsers();
  // Quem gerencia projeto ativo aparece, qualquer que seja o perfil — vindo do
  // próprio projeto, para não depender da lista de usuários ter carregado.
  const byId = new Map<string, User>();
  for (const h of metrics.activeHealth) {
    const m = h.project.manager;
    if (m?.id) byId.set(m.id, users.find((u) => u.id === m.id) ?? m);
  }
  for (const u of users) if (u.systemRole === "gerente" && !byId.has(u.id)) byId.set(u.id, u);
  const managers = [...byId.values()];

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div>
          <CardTitle>Carteira por gerente</CardTitle>
          <p className="text-[11px] text-text-faint mt-0.5">projetos ativos sob cada gerência</p>
        </div>
        <Badge tone="blue" size="sm">{managers.length} gerentes</Badge>
      </CardHeader>
      <div className="divide-y divide-border">
        {managers.length === 0 && (
          <div className="px-5 py-6 text-xs text-text-faint text-center">Nenhum gerente com projeto ativo.</div>
        )}
        {managers.map((user) => {
          const mine = metrics.activeHealth.filter((h) => h.project.manager?.id === user.id);
          const avg = mine.length ? Math.round(mine.reduce((a, h) => a + (h.project.progress ?? 0), 0) / mine.length) : 0;
          const late = mine.filter((h) => h.delayedActivities > 0 || h.overduePendencies > 0).length;
          const usingCopilot = mine.filter((h) => h.copilotQuestions30d > 0).length;
          return (
            <div key={user.id} className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <Avatar initials={user.initials} size="md" tone="brand" />
                <div>
                  <div className="text-sm font-semibold text-text-primary">{user.name}</div>
                  <div className="text-[11px] text-text-faint">{user.role}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <Stat label="Projetos" value={mine.length} />
                <Stat label="Progresso médio" value={`${avg}%`} />
                <Stat label="Com atraso" value={late} tone={late > 0 ? "red" : "neutral"} />
                <Stat label="Usam co-piloto" value={`${usingCopilot}/${mine.length}`} tone={mine.length && usingCopilot === mine.length ? "green" : "neutral"} />
              </div>

              <div className="space-y-2">
                {mine.map(({ project: p, delayedActivities }) => {
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
                          {delayedActivities > 0 && <span className="ml-1 text-accent-red">· {delayedActivities} atrasada(s)</span>}
                        </div>
                      </div>
                      <div className="w-32">
                        <ProgressBar value={p.progress} size="sm" />
                        <div className="text-[10px] text-right text-text-faint mt-0.5 font-mono">{p.progress}%</div>
                      </div>
                    </Link>
                  );
                })}
                {mine.length === 0 && (
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

export function PipelineByConsultant({ metrics }: { metrics: PortfolioMetrics }) {
  const activitiesByProject = useProjectsStore((s) => s.activitiesByProject);
  const users = useActiveUsers();
  const consultants = users.filter((u) => u.systemRole === "consultor");
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div>
          <CardTitle>Consultores — carga</CardTitle>
          <p className="text-[11px] text-text-faint mt-0.5">atividades atribuídas em projetos ativos e uso do co-piloto (30 dias)</p>
        </div>
        <Badge tone="blue" size="sm">{consultants.length} consultores</Badge>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-text-faint border-b border-border">
              <th className="px-5 py-3 font-medium">Consultor</th>
              <th className="py-3 font-medium">Projetos</th>
              <th className="py-3 font-medium w-[180px]">Atividades concluídas</th>
              <th className="py-3 font-medium">Atrasadas</th>
              <th className="px-5 py-3 font-medium">Perguntas ao co-piloto</th>
            </tr>
          </thead>
          <tbody>
            {consultants.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-6 text-xs text-text-faint text-center">Nenhum consultor cadastrado.</td></tr>
            )}
            {consultants.map((user) => {
              const projects = metrics.activeHealth.filter((h) => h.project.consultants.some((c) => c.id === user.id));
              const acts = metrics.activeHealth.flatMap((h) =>
                (activitiesByProject[h.project.id] ?? []).filter((a) => a.assignee?.id === user.id)
              );
              const done = acts.filter((a) => a.status === "done").length;
              const late = acts.filter((a) => a.status !== "done" && a.dueDate && a.dueDate < today).length;
              const questions = metrics.questionsByAuthor[user.id] ?? 0;
              return (
                <tr key={user.id} className="border-b border-border last:border-b-0 hover:bg-surface">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar initials={user.initials} size="sm" />
                      <div>
                        <div className="text-xs font-medium text-text-primary">{user.name}</div>
                        <div className="text-[10px] text-text-faint">{user.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 text-xs text-text-muted">{projects.length}</td>
                  <td className="py-3 pr-4">
                    <ProgressBar value={acts.length > 0 ? (done / acts.length) * 100 : 0} size="sm" />
                    <div className="text-[10px] text-text-faint mt-0.5 font-mono">{done}/{acts.length}</div>
                  </td>
                  <td className="py-3">
                    {late > 0 ? <Badge tone="red" size="sm">{late}</Badge> : <span className="text-[11px] text-text-faint">—</span>}
                  </td>
                  <td className="px-5 py-3 text-xs font-mono text-text-primary">{questions}</td>
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
