export const COPILOT_TRANSCRIPT_RESPONSE = `## Resumo da reunião

Reunião de alinhamento técnico sobre a **migração da plataforma Orbital para a Dock**, com participação do time de produto, tecnologia e operações da Fintech Consignado. Foco em definir a janela de cutover e validar o inventário de BINs ativos.

### Decisões tomadas
1. Janela de cutover definida para o final de semana de **27–28 de setembro de 2026**
2. Manter operação em paralelo (Orbital + Dock) por **2 semanas** após o go-live
3. Time de back-office assume monitoramento intensivo nas primeiras **72 horas**

### Pendências identificadas
| # | Pendência | Responsável | Prazo |
|---|---|---|---|
| 1 | Enviar lista atualizada de BINs ativos por produto | Cliente | 25/05 |
| 2 | Validar contrato com Dock e protocolos de cutover | Rogério Andrade | 30/05 |
| 3 | Mapear regras de contestação vigentes | João Sales | 02/06 |

### Próximos passos sugeridos
- Agendar dry-run da migração na **última semana de agosto**
- Iniciar levantamento detalhado de **fluxos transacionais** para a próxima sprint
- Validar com a Dock as **regras de parametrização de produto**

### Atividades tocadas no board
- *Levantamento de produtos e BINs ativos* → status sugerido: **Em andamento**
- *Plano de migração e janela de cutover* → status sugerido: **Em revisão**`;

export const COPILOT_INITIAL_MESSAGES = [
  {
    role: "assistant" as const,
    content:
      "Olá! Sou o co-piloto deste projeto. Posso processar transcrições de reunião, gerar atas, identificar pendências e ajudar na execução das atividades. O que vamos atacar hoje?",
  },
];

export const COPILOT_QUICK_REPLIES: Record<string, string> = {
  "Mapear plano contábil COSIF":
    "Perfeito. Para mapear o **plano contábil COSIF**, preciso confirmar:\n\n1. Tipo de instituição (IP, SCD, SCFI, banco?)\n2. Produto principal\n3. Volumetria esperada\n\nAssim que me passar esses dados, monto uma proposta hierárquica de contas com as referências regulatórias aplicáveis (Circulares BACEN 3.350/3.398 e demais).",
  "Criar status report semanal":
    "Posso gerar o status report semanal com base nas atividades concluídas, em andamento e nas pendências abertas. Quer que eu inclua a seção de **riscos** também? E o público-alvo é o **comitê interno** ou o **cliente**?",
  default:
    "Recebido. Posso aprofundar este tópico — quer que eu **gere um artefato** (documento, lista de ações, ata) ou que **estruture uma análise** com base nas informações do projeto?",
};
