// Mock data for the Admin (Director) area

export interface CopilotQuestion {
  id: string;
  question: string;
  count: number;
  trend: "up" | "down" | "flat";
  trendPct: number;
  category: "regulatorio" | "tecnico" | "gestao" | "produto" | "contabil";
  topProjects: string[]; // project IDs
}

export interface PromptUsageRow {
  promptId: string;
  promptTitle: string;
  kind: "specialist" | "generalist";
  usage: Record<string, number>; // projectId -> uses
  total: number;
}

export interface ConsultantMetrics {
  userId: string;
  projectsActive: number;
  activitiesAssigned: number;
  activitiesDone: number;
  avgCycleTimeDays: number;
  copilotMessages: number;
  copilotArtifacts: number;
  qualityScore: number; // 0-100
  utilizationPct: number; // 0-100
}

export interface ManagerMetrics {
  userId: string;
  projectsManaged: number;
  portfolioRevenueR: number; // BRL
  avgProgress: number;
  delayedProjects: number;
  copilotAdoption: number; // % consultants using copilot
  npsClient: number;
}

export interface Insight {
  id: string;
  severity: "info" | "warning" | "critical" | "positive";
  category: "time" | "quality" | "copilot" | "risk";
  title: string;
  description: string;
  affectedProjects?: string[];
  recommendation: string;
}

export const TOP_QUESTIONS: CopilotQuestion[] = [
  {
    id: "q1",
    question: "Como estruturar o plano de contas COSIF para uma SCD?",
    count: 47,
    trend: "up",
    trendPct: 22,
    category: "contabil",
    topProjects: ["proj-002"],
  },
  {
    id: "q2",
    question: "Quais são os reportes BACEN obrigatórios para IP?",
    count: 38,
    trend: "up",
    trendPct: 15,
    category: "regulatorio",
    topProjects: ["proj-002", "proj-003"],
  },
  {
    id: "q3",
    question: "Como mapear regras de chargeback Visa/Master?",
    count: 31,
    trend: "flat",
    trendPct: 2,
    category: "produto",
    topProjects: ["proj-001"],
  },
  {
    id: "q4",
    question: "Janela de cutover para migração de processadora — boas práticas",
    count: 28,
    trend: "up",
    trendPct: 40,
    category: "tecnico",
    topProjects: ["proj-001"],
  },
  {
    id: "q5",
    question: "Gerar ata de reunião a partir da transcrição abaixo",
    count: 26,
    trend: "up",
    trendPct: 18,
    category: "gestao",
    topProjects: ["proj-001", "proj-002", "proj-003"],
  },
  {
    id: "q6",
    question: "Como validar conciliação contábil x sistemas transacionais?",
    count: 22,
    trend: "down",
    trendPct: -8,
    category: "contabil",
    topProjects: ["proj-002"],
  },
  {
    id: "q7",
    question: "Resumir decisões tomadas na reunião de hoje",
    count: 19,
    trend: "up",
    trendPct: 31,
    category: "gestao",
    topProjects: ["proj-001", "proj-003"],
  },
  {
    id: "q8",
    question: "Quais documentos KYC são exigidos pelo COAF?",
    count: 17,
    trend: "flat",
    trendPct: 4,
    category: "regulatorio",
    topProjects: ["proj-003"],
  },
  {
    id: "q9",
    question: "Identificar gaps regulatórios desta operação",
    count: 15,
    trend: "up",
    trendPct: 12,
    category: "regulatorio",
    topProjects: ["proj-002", "proj-003"],
  },
  {
    id: "q10",
    question: "Gerar status report semanal para o cliente",
    count: 14,
    trend: "up",
    trendPct: 9,
    category: "gestao",
    topProjects: ["proj-001", "proj-002"],
  },
];

