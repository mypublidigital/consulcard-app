import type { ActivityStatusValue, LLMImpactLevel, ProjectStatus } from "@/types";
import { Badge } from "./Badge";
import { cn } from "@/lib/utils";

const COMPLEXITY_LABELS: Record<number, { label: string; tone: any }> = {
  1: { label: "Muito Simples", tone: "green" },
  2: { label: "Simples", tone: "green" },
  3: { label: "Médio", tone: "amber" },
  4: { label: "Complexo", tone: "amber" },
  5: { label: "Muito Complexo", tone: "red" },
};

export function ComplexityBadge({ level }: { level: number }) {
  const meta = COMPLEXITY_LABELS[level] ?? COMPLEXITY_LABELS[3];
  return (
    <Badge tone={meta.tone}>
      C{level} · {meta.label}
    </Badge>
  );
}

const ACTIVITY_STATUS_META: Record<ActivityStatusValue, { label: string; dot: string }> = {
  todo: { label: "A fazer", dot: "bg-text-faint" },
  in_progress: { label: "Em andamento", dot: "bg-brand-primary" },
  review: { label: "Em revisão", dot: "bg-accent-amber" },
  done: { label: "Concluída", dot: "bg-accent-green" },
};

export function ActivityStatus({ status }: { status: ActivityStatusValue }) {
  const meta = ACTIVITY_STATUS_META[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-text-muted">
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}

const LLM_META: Record<LLMImpactLevel, { label: string; symbol: string; tone: any }> = {
  high: { label: "Alto", symbol: "🟢", tone: "green" },
  medium: { label: "Médio", symbol: "🟡", tone: "amber" },
  low: { label: "Baixo", symbol: "🔴", tone: "red" },
};

export function LLMImpact({ level }: { level: LLMImpactLevel }) {
  const meta = LLM_META[level];
  return (
    <Badge tone={meta.tone}>
      <span>{meta.symbol}</span> IA {meta.label}
    </Badge>
  );
}

const SIZE_LABELS: Record<string, string> = {
  P1: "P1 · Pequeno",
  P2: "P2 · Pequeno-Médio",
  P3: "P3 · Médio",
  P4: "P4 · Grande",
  P5: "P5 · Muito Grande",
};

export function ProjectSize({ size }: { size: string }) {
  return <Badge tone="blue">{SIZE_LABELS[size] ?? size}</Badge>;
}

const PROJECT_STATUS_META: Record<ProjectStatus, { label: string; tone: any }> = {
  planning: { label: "Planejamento", tone: "neutral" },
  in_progress: { label: "Em andamento", tone: "blue" },
  review: { label: "Em revisão", tone: "amber" },
  closed: { label: "Encerrado", tone: "green" },
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const meta = PROJECT_STATUS_META[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export const PROJECT_STATUS_OPTIONS = Object.entries(PROJECT_STATUS_META).map(([k, v]) => ({
  value: k as ProjectStatus,
  label: v.label,
}));
