import { useEffect, useMemo, useState } from "react";
import { useProjectsStore } from "@/store/projects-store";
import { loadCopilotUsage, type CopilotUsageRow } from "@/lib/copilot-history";
import type { Project } from "@/types";

/**
 * Indicadores do Painel Executivo calculados com os dados reais do sistema.
 *
 * Testes de 06/10 (backlog 9 e 17): os KPIs, os insights, a "análise
 * qualitativa", o pipeline em R$ e o ranking de perguntas vinham de um arquivo
 * de exemplo — com projetos e pessoas que não existem ("Wagner Lima"). O
 * sistema não guarda valor financeiro de contrato, então esse indicador saiu.
 */
export interface ProjectHealth {
  project: Project;
  delayedActivities: number;
  overduePendencies: number;
  openPendencies: number;
  copilotQuestions30d: number;
}

export function useCopilotUsage(days = 30) {
  const [rows, setRows] = useState<CopilotUsageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    loadCopilotUsage(days)
      .then((r) => { if (!cancelled) setRows(r); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [days]);
  return { rows, loading, error };
}

export function usePortfolioMetrics(usage: CopilotUsageRow[]) {
  const projects = useProjectsStore((s) => s.projects);
  const activitiesByProject = useProjectsStore((s) => s.activitiesByProject);
  const pendencies = useProjectsStore((s) => s.pendencies);

  return useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const active = projects.filter((p) => p.status !== "closed");
    const questions = usage.filter((u) => u.role === "user");

    const health: ProjectHealth[] = projects.map((project) => {
      const acts = activitiesByProject[project.id] ?? [];
      const pends = pendencies.filter((p) => p.projectId === project.id && p.status === "open");
      return {
        project,
        delayedActivities: acts.filter((a) => a.status !== "done" && a.dueDate && a.dueDate < today).length,
        openPendencies: pends.length,
        overduePendencies: pends.filter((p) => p.dueDate && p.dueDate < today).length,
        copilotQuestions30d: questions.filter((q) => q.projectId === project.id).length,
      };
    });
    const activeHealth = health.filter((h) => h.project.status !== "closed");

    const sum = (f: (h: ProjectHealth) => number, list = activeHealth) => list.reduce((a, h) => a + f(h), 0);
    const usingCopilot = activeHealth.filter((h) => h.copilotQuestions30d > 0).length;

    // Uso de fichas da Biblioteca por projeto (copilot_messages.prompt_id).
    const promptUsage = new Map<string, Map<string, number>>();
    for (const q of questions) {
      if (!q.promptId) continue;
      const byProject = promptUsage.get(q.promptId) ?? new Map<string, number>();
      byProject.set(q.projectId, (byProject.get(q.projectId) ?? 0) + 1);
      promptUsage.set(q.promptId, byProject);
    }

    return {
      projects,
      health,
      activeHealth,
      kpis: {
        activeProjects: active.length,
        avgProgress: active.length ? Math.round(active.reduce((a, p) => a + (p.progress ?? 0), 0) / active.length) : 0,
        delayedActivities: sum((h) => h.delayedActivities),
        openPendencies: sum((h) => h.openPendencies),
        overduePendencies: sum((h) => h.overduePendencies),
        copilotAdoption: activeHealth.length ? Math.round((usingCopilot / activeHealth.length) * 100) : 0,
        projectsUsingCopilot: usingCopilot,
        copilotQuestions: questions.length,
        copilotUsers: new Set(questions.map((q) => q.authorId).filter(Boolean)).size,
        promptsUsed: questions.filter((q) => q.promptId).length,
      },
      questionsByAuthor: questions.reduce<Record<string, number>>((acc, q) => {
        if (q.authorId) acc[q.authorId] = (acc[q.authorId] ?? 0) + 1;
        return acc;
      }, {}),
      promptUsage,
    };
  }, [projects, activitiesByProject, pendencies, usage]);
}

export type PortfolioMetrics = ReturnType<typeof usePortfolioMetrics>;
