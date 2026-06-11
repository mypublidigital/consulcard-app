import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { PageWrapper, PageHeader } from "@/components/layout/PageWrapper";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ProjectSize, ProjectStatusBadge } from "@/components/ui/StatusPills";
import { Avatar, AvatarStack } from "@/components/ui/Avatar";
import { useProjectsStore } from "@/store/projects-store";
import { findMacro, findProjectType, MACRO_COLOR_CLASSES } from "@/mocks/project-types";

export function ProjectsListPage() {
  const projects = useProjectsStore((s) => s.projects);
  return (
    <PageWrapper>
      <PageHeader
        title="Projetos"
        subtitle={`${projects.length} projetos cadastrados`}
        actions={
          <Link to="/projects/new">
            <Button leftIcon={<Plus size={14} />}>Novo Projeto</Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {projects.map((p) => {
          const macro = findMacro(p.macroCategory);
          const type = findProjectType(p.macroCategory, p.projectType);
          const macroColor = macro ? MACRO_COLOR_CLASSES[macro.color] : null;
          return (
            <Link key={p.id} to={`/projects/${p.id}`}>
              <Card className="hover:border-brand-primary/30 transition-colors h-full">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <Avatar initials={p.clientInitials} size="md" tone="neutral" />
                      <div>
                        <div className="text-sm font-semibold text-text-primary">{p.name}</div>
                        <div className="text-xs text-text-muted">{p.client}</div>
                      </div>
                    </div>
                    <ProjectStatusBadge status={p.status} />
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {macroColor && type && (
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${macroColor.soft} ${macroColor.text}`}>
                        {type.label}
                      </span>
                    )}
                    <ProjectSize size={p.size} />
                  </div>

                  <ProgressBar value={p.progress} size="sm" />
                  <div className="flex items-center justify-between text-[11px] text-text-muted mt-1.5">
                    <span>{p.activitiesDone}/{p.activitiesTotal} atividades</span>
                    <span className="font-mono">{p.progress}%</span>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <AvatarStack users={[p.manager, ...p.consultants]} />
                    <span className="text-[10px] text-text-faint font-mono">
                      kickoff {new Date(p.startDate).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </PageWrapper>
  );
}
