import type { Activity } from "@/types";

export const ACTIVITIES_BY_TYPE: Record<string, Activity[]> = {
  "setup-contabil": [
    { id: "a1", label: "Assessment de Modelo Operacional Contábil", description: "Diagnóstico do modelo operacional atual: processos, sistemas, equipe e gaps regulatórios.", complexity: 2, llmImpact: "high", llmIndexMin: 35, llmIndexMax: 50, phase: "diagnostico" },
    { id: "a2", label: "Diagnóstico do Modelo Contábil Atual", description: "Análise da situação contábil vigente, identificação de desvios e riscos regulatórios.", complexity: 2, llmImpact: "medium", llmIndexMin: 20, llmIndexMax: 30, phase: "diagnostico" },
    { id: "a3", label: "Elaboração do Roteiro Contábil COSIF", description: "Definição do roteiro de lançamentos contábeis conforme normas COSIF do BACEN.", complexity: 4, llmImpact: "high", llmIndexMin: 40, llmIndexMax: 55, phase: "execucao" },
    { id: "a4", label: "Definição do Plano de Contas", description: "Estruturação do plano de contas adaptado ao produto financeiro e às exigências regulatórias.", complexity: 3, llmImpact: "high", llmIndexMin: 35, llmIndexMax: 50, phase: "execucao" },
    { id: "a5", label: "Homologação de Saldos Contábeis", description: "Validação e conciliação dos saldos contábeis com os sistemas transacionais.", complexity: 3, llmImpact: "medium", llmIndexMin: 20, llmIndexMax: 35, phase: "validacao" },
    { id: "a6", label: "Geração de CADOCs / Reportes BACEN", description: "Estruturação e validação dos documentos de reporte ao BACEN.", complexity: 4, llmImpact: "high", llmIndexMin: 35, llmIndexMax: 50, phase: "execucao" },
    { id: "a7", label: "Treinamento da Equipe Contábil", description: "Capacitação da equipe interna nos processos e normas implementados.", complexity: 1, llmImpact: "high", llmIndexMin: 50, llmIndexMax: 65, phase: "entrega" },
  ],
  "migracao-processadora": [
    { id: "m1", label: "Kick-off técnico e mapeamento de escopo", description: "Alinhamento técnico inicial com a processadora atual e a nova plataforma.", complexity: 2, llmImpact: "medium", llmIndexMin: 20, llmIndexMax: 35, phase: "planejamento" },
    { id: "m2", label: "Levantamento de produtos e BINs ativos", description: "Inventário completo de produtos, BINs, regras e portfólios em produção.", complexity: 3, llmImpact: "high", llmIndexMin: 40, llmIndexMax: 55, phase: "diagnostico" },
    { id: "m3", label: "Mapeamento de fluxos transacionais", description: "Diagrama de fluxos de autorização, captura, liquidação e contestação.", complexity: 4, llmImpact: "high", llmIndexMin: 45, llmIndexMax: 60, phase: "diagnostico" },
    { id: "m4", label: "Plano de migração e janela de cutover", description: "Cronograma detalhado e estratégia de cutover com mitigação de riscos.", complexity: 4, llmImpact: "medium", llmIndexMin: 25, llmIndexMax: 40, phase: "execucao" },
    { id: "m5", label: "Configuração de produtos na nova plataforma", description: "Setup de produtos, regras de negócio e parametrização na Dock.", complexity: 4, llmImpact: "medium", llmIndexMin: 20, llmIndexMax: 35, phase: "execucao" },
    { id: "m6", label: "Testes integrados e homologação", description: "Bateria de testes E2E, reconciliação contábil e validação operacional.", complexity: 3, llmImpact: "medium", llmIndexMin: 20, llmIndexMax: 35, phase: "validacao" },
    { id: "m7", label: "Go-live e estabilização", description: "Execução do cutover e monitoramento intensivo nas primeiras semanas.", complexity: 5, llmImpact: "low", llmIndexMin: 10, llmIndexMax: 20, phase: "entrega" },
    { id: "m8", label: "Decommission da plataforma legada", description: "Desligamento controlado da Orbital após estabilização.", complexity: 2, llmImpact: "low", llmIndexMin: 10, llmIndexMax: 20, phase: "entrega" },
    { id: "m9", label: "Documentação operacional final", description: "Manual operacional, runbooks e treinamento da equipe interna.", complexity: 2, llmImpact: "high", llmIndexMin: 45, llmIndexMax: 60, phase: "entrega" },
  ],
  "kyc-onboarding": [
    { id: "k1", label: "Mapeamento regulatório KYC/PLD", description: "Levantamento das normas BACEN, COAF e LGPD aplicáveis ao onboarding.", complexity: 3, llmImpact: "high", llmIndexMin: 40, llmIndexMax: 55, phase: "diagnostico" },
    { id: "k2", label: "Desenho da jornada de onboarding", description: "Mapeamento de etapas, regras de aprovação e árvore de decisão.", complexity: 3, llmImpact: "high", llmIndexMin: 35, llmIndexMax: 50, phase: "execucao" },
    { id: "k3", label: "Política de PLD/AML", description: "Elaboração da política interna de prevenção à lavagem de dinheiro.", complexity: 3, llmImpact: "high", llmIndexMin: 40, llmIndexMax: 55, phase: "execucao" },
    { id: "k4", label: "Treinamento da equipe de back-office", description: "Capacitação operacional dos analistas de onboarding e compliance.", complexity: 2, llmImpact: "high", llmIndexMin: 45, llmIndexMax: 60, phase: "entrega" },
  ],
};

export const DEFAULT_ACTIVITIES: Activity[] = [
  { id: "g1", label: "Kick-off do projeto", description: "Reunião inicial com cliente e equipe.", complexity: 1, llmImpact: "medium", llmIndexMin: 20, llmIndexMax: 35, phase: "planejamento" },
  { id: "g2", label: "Plano de trabalho", description: "Elaboração do cronograma e responsáveis.", complexity: 2, llmImpact: "high", llmIndexMin: 35, llmIndexMax: 50, phase: "planejamento" },
  { id: "g3", label: "Status report final", description: "Relatório consolidado de encerramento.", complexity: 1, llmImpact: "high", llmIndexMin: 50, llmIndexMax: 65, phase: "entrega" },
];

export function getActivitiesForType(typeId: string): Activity[] {
  return ACTIVITIES_BY_TYPE[typeId] ?? DEFAULT_ACTIVITIES;
}
