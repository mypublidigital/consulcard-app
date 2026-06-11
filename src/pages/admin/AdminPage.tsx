import {
  FolderKanban,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  AlertCircle,
  Bot,
  Crown,
} from "lucide-react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PORTFOLIO_KPIS, COPILOT_USAGE_TRENDS } from "@/mocks/admin";
import { PipelineByManager, PipelineByConsultant } from "@/features/admin/PipelinePanels";
import { TopQuestions, PromptUsageMatrix } from "@/features/admin/UsagePanels";
import { InsightsPanel } from "@/features/admin/InsightsPanel";
import { DirectorChat } from "@/features/admin/DirectorChat";

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
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

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
        <KpiCard icon={<FolderKanban size={16} />} label="Projetos ativos" value={PORTFOLIO_KPIS.activeProjects} tone="brand" hint="em execução" />
        <KpiCard
          icon={<DollarSign size={16} />}
          label="Pipeline ativo"
          value={formatBRL(PORTFOLIO_KPIS.pipelineValueR)}
          tone="green"
          hint="receita comprometida"
        />
        <KpiCard
          icon={<TrendingUp size={16} />}
          label="Progresso médio"
          value={`${PORTFOLIO_KPIS.avgPortfolioProgress}%`}
          tone="brand"
          hint="portfólio"
        />
        <KpiCard
          icon={<AlertTriangle size={16} />}
          label="Atrasos"
          value={PORTFOLIO_KPIS.delayedActivities}
          tone="red"
          hint="atividades"
        />
        <KpiCard
          icon={<AlertCircle size={16} />}
          label="Pendências abertas"
          value={PORTFOLIO_KPIS.openPendencies}
          tone="amber"
          hint="todas as carteiras"
        />
        <KpiCard
          icon={<Bot size={16} />}
          label="Adoção co-piloto"
          value={`${PORTFOLIO_KPIS.copilotAdoption}%`}
          tone="purple"
          hint={`+${COPILOT_USAGE_TRENDS.monthlyDelta}% no mês`}
        />
      </div>

      {/* Main grid: left content + right chat */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-4">
        <div className="space-y-4 min-w-0">
          <InsightsPanel />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <PipelineByManager />
            <TopQuestions />
          </div>

          <PipelineByConsultant />

          <PromptUsageMatrix />

          {/* Qualitative copilot analysis */}
          <Card>
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">Análise qualitativa do co-piloto</h3>
                  <p className="text-[11px] text-text-faint">comportamento de uso · últimos 30 dias</p>
                </div>
                <Badge tone="purple" size="sm">
                  <Bot size={10} /> {COPILOT_USAGE_TRENDS.totalMessages} interações
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                <QualStat label="Mensagens / atividade" value={COPILOT_USAGE_TRENDS.avgMessagesPerActivity} hint="média" />
                <QualStat label="Artefatos gerados" value={COPILOT_USAGE_TRENDS.totalArtifacts} hint="atas, relatórios, planos" />
                <QualStat label="Tipo mais usado" value={COPILOT_USAGE_TRENDS.topUsedKind} hint="prompts" />
                <QualStat label="Crescimento mensal" value={`+${COPILOT_USAGE_TRENDS.monthlyDelta}%`} hint="vs mês anterior" tone="green" />
              </div>

              <div className="space-y-3 text-sm text-text-primary leading-relaxed">
                <Finding
                  tone="green"
                  title="Padrão de uso maduro em atividades regulatórias"
                  text="76% das interações em projetos regulatórios envolvem prompts especialistas, indicando consultores se apoiando no co-piloto para tarefas de alto valor."
                />
                <Finding
                  tone="amber"
                  title="Uso concentrado em horário comercial"
                  text="92% das interações entre 9h-18h. Oportunidade de educar a equipe sobre uso assíncrono para preparo de reuniões e revisão noturna."
                />
                <Finding
                  tone="blue"
                  title="Geração de ata é o caso de uso mais difundido"
                  text="A geração de ata a partir de transcrição representa 28% dos artefatos. Considerar automação no calendário para sugestão proativa após reuniões."
                />
                <Finding
                  tone="red"
                  title="Sub-utilização no projeto KYC/Onboarding Digital"
                  text="Apenas 18 mensagens nos últimos 30 dias contra média de 79 por projeto. Risco de execução abaixo do padrão Consulcard sem intervenção."
                />
              </div>
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

function Finding({
  tone,
  title,
  text,
}: {
  tone: "green" | "amber" | "blue" | "red";
  title: string;
  text: string;
}) {
  const dots = {
    green: "bg-accent-green",
    amber: "bg-accent-amber",
    blue: "bg-brand-primary",
    red: "bg-accent-red",
  };
  return (
    <div className="flex items-start gap-2.5">
      <span className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${dots[tone]}`} />
      <div>
        <div className="text-sm font-medium text-text-primary">{title}</div>
        <p className="text-xs text-text-muted mt-0.5">{text}</p>
      </div>
    </div>
  );
}
