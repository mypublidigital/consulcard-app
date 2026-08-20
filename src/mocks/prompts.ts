import type { PromptDef } from "@/types";

/**
 * Biblioteca de Prompts — Consulcard
 *
 * GERADO a partir de:
 *   2026-08-07_Planilha_ModeloProjetosConsulcard_BibliotecaPrompts_V03.xlsx
 *   aba "05 · Biblioteca de Prompts" (V03 — 07/08/2026)
 *
 * Não editar à mão: as alterações devem nascer na planilha, que é a fonte única.
 *
 * Notas de conversão:
 * - Índice IA NÃO foi importado. A aba 00 registra 0 de 72 atividades com IA-P/IA-E
 *   preenchidos e faixas do semáforo "A DEFINIR"; os percentuais da v1.3 estão
 *   marcados na planilha como "referência histórica — NÃO usar em cálculo".
 * - As 13 fases da planilha foram mapeadas nas 5 fases do app (ver phaseLabel para
 *   o rótulo original).
 * - PD.0 não é prompt: virou DATA_PROTOCOL, anexado ao copiar qualquer prompt.
 */

/**
 * PROTOCOLO DE DADOS (PD.0) — bloco obrigatório da planilha, anexado ao final de
 * todo prompt no momento da cópia. Impede o modelo de inventar número, data ou
 * volumetria que não tenha sido fornecida.
 */
export const DATA_PROTOCOL = `PROTOCOLO DE DADOS — bloco obrigatório, idêntico em todos os prompts da biblioteca

Nunca invente, estime ou presuma dado específico — número, data, volume, nome, cláusula, prazo ou decisão — que não esteja no material fornecido ou em resposta explícita do solicitante. Isso vale mesmo quando um valor plausível deixaria o entregável mais completo.

Use as marcações abaixo sempre que necessário:
[LACUNA] — dado necessário e ausente. Indique quem deve fornecer e o que fica bloqueado sem ele.
[PREMISSA A CONFIRMAR] — valor assumido para permitir o raciocínio. Indique o impacto caso esteja errado.
[SUGESTÃO CONSULCARD] — recomendação própria, não solicitada pelo cliente nem extraída de fonte.
[BOA PRÁTICA DE MERCADO] — padrão setorial, sem nomear cliente ou fornecedor específico.

Se a base recebida for insuficiente para o pedido como um todo, responda [BLOQUEADO — AGUARDANDO: lista de documentos] em vez de completar com suposições.

MODO EXPLORATÓRIO — REGRA ABSOLUTA: em nenhuma hipótese, e sob nenhum modo, você inventa dado. Esta proibição não tem exceção. O modo exploratório NÃO autoriza você a gerar números — autoriza apenas raciocinar e calcular sobre valores hipotéticos que o PRÓPRIO SOLICITANTE ESCREVEU na pergunta. Se o solicitante não escreveu o valor, você não o cria: pergunte qual valor ele quer usar, ou marque [LACUNA]. Nunca preencha uma hipótese deixada em branco e nunca acione este modo por iniciativa própria.

Quando o solicitante escrever MODO EXPLORATÓRIO e fornecer as hipóteses: abra a resposta declarando que o conteúdo é exploratório, não é entregável e não deve ser encaminhado ao cliente; marque individualmente cada número como [HIPÓTESE DO SOLICITANTE — NÃO USAR EM DOCUMENTO DE CLIENTE]; e encerre listando quais desses valores precisam ser substituídos por dado real e quem deve fornecê-lo.

Encerre toda resposta com duas seções curtas: (a) decisões que exigem validação humana antes de virar compromisso; (b) lembrete de revisão dupla, por se tratar de conteúdo gerado com apoio de IA.`;

/** Junta o prompt ao PD.0, conforme a regra da biblioteca. */
export function withDataProtocol(body: string): string {
  return `${body}\n\n---\n\n${DATA_PROTOCOL}`;
}

export const PROMPT_TIERS = [
  { id: "T1", label: "T1 · Rápido", hint: "tarefas estruturadas e repetitivas" },
  { id: "T2", label: "T2 · Intermediário", hint: "construção de documentos e análise" },
  { id: "T3", label: "T3 · Avançado", hint: "julgamento, viabilidade e risco" },
] as const;