export const PROMPT_USAGE: PromptUsageRow[] = [
  { promptId: "p1", promptTitle: "Mapear plano contábil COSIF", kind: "specialist", usage: { "proj-002": 18, "proj-001": 2 }, total: 20 },
  { promptId: "p3", promptTitle: "Elaborar ata de reunião", kind: "generalist", usage: { "proj-001": 12, "proj-002": 9, "proj-003": 7 }, total: 28 },
  { promptId: "p7", promptTitle: "Criar status report semanal", kind: "generalist", usage: { "proj-001": 8, "proj-002": 6, "proj-003": 3 }, total: 17 },
  { promptId: "p4", promptTitle: "Identificar gaps regulatórios", kind: "specialist", usage: { "proj-002": 7, "proj-003": 5 }, total: 12 },
  { promptId: "p6", promptTitle: "Estruturar regras de negócio cartão", kind: "specialist", usage: { "proj-001": 9, "proj-002": 1 }, total: 10 },
  { promptId: "p8", promptTitle: "Mapear chargeback e contestação", kind: "specialist", usage: { "proj-001": 9 }, total: 9 },
  { promptId: "p5", promptTitle: "Plano de adequação regulatória", kind: "generalist", usage: { "proj-002": 4, "proj-003": 3 }, total: 7 },
  { promptId: "p2", promptTitle: "Roteiro de entrevista regulatória", kind: "generalist", usage: { "proj-003": 4, "proj-002": 2 }, total: 6 },
];

export const CONSULTANT_METRICS: ConsultantMetrics[] = [
  { userId: "u2", projectsActive: 1, activitiesAssigned: 5, activitiesDone: 2, avgCycleTimeDays: 6.4, copilotMessages: 84, copilotArtifacts: 11, qualityScore: 88, utilizationPct: 82 },
  { userId: "u3", projectsActive: 2, activitiesAssigned: 6, activitiesDone: 3, avgCycleTimeDays: 5.1, copilotMessages: 102, copilotArtifacts: 14, qualityScore: 91, utilizationPct: 95 },
  { userId: "u4", projectsActive: 1, activitiesAssigned: 4, activitiesDone: 1, avgCycleTimeDays: 8.7, copilotMessages: 52, copilotArtifacts: 6, qualityScore: 76, utilizationPct: 64 },
  { userId: "u5", projectsActive: 0, activitiesAssigned: 0, activitiesDone: 0, avgCycleTimeDays: 0, copilotMessages: 3, copilotArtifacts: 0, qualityScore: 0, utilizationPct: 18 },
];

export const MANAGER_METRICS: ManagerMetrics[] = [
  { userId: "u1", projectsManaged: 2, portfolioRevenueR: 1_840_000, avgProgress: 25, delayedProjects: 1, copilotAdoption: 86, npsClient: 72 },
  { userId: "u3", projectsManaged: 1, portfolioRevenueR: 320_000, avgProgress: 0, delayedProjects: 0, copilotAdoption: 40, npsClient: 0 },
];

export const INSIGHTS: Insight[] = [
  {
    id: "i1",
    severity: "critical",
    category: "time",
    title: "Migração Orbital → Dock com risco de slip de 2 semanas",
    description: "A atividade 'Plano de migração e janela de cutover' está em revisão há 8 dias, contra média de 3 dias do tipo. Dependência aberta com Dock ainda não validada.",
    affectedProjects: ["proj-001"],
    recommendation: "Acelerar validação contratual com a Dock esta semana e reservar buffer de 10 dias úteis no cronograma.",
  },
  {
    id: "i2",
    severity: "warning",
    category: "quality",
    title: "Débora Costa com cycle time 70% acima da média",
    description: "Tempo médio de conclusão de atividades de Débora está em 8,7 dias, contra média de 5,1 dias dos pares no mesmo tipo de projeto.",
    affectedProjects: ["proj-002"],
    recommendation: "Realocar pendência de mapeamento de sistemas transacionais para revisão em par com consultor sênior.",
  },
  {
    id: "i3",
    severity: "positive",
    category: "copilot",
    title: "Adoção do co-piloto em alta no portfólio Wagner",
    description: "Equipe sob gestão de Wagner Lima usa o co-piloto em 86% das atividades aplicáveis, com 31 artefatos gerados no último mês.",
    recommendation: "Replicar boas práticas com a equipe de João Sales (40% de adoção atual).",
  },
  {
    id: "i4",
    severity: "warning",
    category: "copilot",
    title: "Prompts especialistas pouco usados no projeto KYC",
    description: "Apenas 2 prompts especialistas em 60% das atividades do projeto KYC/Onboarding — pode indicar baixa especialização do consultor designado.",
    affectedProjects: ["proj-003"],
    recommendation: "Agendar pairing com Rogério Andrade (especialista regulatório) nas próximas 2 atividades.",
  },
  {
    id: "i5",
    severity: "info",
    category: "risk",
    title: "Concentração de pendências do cliente",
    description: "3 das 5 pendências em aberto dependem de ação do cliente, com prazo médio de vencimento em 6 dias.",
    affectedProjects: ["proj-001", "proj-002", "proj-003"],
    recommendation: "Disparar nota consolidada de pendências aos sponsors dos 3 projetos.",
  },
];

