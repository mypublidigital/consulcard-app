import type { PromptDef } from "@/types";

export const PROMPTS: PromptDef[] = [
  {
    id: "p1",
    title: "Mapear plano contábil COSIF",
    macroCategory: "contabil-regulatorio",
    projectTypeId: "setup-contabil",
    activityLabel: "Definição do Plano de Contas",
    kind: "specialist",
    phase: "execucao",
    body: `Você é um especialista em contabilidade regulatória do mercado financeiro brasileiro.

**Objetivo:** Mapear o plano de contas COSIF aplicável ao produto financeiro descrito abaixo.

**Insumos necessários:**
- Tipo de instituição (IP, SCD, SCFI, banco, cooperativa)
- Produto principal (cartão, conta, crédito, câmbio)
- Volumetria esperada
- Estrutura societária

**Saída esperada:**
1. Lista hierárquica das contas COSIF aplicáveis (grupo/subgrupo/conta/subconta)
2. Indicação das contas obrigatórias para o porte da instituição
3. Roteiro contábil para os principais eventos transacionais
4. Pontos de atenção regulatória (BACEN, RFB)

Cite a circular/resolução BACEN aplicável sempre que possível.`,
  },
  {
    id: "p2",
    title: "Criar roteiro de entrevista de mapeamento regulatório",
    macroCategory: "contabil-regulatorio",
    projectTypeId: "mapeamento-bacen",
    activityLabel: "Assessment de Gaps",
    kind: "generalist",
    phase: "diagnostico",
    body: `Crie um roteiro de entrevista para mapeamento regulatório com a equipe operacional do cliente. O roteiro deve cobrir: governança, compliance, risco operacional, controles internos, reporte BACEN e gaps conhecidos. Estruture em blocos de 5-7 perguntas por área, com perguntas abertas e fechadas alternadas.`,
  },
  {
    id: "p3",
    title: "Elaborar ata de reunião a partir de transcrição",
    macroCategory: "all",
    projectTypeId: "all",
    activityLabel: "Reuniões",
    kind: "generalist",
    phase: "execucao",
    body: `A partir da transcrição abaixo, gere uma ata de reunião contendo:
- Cabeçalho (data, participantes, projeto)
- Resumo executivo (3 linhas)
- Tópicos discutidos
- Decisões tomadas
- Pendências (com responsável e prazo)
- Próximos passos

Use tom executivo e objetivo. Não invente informações que não estejam na transcrição.`,
  },
  {
    id: "p4",
    title: "Identificar gaps regulatórios: norma × operação atual",
    macroCategory: "contabil-regulatorio",
    projectTypeId: "mapeamento-bacen",
    activityLabel: "Assessment de Gaps",
    kind: "specialist",
    phase: "diagnostico",
    body: `Compare a norma BACEN fornecida com a operação atual descrita pelo cliente. Identifique cada gap regulatório, classificando-o por:
- Severidade (alta/média/baixa)
- Esforço de adequação (alto/médio/baixo)
- Risco se não corrigido

Produza tabela markdown e priorize por risco x esforço.`,
  },
  {
    id: "p5",
    title: "Gerar plano de adequação regulatória",
    macroCategory: "contabil-regulatorio",
    projectTypeId: "mapeamento-bacen",
    activityLabel: "Plano de Adequação",
    kind: "generalist",
    phase: "execucao",
    body: `Com base nos gaps identificados, elabore um plano de adequação com:
- Ações concretas
- Responsável sugerido
- Prazo estimado
- Critério de aceite
- Marcos de validação

Agrupe por sprint (4 semanas) e priorize alto risco / baixo esforço primeiro.`,
  },
  {
    id: "p6",
    title: "Estruturar regras de negócio de produto cartão",
    macroCategory: "meios-pagamento",
    projectTypeId: "emissor-cartao",
    activityLabel: "Regras de Negócio",
    kind: "specialist",
    phase: "execucao",
    body: `Estruture o conjunto de regras de negócio de um produto cartão (crédito ou pré-pago), cobrindo: emissão, ativação, autorização, captura, limite, fatura, cobrança, contestação, encerramento. Para cada regra, indique gatilho, condição, ação esperada e exceções.`,
  },
  {
    id: "p7",
    title: "Criar status report semanal",
    macroCategory: "all",
    projectTypeId: "all",
    activityLabel: "Gestão",
    kind: "generalist",
    phase: "execucao",
    body: `Gere um status report semanal com as seções: Resumo Executivo, Marcos da Semana, Atividades em Andamento, Riscos e Pendências, Próximos Passos. Tom executivo, máximo 1 página.`,
  },
  {
    id: "p8",
    title: "Mapear processo de chargeback e contestação",
    macroCategory: "meios-pagamento",
    projectTypeId: "operacao-cartao",
    activityLabel: "Back Office",
    kind: "specialist",
    phase: "execucao",
    body: `Mapeie o processo de chargeback e contestação do produto cartão, considerando: regras de bandeira (Visa/Master/Elo), prazos regulatórios, fluxos operacionais, sistemas envolvidos, indicadores de qualidade e KPIs.`,
  },
];
