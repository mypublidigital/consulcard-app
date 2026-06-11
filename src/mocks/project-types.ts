import type { MacroCategory } from "@/types";

export const PROJECT_TYPES: MacroCategory[] = [
  {
    id: "contabil-regulatorio",
    label: "Contábil / Regulatório",
    color: "blue",
    types: [
      { id: "setup-contabil", label: "Setup Contábil e Regulatório", complexity: "4-5", anchor: true },
      { id: "revisao-cosif", label: "Revisão e Adequação COSIF", complexity: "3-4" },
      { id: "mapeamento-bacen", label: "Mapeamento Regulatório BACEN", complexity: "3-4" },
    ],
  },
  {
    id: "meios-pagamento",
    label: "Meios de Pagamento",
    color: "purple",
    types: [
      { id: "emissor-cartao", label: "Estruturação de Emissor de Cartão", complexity: "4-5", anchor: true },
      { id: "migracao-processadora", label: "Migração de Processadora / Plataforma", complexity: "4-5" },
      { id: "otimizacao-tarifas", label: "Otimização de Tarifas de Bandeira", complexity: "2-3" },
      { id: "setup-bandeira", label: "Setup de Bandeira / BIN Sponsor", complexity: "3-4" },
      { id: "estruturacao-adquirencia", label: "Adquirência — Estruturação", complexity: "4-5" },
      { id: "operacao-cartao", label: "Estruturação de Operação de Cartão", complexity: "2-4" },
    ],
  },
  {
    id: "banking-conta-digital",
    label: "Banking / Conta Digital",
    color: "teal",
    types: [
      { id: "conta-digital", label: "Estruturação de Conta Digital", complexity: "4-5" },
      { id: "baas", label: "BaaS — Banking as a Service", complexity: "4-5" },
      { id: "pld-aml", label: "PLD / AML — Estruturação", complexity: "3-4" },
      { id: "kyc-onboarding", label: "KYC / Onboarding Regulatório", complexity: "2-3" },
    ],
  },
  {
    id: "consultoria-estrategica",
    label: "Consultoria Estratégica",
    color: "amber",
    types: [
      { id: "diagnostico", label: "Diagnóstico / Assessment", complexity: "1-3" },
      { id: "estrategia-produto", label: "Estratégia de Produto", complexity: "2-4" },
      { id: "modelo-negocio", label: "Modelo de Negócio", complexity: "2-4" },
      { id: "transformacao-digital", label: "Transformação Digital / BPO", complexity: "2-4" },
    ],
  },
  {
    id: "open-finance",
    label: "Open Finance / Pag. Instantâneos",
    color: "green",
    types: [
      { id: "pix-implantacao", label: "PIX — Implantação", complexity: "3-4" },
      { id: "open-finance-assessoria", label: "Open Finance — Assessoria", complexity: "2-4" },
    ],
  },
  {
    id: "revisao-operacional",
    label: "Revisão Operacional",
    color: "red",
    types: [
      { id: "mandates-bandeira", label: "Gestão de Mandates Bandeira", complexity: "2-4" },
      { id: "suporte-regulatorio", label: "Suporte Regulatório Contínuo", complexity: "2-3" },
    ],
  },
];

export const MACRO_COLOR_CLASSES: Record<MacroCategory["color"], { bg: string; text: string; border: string; soft: string }> = {
  blue:   { bg: "bg-[#1A3A8F]",    text: "text-[#1A3A8F]",    border: "border-[#1A3A8F]",    soft: "bg-[#1A3A8F]/10" },
  purple: { bg: "bg-[#6D28D9]",    text: "text-[#6D28D9]",    border: "border-[#6D28D9]",    soft: "bg-[#6D28D9]/10" },
  teal:   { bg: "bg-[#0E7C7B]",    text: "text-[#0E7C7B]",    border: "border-[#0E7C7B]",    soft: "bg-[#0E7C7B]/10" },
  amber:  { bg: "bg-[#92400E]",    text: "text-[#92400E]",    border: "border-[#92400E]",    soft: "bg-[#92400E]/10" },
  green:  { bg: "bg-[#0F5C48]",    text: "text-[#0F5C48]",    border: "border-[#0F5C48]",    soft: "bg-[#0F5C48]/10" },
  red:    { bg: "bg-[#9B1C1C]",    text: "text-[#9B1C1C]",    border: "border-[#9B1C1C]",    soft: "bg-[#9B1C1C]/10" },
};

export function findMacro(id: string) {
  return PROJECT_TYPES.find((m) => m.id === id);
}

export function findProjectType(macroId: string, typeId: string) {
  return findMacro(macroId)?.types.find((t) => t.id === typeId);
}