export const PROMPTS: PromptDef[] = [
  {
    id: "1.1",
    bloco: "Bloco 1 — Levantamento Universal",
    title: "Roteiro de Levantamento Contábil COSIF",
    macroCategory: "contabil-regulatorio",
    projectTypeId: "setup-contabil",
    activityLabel: "Elaboração do Roteiro Contábil COSIF",
    phase: "diagnostico",
    phaseLabel: "Levantamento",
    tier: "T2",
    modelo: "Claude Sonnet 5",
    alternativo: "Gemini 3.6 Flash",
    insumos: "Tipo de IF, produtos ofertados",
    entregavel: "Roteiro de entrevista e checklist COSIF",
    status: "ready",
    body: `Atue como Especialista Contábil em Meios de Pagamento. Gere um roteiro de levantamento para estruturação contábil COSIF para uma IF do tipo [TIPO IF] que oferta [PRODUTOS]. Inclua perguntas sobre: plano de contas atual, sistemas contábeis, integração com processadora e obrigações acessórias.`,
  },
  {
    id: "1.2",
    bloco: "Bloco 1 — Levantamento Universal",
    title: "Checklist de Insumos — Plano de Contas",
    macroCategory: "contabil-regulatorio",
    projectTypeId: "setup-contabil",
    activityLabel: "Definição do Plano de Contas",
    phase: "diagnostico",
    phaseLabel: "Levantamento",
    tier: "T1",
    modelo: "Gemini 3.5 Flash-Lite",
    alternativo: "Claude Haiku 4.5",
    insumos: "Tipo de IF, produtos ofertados",
    entregavel: "Checklist de documentos e informações necessárias",
    status: "ready",
    body: `Atue como Contador Especialista. Para estruturar o Plano de Contas de uma IF do tipo [TIPO IF], gere um checklist completo de insumos necessários: documentos, sistemas, políticas e informações que o cliente deve fornecer antes do início do trabalho.`,
  },
  {
    id: "2.1",
    bloco: "Bloco 2 — Construção de Documentos Estruturantes",
    title: "Especificação de Regras de Negócio",
    macroCategory: "meios-pagamento",
    projectTypeId: "emissor-cartao",
    activityLabel: "Regras de Negócio do Produto",
    phase: "execucao",
    phaseLabel: "Construção",
    tier: "T2",
    modelo: "Claude Sonnet 5",
    alternativo: "Gemini 3.6 Flash",
    insumos: "Briefing do produto, público-alvo, bandeira",
    entregavel: "Documento de regras de negócio do produto",
    status: "ready",
    body: `Atue como Product Manager de Meios de Pagamento. Com base no briefing: [BRIEFING], especifique as regras de negócio do produto de cartão. Cubra: elegibilidade, limites, ciclo de faturamento, tarifas, benefícios, regras de bloqueio e cancelamento.`,
  },
  {
    id: "2.2",
    bloco: "Bloco 2 — Construção de Documentos Estruturantes",
    title: "Manual Operacional de Emissor",
    macroCategory: "meios-pagamento",
    projectTypeId: "emissor-cartao",
    activityLabel: "Elaboração de Manuais e Procedimentos",
    phase: "execucao",
    phaseLabel: "Construção",
    tier: "T2",
    modelo: "Claude Sonnet 5",
    alternativo: "Gemini 3.6 Flash",
    insumos: "Regras de negócio, fluxos operacionais",
    entregavel: "Manual operacional estruturado",
    status: "ready",
    body: `Atue como Especialista Operacional. Com base nas regras de negócio: [REGRAS] e fluxos: [FLUXOS], elabore o Manual Operacional de Emissor. Cubra: processos de emissão, autorização, faturamento, cobrança, atendimento e gestão de fraude.`,
  },
  {
    id: "3.1",
    bloco: "Bloco 2 — Construção de Documentos Estruturantes",
    title: "Política KYC/AML",
    macroCategory: "banking-conta-digital",
    projectTypeId: "conta-digital",
    activityLabel: "Definição de Política KYC/AML",
    phase: "execucao",
    phaseLabel: "Construção",
    tier: "T2",
    modelo: "Claude Sonnet 5",
    alternativo: "Gemini 3.6 Flash",
    insumos: "Tipo de IF, perfil de clientes, produtos",
    entregavel: "Documento de política KYC/AML",
    status: "ready",
    body: `Atue como Especialista em Compliance. Para uma IF do tipo [TIPO IF] com perfil de clientes [PERFIL], elabore a Política de KYC/AML. Inclua: critérios de onboarding, documentação exigida, monitoramento de transações, alertas de suspeita e reporte ao COAF.`,
  },
  {
    id: "4.1",
    bloco: "Bloco 3 — Análise e Comparativos",
    title: "Relatório de Diagnóstico Executivo",
    macroCategory: "consultoria-estrategica",
    projectTypeId: "diagnostico",
    activityLabel: "Elaboração do Relatório de Diagnóstico",
    phase: "diagnostico",
    phaseLabel: "Análise",
    tier: "T3",
    modelo: "Claude Opus 5",
    alternativo: "Gemini 3.1 Pro",
    insumos: "Dados levantados na fase de assessment",
    entregavel: "Relatório executivo de diagnóstico",
    status: "ready",
    body: `Atue como Consultor Sênior. Com base nos dados levantados: [DADOS], elabore um Relatório de Diagnóstico Executivo. Estrutura: Sumário Executivo, Situação Atual (AS-IS), Principais Gaps, Benchmarks de Mercado e Recomendações Prioritárias.`,
  },
  {
    id: "P0.1",
    bloco: "Bloco 0 — Pré-Execução",
    title: "Viabilidade do Modelo de Negócio",
    macroCategory: "all",
    projectTypeId: "all",
    activityLabel: "Assessment / Diagnóstico",
    phase: "planejamento",
    phaseLabel: "Pré-Kickoff",
    tier: "T3",
    modelo: "Claude Opus 5",
    alternativo: "Gemini 3.1 Pro",
    insumos: "Business plan ou premissas iniciais do cliente",
    entregavel: "Parecer de viabilidade com semáforo e premissas a validar",
    status: "ready",
    body: `Atue como Sênior Partner de Consultoria em Meios de Pagamento. Analise as premissas de negócio do cliente: [PREMISSAS]. Avalie a viabilidade cruzando receitas esperadas, custos operacionais típicos, exigências regulatórias e porte do cliente. Gere um parecer com: 1) Semáforo de viabilidade (Viável / Viável com ressalvas / Inviável); 2) Principais riscos do modelo; 3) Lista de premissas que precisam ser validadas antes do início do projeto.`,
  },
  {
    id: "P0.2",
    bloco: "Bloco 0 — Pré-Execução",
    title: "Coerência de Escopo x Prazo x Equipe",
    macroCategory: "all",
    projectTypeId: "all",
    activityLabel: "Todas",
    phase: "planejamento",
    phaseLabel: "Pré-Kickoff",
    tier: "T3",
    modelo: "Claude Opus 5",
    alternativo: "Gemini 3.1 Pro",
    insumos: "Ata de pré-venda, prazo declarado, headcount disponível",
    entregavel: "Tabela de riscos de escopo com flag de viabilidade",
    status: "ready",
    body: `Atue como PMO Sênior. Analise o escopo levantado: [ESCOPO], o prazo exigido: [PRAZO] e a equipe disponível: [EQUIPE]. Cruze essas informações com a complexidade típica de projetos de meios de pagamento. Gere uma tabela de riscos destacando incompatibilidades e sinalize com um FLAG vermelho se o prazo for inviável dado o porte do projeto. Sugira ajustes de escopo ou prazo.`,
  },
  {
    id: "P0.3",
    bloco: "Bloco 0 — Pré-Execução",
    title: "Mapeamento de Pré-requisitos Ocultos",
    macroCategory: "all",
    macroCategories: ["meios-pagamento","banking-conta-digital"],
    projectTypeId: "all",
    activityLabel: "Todas",
    phase: "planejamento",
    phaseLabel: "Pré-Kickoff",
    tier: "T2",
    modelo: "Claude Sonnet 5",
    alternativo: "Gemini 3.6 Flash",
    insumos: "Tipo N1 e atividades N2 do escopo",
    entregavel: "Checklist de pré-requisitos obrigatórios",
    status: "ready",
    body: `Atue como Especialista Regulatório e Operacional. Para o escopo contratado: [ESCOPO], identifique todos os pré-requisitos que o cliente precisa ter resolvido ANTES do início do projeto (ex: licenças BACEN, contratos com bandeiras, decisões de diretoria). Gere um checklist com: Item, Responsável (Cliente/Consulcard) e Consequência do não-cumprimento.`,
  },
  {
    id: "P0.4",
    bloco: "Bloco 0 — Pré-Execução",
    title: "Qualificação de Maturidade do Cliente",
    macroCategory: "all",
    projectTypeId: "all",
    activityLabel: "Todas",
    phase: "planejamento",
    phaseLabel: "Pré-Kickoff",
    tier: "T3",
    modelo: "Claude Opus 5",
    alternativo: "Gemini 3.1 Pro",
    insumos: "Notas da entrevista de pré-venda, organograma",
    entregavel: "Score de maturidade e recomendação de engajamento",
    status: "ready",
    body: `Atue como Diretor de Consultoria. Analise as notas de pré-venda: [NOTAS] e o contexto do cliente: [CONTEXTO]. Avalie a maturidade do cliente para absorver a entrega nas dimensões: Operacional, Regulatória, Tecnológica e Governança. Gere um score para cada dimensão e recomende o modelo de engajamento ideal (Projeto fechado, Projeto + Retainer, ou BPO), justificando a escolha.`,
  },
  {
    id: "P0.5",
    bloco: "Bloco 0 — Pré-Execução",
    title: "Síntese de Pré-Venda e Recomendação de Escopo",
    macroCategory: "all",
    projectTypeId: "all",
    activityLabel: "Integração Aba 04 -> Aba 02",
    phase: "planejamento",
    phaseLabel: "Pré-Venda",
    tier: "T3",
    modelo: "Claude Opus 5",
    alternativo: "Gemini 3.1 Pro",
    insumos: "Transcrição ou notas da entrevista de pré-venda",
    entregavel: "Ficha de projeto sugerida (Macro, N1, N2, Complexidade)",
    status: "ready",
    body: `Atue como Arquiteto de Soluções. Analise as notas da entrevista de pré-venda: [NOTAS]. Com base no portfólio da Consulcard, gere uma ficha de projeto sugerida contendo: 1) Macro Categoria principal; 2) Tipos N1 envolvidos; 3) Lista de Atividades N2 recomendadas; 4) Estimativa de Complexidade (Baixa/Média/Alta); 5) Alertas de pré-requisitos críticos.`,
  },
  {
    id: "M1.1",
    bloco: "Bloco M — Execução e Monitoramento",
    title: "Plano de Projeto e Cronograma Mestre",
    macroCategory: "all",
    projectTypeId: "all",
    activityLabel: "Planejamento",
    phase: "planejamento",
    phaseLabel: "Kickoff",
    tier: "T2",
    modelo: "Claude Sonnet 5",
    alternativo: "Gemini 3.6 Flash",
    insumos: "Atividades N2 contratadas, porte, prazo, equipe",
    entregavel: "Cronograma em tabela com marcos e dependências",
    status: "ready",
    body: `Atue como PMO Sênior. Com base nas atividades contratadas: [ATIVIDADES], prazo: [PRAZO] e equipe: [EQUIPE], gere um cronograma mestre estruturado. Apresente em formato de tabela (Semanas x Atividades), destacando marcos críticos (milestones), dependências entre tarefas e responsáveis sugeridos.`,
  },
  {
    id: "M1.2",
    bloco: "Bloco M — Execução e Monitoramento",
    title: "Relatório de Status Semanal",
    macroCategory: "all",
    projectTypeId: "all",
    activityLabel: "Status Report",
    phase: "execucao",
    phaseLabel: "Execução",
    tier: "T1",
    modelo: "Gemini 3.5 Flash-Lite",
    alternativo: "Claude Haiku 4.5",
    insumos: "Notas livres do consultor sobre a semana",
    entregavel: "Relatório de status estruturado",
    status: "ready",
    body: `Atue como PMO. Transforme as seguintes notas brutas da semana: [NOTAS] em um Relatório de Status Executivo profissional. Estrutura obrigatória: 1) Resumo Executivo; 2) % de Avanço Geral; 3) Principais Entregas Concluídas; 4) Próximos Passos (próxima semana); 5) Bloqueios, Riscos e Pendências com o Cliente.`,
  },
  {
    id: "M1.3",
    bloco: "Bloco M — Execução e Monitoramento",
    title: "Registro de Decisões (Decision Log)",
    macroCategory: "all",
    macroCategories: ["meios-pagamento","banking-conta-digital"],
    projectTypeId: "all",
    activityLabel: "Governança",
    phase: "execucao",
    phaseLabel: "Execução",
    tier: "T1",
    modelo: "Gemini 3.5 Flash-Lite",
    alternativo: "Claude Haiku 4.5",
    insumos: "Notas de reunião ou decisão",
    entregavel: "Entrada formatada para o Decision Log",
    status: "ready",
    body: `Atue como PMO. Analise as notas da reunião: [NOTAS] e extraia a decisão tomada. Formate uma entrada formal para o Decision Log contendo: Decisão Tomada, Data, Decisor(es), Contexto/Justificativa, Alternativas Consideradas e Descartadas, Impacto no Projeto (Prazo/Escopo) e Status.`,
  },
  {
    id: "M1.4",
    bloco: "Bloco M — Execução e Monitoramento",
    title: "Gestão de Mudança de Escopo",
    macroCategory: "all",
    projectTypeId: "all",
    activityLabel: "Gestão de Mudança",
    phase: "execucao",
    phaseLabel: "Execução",
    tier: "T3",
    modelo: "Claude Opus 5",
    alternativo: "Gemini 3.1 Pro",
    insumos: "Solicitação adicional, escopo original",
    entregavel: "Análise de impacto e minuta de aditivo",
    status: "ready",
    body: `Atue como Gerente de Projeto. O cliente solicitou a seguinte mudança: [SOLICITAÇÃO]. O escopo original era: [ESCOPO ORIGINAL]. Avalie o impacto dessa mudança em termos de esforço adicional (HH), prazo e complexidade. Em seguida, redija uma minuta profissional de proposta de aditivo de escopo para ser apresentada ao cliente.`,
  },
  {
    id: "M1.5",
    bloco: "Bloco M — Execução e Monitoramento",
    title: "Alerta de Risco de Projeto",
    macroCategory: "all",
    projectTypeId: "all",
    activityLabel: "Gestão de Riscos",
    phase: "execucao",
    phaseLabel: "Execução",
    tier: "T2",
    modelo: "Claude Sonnet 5",
    alternativo: "Gemini 3.6 Flash",
    insumos: "Descrição livre do risco",
    entregavel: "Ficha de risco com ações de mitigação",
    status: "ready",
    body: `Atue como Especialista em Gestão de Riscos. Analise a seguinte situação relatada pelo consultor: [SITUAÇÃO]. Classifique este risco, estime seu impacto potencial no projeto e gere uma Ficha de Risco contendo: Categoria, Probabilidade (Alta/Média/Baixa), Impacto, Nível Geral do Risco, e proponha 3 ações práticas de mitigação com prazo sugerido para decisão.`,
  },
  {
    id: "X1.1",
    bloco: "Expansão de Cobertura",
    title: "Diagnóstico de Aderência às Fases OF",
    macroCategory: "open-finance",
    projectTypeId: "open-finance-assessoria",
    activityLabel: "Diagnóstico de Aderência",
    phase: "diagnostico",
    phaseLabel: "Assessment",
    tier: "T2",
    modelo: "Claude Sonnet 5",
    alternativo: "Gemini 3.6 Flash",
    insumos: "Fase atual do cliente, produtos financeiros ofertados",
    entregavel: "Relatório de diagnóstico de aderência",
    status: "ready",
    body: `Atue como Especialista em Open Finance. Analise o perfil do cliente: [PERFIL] e os produtos financeiros que ele oferta: [PRODUTOS]. Avalie a aderência do cliente às fases regulatórias do Open Finance (Fases 1 a 4) do BACEN. Gere um diagnóstico apontando: 1) Gaps de conformidade atuais; 2) APIs de compartilhamento obrigatórias para o perfil; 3) Roadmap sugerido de adequação.`,
  },
  {
    id: "X1.2",
    bloco: "Expansão de Cobertura",
    title: "Escopo Multi-Categoria",
    macroCategory: "all",
    projectTypeId: "all",
    activityLabel: "Sequenciamento Integrado",
    phase: "planejamento",
    phaseLabel: "Planejamento",
    tier: "T3",
    modelo: "Claude Opus 5",
    alternativo: "Gemini 3.1 Pro",
    insumos: "Lista de tipos N1 e atividades N2, porte estimado",
    entregavel: "Plano de sequenciamento integrado",
    status: "ready",
    body: `Atue como Arquiteto de Soluções. O projeto combina as seguintes frentes: [FRENTES N1 e N2]. Analise as dependências cruzadas entre essas frentes. Gere um plano de sequenciamento integrado que otimize a execução, evitando gargalos. Estime o ganho de eficiência (efeito de escala) em relação à execução isolada de cada frente.`,
  },
  {
    id: "X1.3",
    bloco: "Expansão de Cobertura",
    title: "Triagem e Parecer de Novo Normativo",
    macroCategory: "revisao-operacional",
    projectTypeId: "suporte-regulatorio",
    activityLabel: "Triagem de Normativos",
    phase: "execucao",
    phaseLabel: "Execução Contínua",
    tier: "T3",
    modelo: "Claude Opus 5",
    alternativo: "Gemini 3.1 Pro",
    insumos: "Normativo ou circular publicada, perfil do cliente",
    entregavel: "Parecer executivo de impacto",
    status: "ready",
    body: `Atue como Consultor Regulatório. Analise o seguinte normativo recém-publicado pelo BACEN: [NORMATIVO]. Considerando o perfil do cliente: [PERFIL], gere um parecer executivo contendo: 1) Resumo da norma em linguagem de negócios; 2) Impacto direto nas operações do cliente; 3) Ações imediatas necessárias para conformidade; 4) Prazo regulatório.`,
  },
  {
    id: "H5.1",
    bloco: "Memória Institucional",
    title: "Retroalimentação Pós-Projeto e Calibração do IA-E",
    macroCategory: "all",
    projectTypeId: "all",
    activityLabel: "Registro de Projeto",
    phase: "entrega",
    phaseLabel: "Encerramento",
    tier: "T1",
    modelo: "Gemini 3.5 Flash-Lite",
    alternativo: "Claude Haiku 4.5",
    insumos: "Notas de encerramento; HH Base sem IA, IA-E Planejado e HH Plano (Histórico, col. V, W e Z); HH Realizado (col. N)",
    entregavel: "Ficha para o Histórico + parecer de calibração do IA-E da atividade",
    status: "ready",
    body: `Atue como Analista de Conhecimento.

CONTEXTO
- Notas de encerramento do projeto: [NOTAS]
- HH Base sem IA (referência registrada na abertura): [HH BASE]
- IA-E Planejado na abertura: [IA-E PLANEJADO]
- HH Realizado: [HH REALIZADO]
- HH Plano (o que foi vendido): [HH PLANO]
- IA-P observado nos entregáveis: [IA-P OBSERVADO]
- Origem do HH Base (histórico ou estimativa): [ORIGEM]

INSTRUÇÃO
1. Calcule o IA-E Realizado = 1 - (HH Realizado / HH Base). Apresente o cálculo.
2. Compare com o IA-E Planejado e informe a diferença em pontos percentuais.
2b. Calcule TAMBÉM o desvio contra o plano = (HH Realizado / HH Plano) - 1. São coisas diferentes: o item 2 diz se o ÍNDICE estava certo; o 2b diz se o PROJETO estourou. Reporte os dois, sempre.
3. Diga qual das duas coisas explica melhor a diferença e por quê: o índice de IA estava calibrado errado, ou o HH Base estava errado. Se a origem do HH Base for "estimativa", declare que as duas hipóteses são indistinguíveis com o dado disponível e não escolha uma.
4. Calcule a Taxa de Revisão realizada = 1 - IA-E Realizado / IA-P observado. Se o IA-P não tiver sido observado, marque [LACUNA] e não estime.
5. Gere a ficha estruturada para o Histórico (aba 05): Resumo do Projeto, Principais Desafios Superados, Lições Aprendidas.
6. Proponha ajuste no IA-E da atividade na aba 02 SOMENTE se a diferença do item 2 for superior a 10 p.p. E o HH Base tiver origem "histórico". Caso contrário, registre como observação isolada, sem alterar o índice — um único projeto não recalibra um índice.

SAÍDA ESPERADA
- Bloco de cálculo, com os quatro números e as duas diferenças.
- Ficha para o Histórico.
- Recomendação de ajuste do índice, com o critério do item 6 aplicado de forma explícita (inclusive quando a resposta for "não ajustar").
- Não converta nada em R$. A dimensão financeira está fora do escopo desta biblioteca.

FECHAMENTO
- Aplicar o bloco padrão Protocolo de Dados (linha PD.0 desta aba) na íntegra.
- Nomear o entregável no padrão AAAA-MM-DD_TipoDeDocumento_Assunto_V0X.ext e indicar a pasta oficial de destino entre as sete do projeto.`,
  },
  {
    id: "H5.2",
    bloco: "Memória Institucional",
    title: "Consulta a Projetos Similares",
    macroCategory: "all",
    projectTypeId: "all",
    activityLabel: "Consulta Histórica",
    phase: "planejamento",
    phaseLabel: "Pré-Venda",
    tier: "T2",
    modelo: "Claude Sonnet 5",
    alternativo: "Gemini 3.6 Flash",
    insumos: "Classificação do novo projeto, base da Aba 05",
    entregavel: "Ficha de referência histórica",
    status: "ready",
    body: `Atue como Consultor Sênior. Para o novo projeto classificado como: [CLASSIFICAÇÃO], busque na base histórica (Aba 05): [BASE] os projetos mais similares. Extraia e consolide: 1) HH médio realizado nesses projetos; 2) Principais riscos que se materializaram; 3) Desvios típicos de escopo; 4) Recomendações preventivas para o novo projeto.`,
  },
  {
    id: "E1.1",
    bloco: "Encerramento",
    title: "Encerramento Formal com Cliente",
    macroCategory: "all",
    projectTypeId: "all",
    activityLabel: "Relatório Final",
    phase: "entrega",
    phaseLabel: "Encerramento",
    tier: "T2",
    modelo: "Claude Sonnet 5",
    alternativo: "Gemini 3.6 Flash",
    insumos: "Status final das entregas, próximos passos sugeridos",
    entregavel: "Relatório final e termo de aceite",
    status: "ready",
    body: `Atue como Diretor de Projeto. Com base no status final das entregas: [STATUS] e nas observações do projeto: [OBSERVAÇÕES], redija um Relatório Executivo de Encerramento para o cliente. Estrutura: 1) Objetivos Alcançados; 2) Resumo das Entregas; 3) Recomendações Estratégicas de Próximos Passos. Gere também uma minuta de Termo de Aceite Final.`,
  },
  {
    id: "R1",
    bloco: "Bloco R — Revisão ET-05 · Migração de Plataforma",
    title: "Gerar checklist de insumos e pré-requisitos por tipo de projeto",
    macroCategory: "consultoria-estrategica",
    projectTypeId: "diagnostico",
    activityLabel: "Assessment de Gaps Regulatórios",
    phase: "diagnostico",
    phaseLabel: "Levantamento",
    tier: "T2",
    modelo: "Claude Sonnet 5",
    alternativo: "Gemini 3.6 Flash",
    insumos: "Tipo de projeto N1, produto/objetivo, fase atual",
    entregavel: "Tabela de insumos com faixa de bloqueio, dono e marco de decisão",
    status: "ready",
    body: `PAPEL
Atue como Consultor Sênior de Projetos de Meios de Pagamento, responsável por estruturar a entrada de um projeto e por proteger o cronograma contra dependências não mapeadas.

CONTEXTO
- Tipo de projeto: [TIPO DE PROJETO N1]
- Produto ou objetivo: [PRODUTO/OBJETIVO]
- Fase atual: [FASE]
- Preenchimento válido de [TIPO DE PROJETO N1]: migração de processadora, implantação de novo produto, revisão operacional, estruturação contábil ou assessment estratégico. Se vier diferente disso, peça esclarecimento antes de responder.

INSTRUÇÃO
Gere o checklist completo de insumos que o cliente precisa fornecer, organizado nas oito categorias abaixo.
1. Documentos e políticas internas
2. Contratos vigentes, cláusulas de exclusividade e condições de saída
3. Sistemas, arquitetura e integrações existentes
4. Dados financeiros e volumetria da carteira
5. Inventário de marcações contábeis e regulatórias aplicadas à base
6. Capacidade operacional: produção, logística, atendimento e retaguarda
7. Pré-requisitos regulatórios, de bandeira e de licenciamento
8. Calendário de bloqueio de mudanças em produção e janelas indisponíveis
Classifique cada item em uma de três faixas: BLOQUEIA O INÍCIO (sem ele o projeto não parte), BLOQUEIA A FASE (permite iniciar, impede concluir a fase corrente) ou REFINA (melhora a precisão sem travar).
Abra a resposta pela lista dos itens que bloqueiam o início, separados dos demais. Se essa lista estiver vazia, diga isso explicitamente.

SAÍDA ESPERADA
- Tabela única com as colunas: ID · Insumo · Categoria · Por que é necessário · Quem fornece (área do cliente) · Faixa de bloqueio · Marco de decisão que destrava · Prazo-limite sugerido.
- Antes da tabela, um parágrafo curto listando apenas os itens que bloqueiam o início.
- Depois da tabela, os itens que você recomendaria pedir mesmo sem terem sido citados no briefing, marcados como [SUGESTÃO CONSULCARD].

FECHAMENTO
- Aplicar o bloco padrão Protocolo de Dados (linha PD.0 desta aba) na íntegra.
- Nomear o entregável no padrão AAAA-MM-DD_TipoDeDocumento_Assunto_V0X.ext e indicar a pasta oficial de destino entre as sete do projeto.`,
  },
  {
    id: "R2",
    bloco: "Bloco R — Revisão ET-05 · Migração de Plataforma",
    title: "Benchmarking de Mercado",
    macroCategory: "consultoria-estrategica",
    projectTypeId: "estrategia-produto",
    activityLabel: "Benchmarking / Inteligência de Mercado",
    phase: "diagnostico",
    phaseLabel: "Análise",
    tier: "T3",
    modelo: "Claude Opus 5",
    alternativo: "Gemini 3.1 Pro",
    insumos: "Prompt original + definição de critério de seleção de concorrentes",
    entregavel: "Apontamentos de método para decisão do especialista de mercado",
    status: "pending",
    body: `[PENDENTE — AGUARDA ESPECIALISTA DE INTELIGÊNCIA DE MERCADO]
Prompt NÃO reescrito. O ET-05 registrou crítica de método, sem autoridade técnica para reescrever o conteúdo. Encaminhar conforme recomendação R3 da revisão. Pontos de atenção levantados:

1. SELEÇÃO ARBITRÁRIA DOS CONCORRENTES — Pedir os três principais concorrentes deixa a escolha para o modelo e produz resultado irreprodutível. Exija critério de seleção e segmentação por natureza do concorrente, por exemplo pares do mesmo tipo societário, entrantes digitais e incumbentes.

2. MATRIZ DESCRITIVA, SEM BASE COMPARÁVEL — O prompt pede uma tabela comparativa em quatro dimensões, mas não estabelece nenhuma base que permita ordenar os concorrentes. O resultado descreve os três lado a lado sem dizer quem está à frente em quê. Se a intenção for ranquear, é preciso declarar a escala e o que caracteriza cada nível; se for descritiva, é preciso ao menos fixar os atributos comparados dentro de cada dimensão.

3. AUSÊNCIA DE EXIGÊNCIA DE FONTE — É a falha mais grave deste prompt. Sem obrigar a citação da origem de cada avaliação, a matriz vira opinião com aparência de dado. Exija a fonte por dimensão e a data da consulta.

4. FALTA SEGMENTAÇÃO DE PÚBLICO — Comparar sem separar pessoa física de pessoa jurídica esconde diferenças que costumam ser materiais e levam a conclusões erradas sobre onde está o gap.

5. RECOMENDAÇÕES DESCONECTADAS DA MATRIZ — O prompt já pede três recomendações estratégicas, e isso é um acerto. O que falta é a ponte: nada obriga a recomendação a derivar do quadro comparativo, de modo que o modelo pode recomendar qualquer coisa plausível. Exija que cada recomendação aponte a dimensão e o concorrente que a originaram.

6. LINGUAGEM QUE CONVIDA À ESPECULAÇÃO — A expressão gaps percebidos autoriza o modelo a inventar. Substitua por gaps observáveis em fonte pública.

NOTA DE EXECUÇÃO: por depender de fonte pública verificável, este prompt exige modelo com busca web ativa e citação de URL. Sem isso, o item 3 acima não é atendível.`,
  },
  {
    id: "R3",
    bloco: "Bloco R — Revisão ET-05 · Migração de Plataforma",
    title: "Estruturar estudo de viabilidade econômica de produto financeiro",
    macroCategory: "consultoria-estrategica",
    projectTypeId: "estrategia-produto",
    activityLabel: "Elaboração de Business Plan de Produto",
    phase: "execucao",
    phaseLabel: "Construção",
    tier: "T3",
    modelo: "Claude Opus 5",
    alternativo: "Gemini 3.1 Pro",
    insumos: "Premissas de volumetria, escopo, modelo de emissão, horizonte, origem dos custos",
    entregavel: "Estudo de viabilidade em 10 seções, com cenários, sensibilidade e ressalvas",
    status: "ready",
    body: `PAPEL
Atue como Diretor de Produtos Financeiros com experiência em emissão de cartões, responsável por um estudo que será usado em decisão de investimento.

CONTEXTO
- Premissas de volumetria: [PREMISSAS]
- Escopo do projeto: [ESCOPO]
- Modelo de emissão em avaliação: [MODELO DE EMISSÃO] — licenciamento próprio, identificador dedicado sob patrocinador, ou faixa compartilhada
- Horizonte de projeção: [HORIZONTE], padrão de cinco anos se não informado
- Origem dos custos: [ORIGEM DOS CUSTOS] — indique se vêm de cotação formal, de referência de mercado ou de estimativa

INSTRUÇÃO
Estruture um estudo de viabilidade econômica contendo, nesta ordem:
1. Volumetria e drivers, com a base de cartões, a taxa de ativação, o ticket médio e a frequência de uso declarados separadamente.
2. Receitas por linha de monetização: intercâmbio (interchange), tarifas, anuidades, juros de rotativo e parcelado, receita de float e demais receitas aplicáveis.
3. Custos diretos e indiretos, separando o que escala com volume do que é fixo.
4. Capital: garantia ou colateral exigido, valor imobilizado ao fim de cada ano e custo desse capital, declarado como linha própria.
5. Base de liquidação: régua de repasse, régua de vencimento e exposição líquida resultante. Esta seção trata da régua que produz o float; a receita dele já foi tratada no item 2 e não deve ser contada duas vezes.
6. Perda esperada, com a base de incidência declarada de forma explícita.
7. Investimento inicial e sua amortização, com o período adotado.
8. Resultado por cenário — pior, médio e melhor —, construídos a partir da dispersão observada nos custos, e não por variação arbitrária.
9. Margem de contribuição por linha de receita e ponto de equilíbrio, informando se este último está líquido do investimento inicial.
10. Sensibilidade às três variáveis de maior impacto, com a leitura de quanto o resultado se move.
Se qualquer das dimensões 4, 5 ou 6 não puder ser preenchida com o material recebido, marque como [LACUNA] e informe que o estudo não deve ser usado para decisão até que seja fechada.

SAÍDA ESPERADA
- Documento com as dez seções acima, cada uma iniciando pela conclusão e depois pelo detalhe.
- Tabela comparativa de resultado por cenário e por ano.
- Seção de ressalvas obrigatórias, listando o que limita o uso da projeção.
- Seção final com as informações que ainda faltam para refinar o estudo, cada uma com o responsável por fornecê-la.

FECHAMENTO
- Aplicar o bloco padrão Protocolo de Dados (linha PD.0 desta aba) na íntegra.
- Nomear o entregável no padrão AAAA-MM-DD_TipoDeDocumento_Assunto_V0X.ext e indicar a pasta oficial de destino entre as sete do projeto.`,
  },
  {
    id: "R4",
    bloco: "Bloco R — Revisão ET-05 · Migração de Plataforma",
    title: "Criação de Histórias Ágeis (User Stories)",
    macroCategory: "meios-pagamento",
    projectTypeId: "emissor-cartao",
    activityLabel: "Elaboração de Backlog / Histórias Ágeis",
    phase: "execucao",
    phaseLabel: "Construção",
    tier: "T2",
    modelo: "Claude Sonnet 5",
    alternativo: "Gemini 3.6 Flash",
    insumos: "Prompt original + requisitos não funcionais e dependências de terceiro",
    entregavel: "Apontamentos de método para decisão do especialista de produto",
    status: "pending",
    body: `[PENDENTE — AGUARDA ESPECIALISTA DE PRODUTO / ENGENHARIA]
Prompt NÃO reescrito. O ET-05 registrou crítica de método, sem autoridade técnica para reescrever o conteúdo. Encaminhar conforme recomendação R3 da revisão. Pontos de atenção levantados:

1. AUSÊNCIA DE REQUISITOS NÃO FUNCIONAIS — Em emissão de cartões, latência de autorização, disponibilidade, idempotência e comportamento em degradação decidem a viabilidade da arquitetura. Não são história de usuário, mas precisam estar no backlog como requisito transversal, ou serão descobertos tarde.

2. AUSÊNCIA DE DEPENDÊNCIA DE TERCEIRO — Uma história pode estar pronta do lado do desenvolvimento e mesmo assim não entregar valor, porque depende de certificação de bandeira, de configuração da processadora ou de contrato assinado. Peça que cada história declare a dependência externa e o prazo típico dela.

3. CRITÉRIOS DE ACEITE — REFINAMENTO, NÃO CORREÇÃO — O prompt original já define cobertura, ao pedir foco em regras de negócio, exceções e conformidade. O ajuste sugerido é incremental: trocar o mínimo de três por uma exigência de cobertura explícita — um critério para o caminho normal, um para a exceção prevista e um para o efeito contábil ou de conciliação, quando houver. Assim o número deixa de ser a métrica.

4. FALTA O ÉPICO DE CONVIVÊNCIA — Quando há troca de plataforma, existe um período em que a operação nova e a antiga rodam juntas. Esse bloco não aparece em backlog escrito só a partir dos requisitos do produto e costuma ser fonte comum de retrabalho.

5. PRIORIZAÇÃO SEM CRITÉRIO — Pedir alta, média e baixa sem dizer o que qualifica cada faixa produz classificação inconsistente. Amarre a prioridade ao marco de decisão que a história destrava.`,
  },
  {
    id: "R5",
    bloco: "Bloco R — Revisão ET-05 · Migração de Plataforma",
    title: "Mapear fluxo de trabalho operacional (AS-IS / TO-BE)",
    macroCategory: "consultoria-estrategica",
    projectTypeId: "transformacao-digital",
    activityLabel: "Mapeamento de Processos AS-IS / TO-BE",
    phase: "diagnostico",
    phaseLabel: "Análise",
    tier: "T2",
    modelo: "Claude Sonnet 5",
    alternativo: "Gemini 3.6 Flash",
    insumos: "Relato AS-IS, objetivos TO-BE, volumetria, áreas envolvidas",
    entregavel: "AS-IS e TO-BE tabelados, pontos de quebra de dado, estado de transição e RACI",
    status: "ready",
    body: `PAPEL
Atue como Especialista em Processos Operacionais de Meios de Pagamento, com foco em controle financeiro e regulatório.

CONTEXTO
- Relato da operação atual: [RELATO AS-IS]
- Objetivos da nova arquitetura ou plataforma: [OBJETIVOS TO-BE]
- Volumetria disponível: [VOLUMETRIA] — se ausente, marque como [LACUNA] e prossiga sem inventar números
- Áreas envolvidas: [ÁREAS]

INSTRUÇÃO
Mapeie o fluxo em cinco blocos:
1. Fluxo AS-IS passo a passo, informando para cada etapa: quem executa, em qual sistema, qual a entrada, qual a saída, o volume por período e o tempo típico.
2. Onde o dado nasce e onde quebra: aponte cada ponto em que a informação é redigitada, conciliada manualmente, transportada por planilha ou por e-mail, ou depende de tabela de equivalência entre sistemas.
3. Gargalos e riscos de controle no modelo atual, separando risco operacional de risco de conformidade.
4. Fluxo TO-BE, destacando o que passa a ser automatizado, o que é eliminado e o que permanece manual — e, neste último caso, por quê.
5. Estado de transição: como a operação funciona enquanto o fluxo antigo e o novo coexistem, incluindo quem decide qual caso segue por qual caminho.
Na matriz RACI, cada atividade deve ter exatamente um Responsável. Se houver ambiguidade sobre quem responde, registre como [LACUNA] em vez de atribuir a duas áreas.

SAÍDA ESPERADA
- Descrição sequencial do AS-IS em formato de tabela, com as colunas: Etapa · Ator · Sistema · Entrada · Saída · Volume · Tempo típico.
- Lista dos pontos de quebra de dado, ordenada por risco.
- Descrição do TO-BE no mesmo formato do AS-IS, permitindo comparação direta.
- Bloco específico sobre o estado de transição.
- Matriz RACI do fluxo novo, com um único Responsável por atividade.
- Foque em regras de negócio e controle financeiro e regulatório, evitando aprofundamento em código ou infraestrutura.

FECHAMENTO
- Aplicar o bloco padrão Protocolo de Dados (linha PD.0 desta aba) na íntegra.
- Nomear o entregável no padrão AAAA-MM-DD_TipoDeDocumento_Assunto_V0X.ext e indicar a pasta oficial de destino entre as sete do projeto.`,
  },
  {
    id: "R6",
    bloco: "Bloco R — Revisão ET-05 · Migração de Plataforma",
    title: "Estruturar plano de migração de dados entre plataformas",
    macroCategory: "meios-pagamento",
    projectTypeId: "migracao-processadora",
    activityLabel: "Migração de Dados e Carteira",
    phase: "execucao",
    phaseLabel: "Execução",
    tier: "T3",
    modelo: "Claude Opus 5",
    alternativo: "Gemini 3.1 Pro",
    insumos: "Plataforma origem e destino, volumetria da carteira, estratégia, janela",
    entregavel: "Plano em 5 partes: bases, pipeline, regras transversais, batimento, marcações",
    status: "ready",
    body: `PAPEL
Atue como Especialista em Migração de Processadora, responsável por planejar o transporte da carteira entre plataformas sem perda de valor nem quebra de batimento contábil.

CONTEXTO
- Plataforma de origem: [ORIGEM]
- Plataforma de destino: [DESTINO]
- Volumetria da carteira: [VOLUMETRIA]
- Estratégia pretendida: [ESTRATÉGIA] — big bang, faseada por ondas, paralela ou híbrida
- Janela disponível: [JANELA]

INSTRUÇÃO
Trate a migração financeira como bases independentes, não como bloco único. Estruture o plano em cinco partes:
1. Bases a migrar. Separe a base cadastral das bases monetárias, e decomponha estas últimas em: faturas já fechadas; transações postadas e ainda não faturadas; transações com data futura de cobrança, ainda não postadas; e contratos parcelados em andamento. Para cada base declare o que ela carrega, a regra que a define e o ponto de atenção específico.
2. Pipeline por base. Percorra os estágios de extrair, formatar, preparar destino, transmitir, capturar, processar, devolver movimento, contabilizar a saída na origem e contabilizar a entrada no destino. Aponte, em cada estágio, o cuidado que evita retrabalho e de quem é o insumo.
3. Regras transversais. Trate obrigatoriamente: marcador permanente que distingue o registro migrado do orgânico; contabilização em espelho, com evento de saída na origem e de entrada no destino; data contábil única transportada no cabeçalho; tratamento de juros provisionados no mês de competência; e sincronização dos cortes de fatura entre as duas plataformas.
4. Critérios de aceite do batimento. Defina o que precisa fechar antes de liberar a onda, exigindo relatório analítico e sintético dos dois lados. Os limites percentuais que você propuser devem ser marcados como [SUGESTÃO CONSULCARD], para calibração pelo comitê.
5. Inventário de marcações. Levante os estados contábeis e regulatórios aplicados à base na origem e verifique se existe campo correspondente no destino. Para os que não tiverem, proponha tratamento antes do corte.

SAÍDA ESPERADA
- Tabela das bases, com o que cada uma carrega, a regra que a define e o ponto de atenção.
- Tabela do pipeline, com os estágios em linha e as bases em coluna, indicando onde o tratamento difere entre elas.
- Lista das regras transversais, cada uma com a consequência de não observá-la.
- Critérios de aceite do batimento, com a evidência exigida em cada um.
- Relação das marcações sem campo no destino, com o tratamento proposto.
- Seção de lacunas, listando o que impede fechar o plano.

FECHAMENTO
- Aplicar o bloco padrão Protocolo de Dados (linha PD.0 desta aba) na íntegra.
- Nomear o entregável no padrão AAAA-MM-DD_TipoDeDocumento_Assunto_V0X.ext e indicar a pasta oficial de destino entre as sete do projeto.`,
  },
  {
    id: "R7",
    bloco: "Bloco R — Revisão ET-05 · Migração de Plataforma",
    title: "Estruturar plano de cut-over, contingência e rollback",
    macroCategory: "meios-pagamento",
    projectTypeId: "migracao-processadora",
    activityLabel: "Cut-over, Contingência e Rollback",
    phase: "execucao",
    phaseLabel: "Execução",
    tier: "T3",
    modelo: "Claude Opus 5",
    alternativo: "Gemini 3.1 Pro",
    insumos: "Escopo da onda, janela, calendário de bloqueio de mudanças, partes envolvidas",
    entregavel: "Plano em 7 blocos, com critério de rollback e ponto de não retorno fechados",
    status: "ready",
    body: `PAPEL
Atue como Especialista em Cut-over de Plataforma de Processamento, responsável por levar a operação ao ar sem improviso em produção.

CONTEXTO
- Escopo da onda: [ESCOPO DA ONDA]
- Janela pretendida: [JANELA]
- Calendário de bloqueio de mudanças do cliente: [CALENDÁRIO]
- Partes envolvidas: [PARTES] — cliente, plataforma de origem, plataforma de destino, bandeira, banco liquidante

INSTRUÇÃO
Monte o plano em sete blocos:
1. Pré-condições. O que precisa estar concluído e comprovado para o corte ser autorizado, cada item com a evidência exigida.
2. Plano hora a hora da janela, com responsável nomeado por atividade e o ponto em que cada parte externa precisa estar disponível.
3. Tratamento do delta — a janela entre a extração dos dados e o corte efetivo. Percorra obrigatoriamente: contestação de transação já enviada; pagamento recebido no intervalo; faturamento ocorrido no intervalo; autorização capturada após o corte; parcela subsequente de contrato contestado; e processamento da origem na madrugada da virada. Para cada evento, proponha a regra e marque-a conforme o protocolo de dados.
4. Critério de rollback e ponto de não retorno. Declare em que condições o corte é abortado, quem tem a alçada para abortar, e a partir de que momento a reversão deixa de ser possível. Este bloco precisa estar fechado antes do corte, nunca decidido durante.
5. Plano de comunicação, separando cliente final, rede de atendimento, bandeira e, quando aplicável, regulador.
6. Hipercare: duração, indicadores acompanhados, cadência de acompanhamento e critério objetivo de encerramento.
7. Decisões que exigem comitê com presença humana, listadas de forma explícita.
Nunca proponha entrada em produção sem que o critério de rollback tenha sido testado em ensaio.

SAÍDA ESPERADA
- Tabela de pré-condições com a evidência exigida em cada uma.
- Cronograma hora a hora da janela, com responsável por atividade.
- Tabela do delta: evento · por que é problema · regra proposta · quem decide.
- Bloco destacado com critério de go, critério de rollback e ponto de não retorno.
- Plano de comunicação por público.
- Plano de hipercare com critério de saída.
- Relação das decisões que exigem validação humana.

FECHAMENTO
- Aplicar o bloco padrão Protocolo de Dados (linha PD.0 desta aba) na íntegra.
- Nomear o entregável no padrão AAAA-MM-DD_TipoDeDocumento_Assunto_V0X.ext e indicar a pasta oficial de destino entre as sete do projeto.`,
  },
  {
    id: "R8",
    bloco: "Bloco R — Revisão ET-05 · Migração de Plataforma",
    title: "Estruturar checklist de homologação e certificação junto à bandeira",
    macroCategory: "meios-pagamento",
    projectTypeId: "setup-bandeira",
    activityLabel: "Homologação e Certificação de Bandeira",
    phase: "validacao",
    phaseLabel: "Homologação",
    tier: "T2",
    modelo: "Claude Sonnet 5",
    alternativo: "Gemini 3.6 Flash",
    insumos: "Bandeira, modelo de emissão, processadora, escopo pretendido",
    entregavel: "Tabela de tarefas por fase e por modelo de emissão, com prazos de terceiro",
    status: "ready",
    body: `PAPEL
Atue como Especialista em Homologação e Certificação junto a bandeiras de cartões.

CONTEXTO
- Bandeira: [BANDEIRA]
- Modelo de emissão: [MODELO DE EMISSÃO] — licenciamento próprio, identificador dedicado sob patrocinador, ou faixa compartilhada
- Processadora: [PROCESSADORA]
- Escopo pretendido: [ESCOPO]

INSTRUÇÃO
Estruture o caminho de homologação em fases, cobrindo obrigatoriamente: abertura e licenciamento; escopo, análise de risco e tesouraria; infraestrutura e conectividade; configuração, chaves e design do plástico; testes e certificação técnica; prontidão para produção; entrada em produção; e pós-produção.
Para cada tarefa, informe a quem ela se aplica conforme o modelo de emissão. Deixe explícito quando a tarefa é executada pela bandeira, pelo emissor, pela processadora ou pelo patrocinador, e quando o emissor apenas participa ou aprova.
Declare a duração de referência de cada fase e sinalize que se trata de prazo de terceiro, que não comprime com aumento de esforço interno.
Ao final, quantifique quantas tarefas se aplicam a cada modelo de emissão, para tornar visível a diferença de esforço entre eles.
Toda certificação e todo aceite formal exigem documentação e validação humana. Registre isso de forma explícita.

SAÍDA ESPERADA
- Tabela de tarefas com as colunas: ID · Fase · Tarefa · Aplica-se a (por modelo) · Duração de referência · Executa · Participa · Aprova · Depende de.
- Quadro-resumo com a contagem de tarefas por modelo de emissão.
- Lista dos pontos que dependem exclusivamente de terceiro, com o alerta de prazo.
- Relação dos aceites formais que exigem documentação e validação humana.

FECHAMENTO
- Aplicar o bloco padrão Protocolo de Dados (linha PD.0 desta aba) na íntegra.
- Nomear o entregável no padrão AAAA-MM-DD_TipoDeDocumento_Assunto_V0X.ext e indicar a pasta oficial de destino entre as sete do projeto.`,
  },
];
