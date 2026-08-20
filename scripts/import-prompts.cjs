// Importador da Biblioteca de Prompts a partir da planilha modelo da Consulcard.
// Regera src/mocks/prompts.ts. Requer: npm i -D xlsx
//   node scripts/import-prompts.cjs "caminho/Planilha_....xlsx"
const XLSX = require("xlsx");
const fs = require("fs");

const SRC = process.argv[2];
if (!SRC) {
  console.error("uso: node scripts/import-prompts.cjs <caminho-da-planilha.xlsx>");
  process.exit(1);
}
const wb = XLSX.readFile(SRC);
const rows = XLSX.utils.sheet_to_json(wb.Sheets["05 · Biblioteca de Prompts"], { header: 1, defval: "" });

const MACRO = {
  "Contábil / Regulatório": "contabil-regulatorio",
  "Meios de Pagamento": "meios-pagamento",
  "Banking / Conta Digital": "banking-conta-digital",
  "Consultoria Estratégica": "consultoria-estrategica",
  "Open Finance / Pag. Instantâneos": "open-finance",
  "Revisão Operacional": "revisao-operacional",
  Todas: "all",
};
// Macro dupla: vira "all" + lista explícita, para o filtro continuar correto.
const MULTI = { "Meios de Pagamento / Banking": ["meios-pagamento", "banking-conta-digital"] };

// Variações de nome usadas na aba 05 que correspondem a tipos da aba 01.
const TIPO = {
  "Estruturação Contábil": "setup-contabil",
  "Setup Contábil e Regulatório": "setup-contabil",
  "Revisão e Adequação COSIF": "revisao-cosif",
  "Mapeamento Regulatório BACEN": "mapeamento-bacen",
  "Estruturação de Emissor": "emissor-cartao",
  "Estruturação de Emissor de Cartão": "emissor-cartao",
  "Migração de Processadora / Plataforma": "migracao-processadora",
  "Setup de Bandeira / BIN Sponsor": "setup-bandeira",
  "Estruturação de Conta Digital": "conta-digital",
  "Assessment / Diagnóstico": "diagnostico",
  "Diagnóstico / Assessment": "diagnostico",
  "Estratégia de Produto": "estrategia-produto",
  "Transformação Digital / BPO": "transformacao-digital",
  "Open Finance": "open-finance-assessoria",
  "Open Finance — Assessoria": "open-finance-assessoria",
  "Suporte Regulatório Contínuo": "suporte-regulatorio",
  "Projetos Combinados": "all",
  Todos: "all",
};

// A aba 01 é a taxonomia canônica; corrige a macro quando o tipo a contradiz.
const MACRO_DO_TIPO = {
  "setup-contabil": "contabil-regulatorio",
  "revisao-cosif": "contabil-regulatorio",
  "mapeamento-bacen": "contabil-regulatorio",
  "emissor-cartao": "meios-pagamento",
  "migracao-processadora": "meios-pagamento",
  "setup-bandeira": "meios-pagamento",
  "conta-digital": "banking-conta-digital",
  diagnostico: "consultoria-estrategica",
  "estrategia-produto": "consultoria-estrategica",
  "transformacao-digital": "consultoria-estrategica",
  "open-finance-assessoria": "open-finance",
  "suporte-regulatorio": "revisao-operacional",
};

const FASE = {
  "Pré-Venda": "planejamento",
  "Pré-Kickoff": "planejamento",
  Kickoff: "planejamento",
  Planejamento: "planejamento",
  Levantamento: "diagnostico",
  Análise: "diagnostico",
  Assessment: "diagnostico",
  Construção: "execucao",
  Execução: "execucao",
  "Execução Contínua": "execucao",
  Homologação: "validacao",
  Encerramento: "entrega",
};

const clean = (v) => String(v).replace(/\r/g, "").trim();
const esc = (s) => s.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");

function parseModelo(raw) {
  const t = clean(raw);
  if (!t || t.startsWith("n/a")) return { tier: null, modelo: "", alternativo: "" };
  const tier = (t.match(/^T([123])/) || [])[1];
  const principal = (t.match(/^T[123]\s*·\s*([^\n]+)/) || [])[1] || "";
  const alt = (t.match(/alt\.:\s*([^\n]+)/) || [])[1] || "";
  return { tier: tier ? `T${tier}` : null, modelo: clean(principal), alternativo: clean(alt) };
}

const data = rows.slice(2).filter((r) => clean(r[0]) && clean(r[7]));

const warnings = [];
let protocol = null;
const out = [];

