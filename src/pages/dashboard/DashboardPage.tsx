import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  CalendarClock,
  CheckCircle2,
  AlertTriangle,
  Search,
  ArrowUpRight,
} from "lucide-react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ProjectSize, ProjectStatusBadge } from "@/components/ui/StatusPills";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { useProjectsStore } from "@/store/projects-store";
import { PROJECT_TYPES, MACRO_COLOR_CLASSES, findMacro, findProjectType } from "@/mocks/project-types";
import { CURRENT_USER } from "@/mocks/users";
import { formatDateLong, relativeFromNow } from "@/lib/utils";

function firstName(name: string) {
  return name.split(" ")[0];
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function MetricCard({
  icon,
  label,
  value,
  tone,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tone: "brand" | "amber" | "green" | "red";
  hint?: string;
}) {
  const toneClasses = {
    brand: "bg-brand-primary/10 text-brand-primary",
    amber: "bg-accent-amber/10 text-accent-amber",
    green: "bg-accent-green/10 text-accent-green",
    red: "bg-accent-red/10 text-accent-red",
  };
  return (
    <Card>
      <CardBody className="flex items-start gap-4">
        <div className={`h-10 w-10 rounded-md flex items-center justify-center ${toneClasses[tone]}`}>
          {icon}
        </div>
        <div className="flex-1">
          <div className="text-xs text-text-muted">{label}</div>
          <div className="text-2xl font-semibold text-text-primary mt-0.5">{value}</div>
          {hint && <div className="text-[11px] text-text-faint mt-0.5">{hint}</div>}
        </div>
      </CardBody>
    </Card>
  );
}

export function DashboardPage() {
  const projects = useProjectsStore((s) => s.projects);
  const pendencies = useProjectsStore((s) => s.pendencies);
  const activitiesByProject = useProjectsStore((s) => s.activitiesByProject);

  const [search, setSearch] = useState("");
  const [macroFilter, setMacroFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.client.toLowerCase().includes(search.toLowerCase())) return false;
      if (macroFilter && p.macroCategory !== macroFilter) return false;
      if (statusFilter && p.status !== statusFilter) return false;
      return true;
    });
  }, [projects, search, macroFilter, statusFilter]);

  const metrics = useMemo(() => {
    const active = projects.filter((p) => p.status === "in_progress").length;
    const delayed = projects.reduce((acc, p) => acc + (p.activitiesDelayed ?? 0), 0);
    const dueThisWeek = Object.values(activitiesByProject)
      .flat()
      .filter((a) => {
        if (!a.dueDate || a.status === "done") return false;
        const due = new Date(a.dueDate).getTime();
        const now = Date.now();
        return due > now - 86400000 && due < now + 7 * 86400000;
      }).length;
    const doneThisMonth = Object.values(activitiesByProject)
      .flat()
      .filter((a) => a.status === "done").length;
    return { active, delayed, dueThisWeek, doneThisMonth };
  }, [projects, activitiesByProject]);

  const openPendencies = pendencies.filter((p) => p.status === "open").slice(0, 6);

  return (
    <PageWrapper>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">
          {greeting()}, {firstName(CURRENT_USER.name)}
        </h1>
        <p className="text-sm text-text-muted mt-0.5 capitalize">{formatDateLong(new Date())}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          icon={<TrendingUp size={18} />}
          label="Projetos ativos"
          value={metrics.active}
          tone="brand"
          hint="em execução"
        />
        <MetricCard
          icon={<CalendarClock size={18} />}
          label="Vencendo esta semana"
          value={metrics.dueThisWeek}
          tone="amber"
          hint="atividades"
        />
        <MetricCard
          icon={<CheckCircle2 size={18} />}
          label="Concluídas no mês"
          value={metrics.doneThisMonth}
          tone="green"
          hint="entregues"
        />
        <MetricCard
          icon={<AlertTriangle size={18} />}
          label="Projetos com atraso"
          value={metrics.delayed}
          tone="red"
          hint="atividades atrasadas"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-4">
        <Card>
          <CardHeader className="flex items-center justify-between gap-4">
            <CardTitle>Projetos ativos</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint" />
                <Input
                  placeholder="Buscar projeto ou cliente"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 w-56"
                />
              </div>
              <Select value={macroFilter} onChange={(e) => setMacroFilter(e.target.value)} className="h-8">
                <option value="">Todas categorias</option>
                {PROJECT_TYPES.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </Select>
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-8">
                <option value="">Todos status</option>
                <option value="planning">Planejamento</option>
                <option value="in_progress">Em andamento</option>
                <option value="review">Em revisão</option>
                <option value="closed">Encerrado</option>
              </Select>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-text-faint border-b border-border">
                  <th className="px-5 py-3 font-medium">Projeto</th>
                  <th className="py-3 font-medium">Cliente</th>
                  <th className="py-3 font-medium">Tipo</th>
                  <th className="py-3 font-medium">Porte</th>
                  <th className="py-3 font-medium w-[180px]">Progresso</th>
                  <th className="py-3 font-medium">Gerente</th>
                  <th className="py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Atualizado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const macro = findMacro(p.macroCategory);
                  const type = findProjectType(p.macroCategory, p.projectType);
                  const macroColor = macro ? MACRO_COLOR_CLASSES[macro.color] : null;
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-border last:border-b-0 hover:bg-surface group cursor-pointer"
                    >
                      <td className="px-5 py-3">
                        <Link to={`/projects/${p.id}`} className="flex items-center gap-1 font-medium text-text-primary hover:text-brand-primary">
                          {p.name}
                          <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100" />
                        </Link>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {p.tags.slice(0, 2).map((t) => (
                            <span key={t} className="text-[10px] text-text-faint font-mono">#{t}</span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <Avatar initials={p.clientInitials} size="sm" tone="neutral" />
                          <span className="text-text-primary text-xs">{p.client}</span>
                        </div>
                      </td>
                      <td className="py-3">
                        {macroColor && type && (
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${macroColor.soft} ${macroColor.text}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${macroColor.bg}`} />
                            {type.label}
                          </span>
                        )}
                      </td>
                      <td className="py-3">
                        <ProjectSize size={p.size} />
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <ProgressBar value={p.progress} size="sm" className="w-24" />
                          <span className="text-xs text-text-muted font-mono">{p.progress}%</span>
                        </div>
                        <div className="text-[10px] text-text-faint mt-0.5">
                          {p.activitiesDone}/{p.activitiesTotal} atividades
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1.5">
                          <Avatar initials={p.manager.initials} size="xs" />
                          <span className="text-xs text-text-muted">{p.manager.name.split(" ")[0]}</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <ProjectStatusBadge status={p.status} />
                      </td>
                      <td className="px-5 py-3 text-right text-xs text-text-muted">
                        {relativeFromNow(p.lastUpdate)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-12 text-center text-sm text-text-muted">Nenhum projeto encontrado.</div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pendências globais</CardTitle>
            <p className="text-[11px] text-text-faint mt-0.5">Últimas pendências abertas</p>
          </CardHeader>
          <CardBody className="!p-0 divide-y divide-border">
            {openPendencies.length === 0 && (
              <div className="p-5 text-xs text-text-muted">Sem pendências em aberto.</div>
            )}
            {openPendencies.map((pd) => {
              const proj = projects.find((p) => p.id === pd.projectId);
              return (
                <Link
                  key={pd.id}
                  to={`/projects/${pd.projectId}`}
                  className="block px-5 py-3 hover:bg-surface"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs text-text-primary leading-snug flex-1">{pd.description}</p>
                    <Badge tone={pd.ownerType === "client" ? "amber" : "blue"} size="sm">
                      {pd.ownerType === "client" ? "Cliente" : "Equipe"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[10px] text-text-faint">{proj?.name ?? "Projeto"}</span>
                    <span className="text-[10px] text-text-faint font-mono">
                      até {new Date(pd.dueDate).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </Link>
              );
            })}
          </CardBody>
        </Card>
      </div>
    </PageWrapper>
  );
}
