import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  FileText,
  Plus,
  MoreHorizontal,
  KanbanSquare,
  Bot,
  AlertCircle,
  Files,
  FileBarChart,
  ExternalLink,
} from "lucide-react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar, AvatarStack } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import {
  ProjectSize,
  PROJECT_STATUS_OPTIONS,
} from "@/components/ui/StatusPills";
import { findMacro, findProjectType, MACRO_COLOR_CLASSES } from "@/mocks/project-types";
import { useProjectsStore } from "@/store/projects-store";
import { cn } from "@/lib/utils";
import { ActivityBoardTab } from "@/features/activity-board/ActivityBoardTab";
import { CopilotTab } from "@/features/ai-copilot/CopilotTab";
import { PendenciesTab } from "@/features/pendencies/PendenciesTab";
import { DocumentsTab } from "@/features/documents/DocumentsTab";
import { StatusReportTab } from "@/features/status-report/StatusReportTab";

type TabId = "activities" | "copilot" | "pendencies" | "documents" | "report";

const TABS: { id: TabId; label: string; icon: any }[] = [
  { id: "activities", label: "Atividades", icon: KanbanSquare },
  { id: "copilot", label: "Co-piloto IA", icon: Bot },
  { id: "pendencies", label: "Pendências", icon: AlertCircle },
  { id: "documents", label: "Documentos", icon: Files },
  { id: "report", label: "Status Report", icon: FileBarChart },
];

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const project = useProjectsStore((s) => s.projects.find((p) => p.id === id));
  const activities = useProjectsStore((s) => (id ? s.activitiesByProject[id] ?? [] : []));
  const setStatus = useProjectsStore((s) => s.setProjectStatus);
  const [tab, setTab] = useState<TabId>("activities");

  if (!project) {
    return (
      <PageWrapper>
        <Card>
          <div className="p-12 text-center">
            <h2 className="text-lg font-semibold">Projeto não encontrado</h2>
            <p className="text-sm text-text-muted mt-2">
              <Link to="/" className="text-brand-primary hover:underline">
                Voltar ao dashboard
              </Link>
            </p>
          </div>
        </Card>
      </PageWrapper>
    );
  }

  const macro = findMacro(project.macroCategory);
  const type = findProjectType(project.macroCategory, project.projectType);
  const macroColor = macro ? MACRO_COLOR_CLASSES[macro.color] : null;
  const done = activities.filter((a) => a.status === "done").length;
  const total = activities.length || 1;
  const progress = Math.round((done / total) * 100);

  return (
    <PageWrapper fullWidth>
      <div className="max-w-[1440px] mx-auto px-6 pt-6">
        {/* Project header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
          <div className="flex items-start gap-3">
            <Avatar initials={project.clientInitials} size="lg" tone="neutral" />
            <div>
              <h1 className="text-xl font-semibold text-text-primary">{project.name}</h1>
              <p className="text-sm text-text-muted">{project.client}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {macroColor && type && (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${macroColor.soft} ${macroColor.text}`}>
                    {type.label}
                  </span>
                )}
                <ProjectSize size={project.size} />
                {project.tags.slice(0, 3).map((t) => (
                  <Badge key={t} tone="neutral" size="sm">
                    #{t}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={project.status}
              onChange={(e) => setStatus(project.id, e.target.value as any)}
              className="h-9 rounded-md border border-border bg-white px-2.5 text-sm focus:border-brand-primary focus:outline-none"
            >
              {PROJECT_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <Button variant="secondary" size="sm" leftIcon={<FileText size={14} />} onClick={() => setTab("report")}>
              Gerar Status Report
            </Button>
            <Button variant="outline" size="sm" leftIcon={<Plus size={14} />} onClick={() => setTab("pendencies")}>
              Adicionar pendência
            </Button>
            <Link to={`/client/${project.id}`} target="_blank">
              <Button variant="ghost" size="sm" leftIcon={<ExternalLink size={14} />}>
                Ver portal
              </Button>
            </Link>
            <button className="h-9 w-9 rounded-md hover:bg-[#F0EDE6] flex items-center justify-center text-text-muted" aria-label="Mais opções">
              <MoreHorizontal size={16} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_220px_220px] gap-4 mb-5">
          <Card>
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-text-muted">Progresso geral</span>
                <span className="text-sm font-mono font-semibold text-text-primary">{progress}%</span>
              </div>
              <ProgressBar value={progress} size="md" />
              <div className="text-[11px] text-text-faint mt-1.5">
                {done}/{activities.length} atividades concluídas
              </div>
            </div>
          </Card>
          <Card>
            <div className="p-4">
              <div className="text-xs text-text-muted mb-1">Gerente</div>
              <div className="flex items-center gap-2">
                <Avatar initials={project.manager.initials} size="sm" />
                <div>
                  <div className="text-xs font-medium text-text-primary">{project.manager.name}</div>
                  <div className="text-[10px] text-text-faint">{project.manager.role}</div>
                </div>
              </div>
            </div>
          </Card>
          <Card>
            <div className="p-4">
              <div className="text-xs text-text-muted mb-2">Consultores</div>
              {project.consultants.length > 0 ? (
                <AvatarStack users={project.consultants} max={4} />
              ) : (
                <div className="text-[11px] text-text-faint">Nenhum alocado</div>
              )}
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <div className="border-b border-border flex items-center gap-1 mb-4 overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2.5 text-sm border-b-2 -mb-px transition-colors whitespace-nowrap",
                  active
                    ? "border-brand-primary text-brand-primary font-medium"
                    : "border-transparent text-text-muted hover:text-text-primary"
                )}
              >
                <Icon size={14} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-6 pb-8">
        {tab === "activities" && <ActivityBoardTab projectId={project.id} />}
        {tab === "copilot" && <CopilotTab project={project} />}
        {tab === "pendencies" && <PendenciesTab projectId={project.id} />}
        {tab === "documents" && <DocumentsTab projectId={project.id} />}
        {tab === "report" && <StatusReportTab project={project} />}
      </div>
    </PageWrapper>
  );
}