for (const r of data) {
  const id = clean(r[0]);
  const bloco = clean(r[1]);
  const faseRaw = clean(r[2]);
  const macroRaw = clean(r[3]);
  const tipoRaw = clean(r[4]);
  const atividade = clean(r[5]);
  const titulo = clean(r[7]);
  const { tier, modelo, alternativo } = parseModelo(r[8]);
  const insumos = clean(r[9]);
  const entregavel = clean(r[10]);
  const body = clean(r[11]);

  // PD.0 é bloco de regra, não prompt executável.
  if (id === "PD.0") {
    protocol = body;
    continue;
  }

  const projectTypeId = TIPO[tipoRaw];
  if (projectTypeId === undefined) warnings.push(`tipo não mapeado: "${tipoRaw}" (${id})`);

  let macroCategory = MULTI[macroRaw] ? "all" : MACRO[macroRaw];
  if (macroCategory === undefined) warnings.push(`macro não mapeada: "${macroRaw}" (${id})`);

  // Taxonomia canônica vence quando o tipo tem macro própria.
  const canonica = MACRO_DO_TIPO[projectTypeId];
  if (canonica && macroCategory !== "all" && canonica !== macroCategory) {
    warnings.push(`[${id}] macro corrigida: "${macroRaw}" -> "${canonica}" (aba 01 manda no tipo "${tipoRaw}")`);
    macroCategory = canonica;
  }

  const phase = FASE[faseRaw];
  if (!phase) warnings.push(`fase não mapeada: "${faseRaw}" (${id})`);

  // R2/R4 não foram reescritos — a planilha os marca como pendentes.
  const pending = /^\[PENDENTE/i.test(body) || /NÃO REESCRITO/i.test(titulo);

  out.push({
    id,
    bloco,
    phaseLabel: faseRaw,
    title: titulo.replace(/\s*\[(REESCRITO|NOVO|CRÍTICA — NÃO REESCRITO)\]\s*$/, "").trim(),
    macroCategory,
    macroCategories: MULTI[macroRaw] || null,
    projectTypeId: projectTypeId ?? "all",
    activityLabel: atividade,
    phase: phase || "execucao",
    tier,
    modelo,
    alternativo,
    insumos,
    entregavel,
    status: pending ? "pending" : "ready",
    body,
  });
}

const lit = (v) => (v === null || v === "" ? "undefined" : JSON.stringify(v));

const ts = `import type { PromptDef } from "@/types";

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
export const DATA_PROTOCOL = \`${esc(protocol || "")}\`;

/** Junta o prompt ao PD.0, conforme a regra da biblioteca. */
export function withDataProtocol(body: string): string {
  return \`\${body}\\n\\n---\\n\\n\${DATA_PROTOCOL}\`;
}

export const PROMPT_TIERS = [
  { id: "T1", label: "T1 · Rápido", hint: "tarefas estruturadas e repetitivas" },
  { id: "T2", label: "T2 · Intermediário", hint: "construção de documentos e análise" },
  { id: "T3", label: "T3 · Avançado", hint: "julgamento, viabilidade e risco" },
] as const;

export const PROMPTS: PromptDef[] = [
${out
  .map(
    (p) => `  {
    id: ${lit(p.id)},
    bloco: ${lit(p.bloco)},
    title: ${lit(p.title)},
    macroCategory: ${lit(p.macroCategory)},${p.macroCategories ? `\n    macroCategories: ${JSON.stringify(p.macroCategories)},` : ""}
    projectTypeId: ${lit(p.projectTypeId)},
    activityLabel: ${lit(p.activityLabel)},
    phase: ${lit(p.phase)},
    phaseLabel: ${lit(p.phaseLabel)},
    tier: ${lit(p.tier)},
    modelo: ${lit(p.modelo)},
    alternativo: ${lit(p.alternativo)},
    insumos: ${lit(p.insumos)},
    entregavel: ${lit(p.entregavel)},
    status: ${lit(p.status)},
    body: \`${esc(p.body)}\`,
  },`
  )
  .join("\n")}
];
`;

fs.writeFileSync(require("path").join(__dirname, "..", "src", "mocks", "prompts.ts"), ts, "utf8");

console.log("prompts gerados:", out.length);
console.log("pendentes:", out.filter((p) => p.status === "pending").map((p) => p.id).join(", "));
console.log("PD.0 capturado:", protocol ? protocol.length + " chars" : "NAO");
console.log("\navisos:");
warnings.forEach((w) => console.log("  - " + w));
console.log("\npor fase:", JSON.stringify(out.reduce((a, p) => ((a[p.phase] = (a[p.phase] || 0) + 1), a), {})));
console.log("por tier:", JSON.stringify(out.reduce((a, p) => ((a[p.tier] = (a[p.tier] || 0) + 1), a), {})));