// Director chat suggested questions and mock replies
export const DIRECTOR_SUGGESTIONS = [
  "Quais projetos têm maior risco de atraso?",
  "Qual a adoção do co-piloto por gerente?",
  "Onde estão os principais gargalos do portfólio?",
  "Resuma o status dos 3 projetos ativos",
  "Qual consultor precisa de apoio agora?",
];

export const DIRECTOR_REPLIES: Record<string, string> = {
  "Quais projetos têm maior risco de atraso?":
    `Hoje há **1 projeto em risco crítico** e **1 em alerta**:\n\n| Projeto | Risco | Causa principal |\n|---|---|---|\n| **Migração Orbital → Dock** | 🔴 Crítico | Validação contratual com a Dock pendente há 8 dias; pode gerar slip de 2 semanas no cutover |\n| **Setup Contábil Cooperativa** | 🟡 Alerta | Cycle time da consultora alocada 70% acima da média do tipo |\n\n**Ação sugerida:** escalar pendência da Dock para o jurídico no comitê desta semana.`,

  "Qual a adoção do co-piloto por gerente?":
    `**Adoção do co-piloto — últimos 30 dias:**\n\n- **Wagner Lima** — 86% das atividades aplicáveis (31 artefatos gerados)\n- **João Sales** — 40% das atividades aplicáveis (6 artefatos gerados)\n\nA distância de 46 pontos entre as duas carteiras é o maior gap atual do portfólio. **Recomendação:** sessão de transferência de práticas entre as equipes nas próximas 2 semanas.`,

  "Onde estão os principais gargalos do portfólio?":
    `Três gargalos identificados pelo co-piloto na análise de tempos e movimentos:\n\n1. **Aprovações regulatórias do cliente** — concentra 60% do tempo de espera ativo no portfólio\n2. **Conciliação contábil** (proj-002) — atividade com maior dispersão de cycle time\n3. **Validação contratual Dock** (proj-001) — bloqueador crítico há 8 dias\n\nNo agregado, **42% do tempo total dos projetos está em estados de espera externa**, não em execução interna — sinal de oportunidade para automatizar follow-up com clientes.`,

  "Resuma o status dos 3 projetos ativos":
    `**Portfólio em 3 linhas:**\n\n- 🟢 **Setup Contábil Cooperativa** (15% concluído) — em ritmo, sem pendências críticas\n- 🟡 **KYC/Onboarding Digital** (0%) — em planejamento; risco de partida sem consultor sênior alocado\n- 🔴 **Migração Orbital → Dock** (35% concluído) — risco de slip de 2 semanas por pendência com a Dock\n\n**Receita comprometida no portfólio ativo:** R$ 2,16 mi · **NPS médio dos clientes:** 72.`,

  "Qual consultor precisa de apoio agora?":
    `**Débora Costa** é o caso prioritário:\n\n- Cycle time **70% acima da média** do tipo de projeto\n- Apenas **6 mensagens** no co-piloto nos últimos 30 dias (média da equipe: 79)\n- 1 atividade concluída em 4 atribuídas, score de qualidade 76\n\n**Recomendação:** pareamento com Rogério Andrade na próxima sprint e onboarding focado nos prompts especialistas de COSIF.`,

  default:
    `Posso cruzar dados de **atividades, cycle time, pendências, uso do co-piloto e prompts** por projeto, gerente e consultor. Tente uma das sugestões abaixo ou pergunte algo mais específico — por exemplo, "qual o tempo médio entre fases no portfólio?".`,
};

export const COPILOT_USAGE_TRENDS = {
  totalMessages: 241,
  totalArtifacts: 31,
  avgMessagesPerActivity: 12.4,
  topUsedKind: "Especialista",
  monthlyDelta: 18, // %
};

export const PORTFOLIO_KPIS = {
  activeProjects: 2,
  pipelineValueR: 2_160_000,
  avgPortfolioProgress: 17,
  delayedActivities: 1,
  openPendencies: 5,
  copilotAdoption: 71,
};
