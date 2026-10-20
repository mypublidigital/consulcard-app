import {
  FolderKanban,
  TrendingUp,
  AlertTriangle,
  AlertCircle,
  Bot,
  Clock,
  Crown,
  Shield,
} from "lucide-react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useCopilotUsage, usePortfolioMetrics } from "@/features/admin/portfolio-metrics";
import { PipelineByManager, PipelineByConsultant } from "@/features/admin/PipelinePanels";
import { TopQuestions, PromptUsageMatrix } from "@/features/admin/UsagePanels";
import { InsightsPanel } from "@/features/admin/InsightsPanel";
import { DirectorChat } from "@/features/admin/DirectorChat";
import { useAuthStore } from "@/store/auth-store";
import type { UserRole } from "@/types";

const ALLOWED_ROLES: UserRole[] = ["admin", "diretor"];

function AccessDenied() {
  return (
    <PageWrapper>
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center">
        <div className="h-16 w-16 rounded-full bg-accent-red/10 text-accent-red flex items-center justify-center">
          <Shield size={28} />
        </div>
        <h2 className="text-xl font-semibold text-text-primary">Acesso restrito</h2>
        <p className="text-sm text-text-muted max-w-sm">
          O Painel Executivo é acessível apenas para usuários com perfil <strong>Admin</strong> ou{" "}
          <strong>Diretor</strong>.
        </p>
        <Badge tone="red" size="md">Sem permissão</Badge>
      </div>
    </PageWrapper>
  );
}

function KpiCard({
  icon,
  label,
  value,
  tone,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tone: "brand" | "amber" | "green" | "red" | "purple";
  hint?: string;
}) {
  const toneClasses = {
    brand: "bg-brand-primary/10 text-brand-primary",
    amber: "bg-accent-amber/10 text-accent-amber",
    green: "bg-accent-green/10 text-accent-green",
    red: "bg-accent-red/10 text-accent-red",
    purple: "bg-[#6D28D9]/10 text-[#6D28D9]",
  };
  return (
    <Card>
      <CardBody className="flex items-start gap-3">
        <div className={`h-9 w-9 rounded-md flex items-center justify-center shrink-0 ${toneClasses[tone]}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] text-text-muted">{label}</div>
          <div className="text-xl font-semibold text-text-primary mt-0.5 truncate">{value}</div>
          {hint && <div className="text-[10px] text-text-faint mt-0.5">{hint}</div>}
        </div>
      </CardBody>
    </Card>
  );
}

export function AdminPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  if (!currentUser?.systemRole || !ALLOWED_ROLES.includes(currentUser.systemRole)) {
    return <AccessDenied />;
  }
  return <ExecutiveDashboard />;
}

function ExecutiveDashboard() {
  const usage = useCopilotUsage(30);
  const m = usePortfolioMetrics(usage.rows);
  const k = m.kpis;

  return (
    <PageWrapper>
      <div className="flex items-start justify-between mb-5 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-7 w-7 rounded-md bg-brand-primary text-white flex items-center justify-center">
              <Crown size={14} />
            </div>
            <Badge tone="blue" size="md">Diretoria</Badge>
          </div>
          <h1 className="text-2xl font-semibold text-text-primary">Painel Executivo Consulcard</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Visão consolidada do portfólio, performance da equipe e uso do co-piloto operacional.
          </p>
        </div>
      </div>

      {/* KPIs — todos calculados com os dados do sistema. */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
        <KpiCard icon={<FolderKanban size={16} />} label="Projetos ativos" value={k.activeProjects} tone="brand" hint="não encerrados" />
        <KpiCard icon={<TrendingUp size={16} />} label="Progresso médio" value={`${k.avgProgress}%`} tone="brand" hint="projetos ativos" />
        <KpiCard
          icon={<AlertTriangle size={16} />}
          label="Atividades atrasadas"
          value={k.delayedActivities}
          tone={k.delayedActivities ? "red" : "green"}
          hint="prazo vencido"
        />
        <KpiCard icon={<AlertCircle size={16} />} label="Pendências abertas" value={k.openPendencies} tone="amber" hint="projetos ativos" />
        <KpiCard
          icon={<Clock size={16} />}
          label="Pendências vencidas"
          value={k.overduePendencies}
          tone={k.overduePendencies ? "red" : "green"}
          hint="prazo vencido"
        />
        <KpiCard
          icon={<Bot size={16} />}
          label="Adoção co-piloto"
          value={usage.loading ? "…" : `${k.copilotAdoption}%`}
          tone="purple"
          hint={`${k.projectsUsingCopilot} de ${k.activeProjects} projetos · 30 dias`}
        />
      </div>

      {/* Main grid: left content + right chat */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-4">
        <div className="space-y-4 min-w-0">
          <InsightsPanel metrics={m} usageLoaded={!usage.loading && !usage.error} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <PipelineByManager metrics={m} />
            <TopQuestions />
          </div>

          <PipelineByConsultant metrics={m} />

          <PromptUsageMatrix metrics={m} />

          {/* Antes: "análise qualitativa" com percentuais inventados. Agora, o uso real. */}
          <Card>
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">Uso do co-piloto</h3>
                  <p className="text-[11px] text-text-faint">últimos 30 dias · dados do sistema</p>
                </div>
                {usage.error && <Badge tone="red" size="sm">Falha ao carregar</Badge>}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <QualStat label="Perguntas" value={usage.loading ? "…" : k.copilotQuestions} hint="feitas ao co-piloto" />
                <QualStat label="Pessoas usando" value={usage.loading ? "…" : k.copilotUsers} hint="usuários distintos" />
                <QualStat label="Projetos usando" value={usage.loading ? "…" : k.projectsUsingCopilot} hint={`de ${k.activeProjects} ativos`} />
                <QualStat label="Fichas da Biblioteca" value={usage.loading ? "…" : k.promptsUsed} hint="perguntas com prompt padrão" tone="green" />
              </div>
              {usage.error && <p className="mt-3 text-xs text-accent-red">{usage.error}</p>}
            </div>
          </Card>
        </div>

        <div className="xl:sticky xl:top-4 xl:self-start">
          <DirectorChat />
        </div>
      </div>
    </PageWrapper>
  );
}

function QualStat({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "neutral" | "green";
}) {
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2.5">
      <div className="text-[10px] text-text-faint uppercase tracking-wider">{label}</div>
      <div className={`text-base font-semibold mt-0.5 ${tone === "green" ? "text-accent-green" : "text-text-primary"}`}>
        {value}
      </div>
      {hint && <div className="text-[10px] text-text-faint">{hint}</div>}
    </div>
  );
}
