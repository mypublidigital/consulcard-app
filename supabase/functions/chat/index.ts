import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── Modelo por tier ───────────────────────────────────────────────────────────
// Regra da planilha modelo (aba 07 · Custo-Benefício LLM): cada ficha da
// biblioteca declara T1/T2/T3. Conversa livre e o agente executivo usam T2.
const MODEL_BY_TIER = {
  T1: "claude-haiku-4-5",
  T2: "claude-sonnet-5",
  T3: "claude-opus-5",
} as const;
type Tier = keyof typeof MODEL_BY_TIER;

// Teto de resposta. Antes era 1.500 tokens: respostas longas e o XML do Drawio
// eram cortados no meio (itens 8 e 10). 64K é o limite de saída do Haiku 4.5;
// com streaming não há risco de timeout.
const MAX_TOKENS = 64000;

// Tempo máximo de uma chamada (testes de 06/10, GAPs #10, #12 e #14). A Edge
// Function é encerrada pelo Supabase ao atingir o limite de relógio do plano
// (400 s no Pro, 150 s no gratuito; em produção: secret = 360): gerar um
// fluxograma de 60 mil caracteres pode passar disso, a função morria no meio
// e a tela mostrava "A conexão caiu".
// Agora ela para sozinha antes do limite e avisa (stop_reason "time_limit");
// o app pede a continuação automaticamente, emendando as partes.
const TIME_BUDGET_MS = Number(Deno.env.get("CHAT_TIME_BUDGET_SECONDS") ?? "120") * 1000;

// Sinal de vida enquanto o modelo raciocina sem escrever: sem isto a conexão
// ficava muda por longos períodos e a tela parecia travada em "Pensando...".
const KEEPALIVE_MS = 5000;

// ── Mapa da interface ─────────────────────────────────────────────────────────
// Sem isto o agente inventava menus e botões ao orientar o usuário (item 16).
const UI_MAP = `COMO O SISTEMA FUNCIONA — use SOMENTE este mapa ao orientar o usuário na interface.

Menu lateral:
- Dashboard — visão geral dos projetos e pendências.
- Projetos — lista de projetos; botão "+ Novo Projeto" no topo cria um projeto em 3 etapas.
- Biblioteca de Prompts — fichas de prompt com filtros por categoria, tipo, fase e modelo recomendado (T1/T2/T3). "Usar em projeto" abre o co-piloto do projeto com o prompt carregado.
- Base de Conhecimento — ainda não disponível ("em breve").
- Painel Executivo e Usuários — só para perfis Admin e Diretor.

Dentro de um projeto, abas:
- Atividades — quadro Kanban com as colunas A fazer, Em andamento, Em revisão e Concluída. Arrastar o cartão muda o status. Botão "+ Atividade" cria uma nova. Clicar no cartão abre o detalhe.
- Co-piloto IA — este chat. Lateral direita: fase atual, "Usados neste projeto" e "Prompts para esta fase" (clicar carrega o prompt no campo). Botão "Transcrição" envia arquivo de reunião; "Anexar" (ou arrastar/colar o arquivo) envia PDF, imagem, Word, PowerPoint ou texto. "Parar" interrompe a resposta. Cada resposta tem "Salvar em Documentos".
- Pendências — lista com filtro Todas/Abertas/Resolvidas. "+ Pendência" cria; "Resolver" fecha; "Reabrir" volta a pendência resolvida para aberta.
- Documentos — documentos do projeto: arquivos enviados, anexos e respostas salvas do co-piloto, e links do SharePoint. O co-piloto consegue abrir os arquivos dessa aba (não os links do SharePoint).
- Status Report — relatório de andamento do projeto.

Topo do projeto: seletor de status, "Gerar Status Report", "Adicionar pendência", "Ver portal" (portal do cliente) e o botão "…" que abre a edição do projeto.

Topo de todas as telas: sino de notificações (pendências e atividades vencidas ou vencendo) e o menu do perfil (iniciais do usuário), com "Alterar senha" e "Sair".

REGRAS:
- Se o usuário perguntar como fazer algo que não está neste mapa, diga que não sabe onde fica — NUNCA invente menu, aba ou botão.
- Você NÃO executa ações no sistema: não cria atividades, não muda status, não salva documentos. Você sugere; o usuário faz. Nunca diga que fez algo no sistema.`;

function projectSection(ctx?: Record<string, unknown>): string {
  if (!ctx) return "";
  const v = (x: unknown) => (x === undefined || x === null || x === "" ? "—" : String(x));
  const lines = [
    `Projeto: ${v(ctx.name)}`,
    `Cliente: ${v(ctx.client)}`,
    `Categoria: ${v(ctx.macroCategory)} · Tipo: ${v(ctx.projectType)}`,
    `Status: ${v(ctx.status)} · Progresso: ${v(ctx.progress)}% · Complexidade: ${v(ctx.complexity)}/5`,
    `Período: ${v(ctx.startDate)} a ${v(ctx.targetEndDate)}`,
    `Gerente: ${v(ctx.managerName ?? (ctx.manager as { name?: string } | undefined)?.name)}`,
    `Consultores: ${(ctx.consultantNames as string[] | undefined)?.join(", ") || "nenhum alocado"}`,
  ];
  const acts = ctx.activities as { label: string; status: string; assignee?: string; dueDate?: string }[] | undefined;
  if (acts?.length) {
    lines.push("", "Atividades no quadro:");
    for (const a of acts) {
      lines.push(`- [${a.status}] ${a.label}${a.assignee ? ` — ${a.assignee}` : ""}${a.dueDate ? ` (prazo ${a.dueDate})` : ""}`);
    }
  }
  const pends = ctx.openPendencies as { description: string; owner: string; dueDate: string }[] | undefined;
  if (pends?.length) {
    lines.push("", "Pendências abertas:");
    for (const p of pends) lines.push(`- ${p.description} — ${p.owner} (prazo ${p.dueDate})`);
  }
  return lines.join("\n");
}

function catalogSection(catalog?: { id: string; title: string; activity: string }[]): string {
  if (!catalog?.length) return "";
  return `BIBLIOTECA DE PROMPTS DA CONSULCARD — fichas já existentes:
${catalog.map((p) => `- ${p.id} · ${p.title} (${p.activity})`).join("\n")}

Se o que o usuário pediu corresponde a uma destas fichas, diga qual antes de responder, no formato:
"A Consulcard já tem a ficha [ID] — [título]. Você pode carregá-la em Biblioteca de Prompts → Usar em projeto, o que garante o padrão da casa. Se preferir, sigo com o pedido assim mesmo."
Depois atenda o pedido normalmente. Não invente ficha que não esteja na lista.

`;
}

// Testes de 06/10 (GAPs #7 e #9): o modelo respondia "não tenho capacidade de
// abrir anexos (PDF, .docx...)" — falso — e pedia para colar o texto. Os
// arquivos chegam como conteúdo das mensagens.
const FILES_RULES = `ARQUIVOS DA CONVERSA:
- Você LÊ os arquivos anexados: PDF (texto, tabelas e também o desenho das páginas — fluxogramas e diagramas incluídos), imagens, e o texto de Word (.docx), PowerPoint (.pptx), transcrições (.txt, .vtt, .srt) e XML. Eles chegam como blocos de documento/imagem nas mensagens do usuário, com o nome do arquivo.
- Nunca diga que não consegue abrir ou ler anexos. Se o usuário citar um arquivo que não está na conversa, procure-o primeiro em DOCUMENTOS DO PROJETO e abra-o com a ferramenta; só se ele não estiver lá peça para anexá-lo pelo botão "Anexar".
- Áudio e vídeo (.mp4, .mp3) não são lidos: oriente a anexar a transcrição gerada pelo Teams (.docx ou .vtt).

RESPOSTAS LONGAS:
- Entregue o pedido inteiro numa resposta só, sem perguntar se pode dividir. O sistema emenda automaticamente quando uma resposta precisa de mais de uma etapa.
- Se a mensagem do usuário pedir para continuar de onde parou, continue exatamente do ponto em que o texto anterior terminou: sem repetir, sem introdução e sem reabrir bloco de código já aberto.`;

const COPILOT_SYSTEM = (ctx?: Record<string, unknown>, catalog?: { id: string; title: string; activity: string }[]) => `Você é o Co-piloto Operacional da Consulcard, consultoria de projetos regulatórios e de meios de pagamento.

${catalogSection(catalog)}

${ctx ? `DADOS DO PROJETO ATUAL (fonte: sistema; são os únicos dados do projeto que você conhece):\n${projectSection(ctx)}\n` : ""}
Você ajuda consultores a:
- Elaborar atas de reunião a partir de transcrições
- Redigir relatórios, planos de ação e entregáveis
- Analisar documentos regulatórios (BACEN, CVM, LGPD etc.)
- Estruturar diagnósticos e recomendações
- Gerar fluxogramas para o draw.io: nesse caso entregue o XML completo e válido (<mxfile>…</mxfile>) num único bloco de código \`\`\`xml, sem cortar nem abreviar.

${UI_MAP}

${FILES_RULES}

Não invente dados do projeto que não estejam acima. Responda sempre em português do Brasil, com Markdown quando ajudar a leitura.`;

// O agente executivo recebe o portfólio real do cliente. Antes tinha dados
// fictícios cravados aqui (projetos e consultores que não existem).
const DIRECTOR_SYSTEM = (portfolio?: unknown) => `Você é o Co-piloto Executivo da Consulcard, consultoria de projetos regulatórios e de meios de pagamento.

${portfolio ? `PORTFÓLIO ATUAL (fonte: sistema; são os únicos dados que você conhece):\n${JSON.stringify(portfolio, null, 2)}\n` : "Nenhum dado de portfólio foi enviado nesta conversa."}

${UI_MAP}

Responda de forma executiva, direta e orientada a decisões. Use apenas os dados acima: se a pergunta exigir algo que não está neles (valores financeiros, indicadores não listados), diga que o dado não está disponível — nunca estime nem invente. Responda em português do Brasil, com Markdown quando útil.`;

// ── Arquivos guardados no projeto ─────────────────────────────────────────────
// Testes de 06/10 (GAPs #7 e #9): o anexo só ia ao modelo na pergunta em que
// foi anexado; nas seguintes virava apenas o nome, e o modelo dizia que nunca
// tinha recebido o arquivo. Agora o app guarda o anexo no Storage do projeto e
// manda só a referência em toda pergunta; a função busca o conteúdo aqui, com
// o token de quem chamou (as regras de acesso do Storage continuam valendo).
interface StoredFileBlock {
  type: "stored_file";
  path: string;
  name: string;
  /** pdf → documento; image → imagem; text → documento de texto (Word, PPT, transcrição). */
  as: "pdf" | "image" | "text";
  media_type?: string;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

/**
 * Cliente do Supabase com o token de quem chamou: as regras de acesso do banco
 * e do Storage valem como se fosse o próprio usuário. Usa a chave pública que
 * o app enviou (sistema novo de chaves); a do ambiente é a antiga e deixa de
 * valer se as chaves antigas forem desligadas.
 */
type UserClient = ReturnType<typeof createClient>;
function userClient(authHeader: string | null, apiKey: string | null): UserClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, apiKey ?? Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: authHeader ? { Authorization: authHeader } : {} },
  });
}

async function resolveStoredFiles(
  messages: { role: "user" | "assistant"; content: string | unknown[] }[],
  supabase: UserClient,
) {
  const hasStored = messages.some((m) =>
    Array.isArray(m.content) && m.content.some((b) => (b as { type?: string })?.type === "stored_file")
  );
  if (!hasStored) return messages;

  const cache = new Map<string, Promise<Blob | null>>();
  const download = (path: string) => {
    if (!cache.has(path)) {
      cache.set(path, supabase.storage.from("project-files").download(path).then(({ data, error }) => {
        if (error) console.error("anexo indisponível:", path, error.message);
        return data ?? null;
      }));
    }
    return cache.get(path)!;
  };

  return Promise.all(messages.map(async (m) => {
    if (!Array.isArray(m.content)) return m;
    const content = await Promise.all(m.content.map(async (b) => {
      const block = b as StoredFileBlock;
      if (block?.type !== "stored_file") return b;
      const blob = await download(block.path);
      // Arquivo removido da aba Documentos: a conversa segue, e o modelo sabe que ele saiu.
      if (!blob) return { type: "text", text: `[Anexo "${block.name}" indisponível: foi removido do projeto.]` };
      if (block.as === "text") {
        return { type: "document", source: { type: "text", media_type: "text/plain", data: await blob.text() }, title: block.name };
      }
      const data = toBase64(new Uint8Array(await blob.arrayBuffer()));
      if (block.as === "pdf") {
        return { type: "document", source: { type: "base64", media_type: "application/pdf", data }, title: block.name };
      }
      return { type: "image", source: { type: "base64", media_type: block.media_type ?? "image/png", data } };
    }));
    return { ...m, content };
  }));
}

// ── Documentos do projeto (04/11) ─────────────────────────────────────────────
// O co-piloto só lia o que fosse anexado na conversa e respondia "não tenho
// acesso à aba Documentos". Agora recebe a lista dos documentos do projeto e
// uma ferramenta para abrir o que precisar, sem ninguém anexar de novo.
interface ProjectDoc {
  id: string;
  code: string; // D1, D2... — o que o modelo usa para pedir o documento
  name: string;
  type: string;
  doc_date: string;
  source: string;
  url: string | null;
  storage_path: string | null;
  mime_type: string | null;
}

const DOC_TYPE_LABEL: Record<string, string> = {
  ata: "ata", cronograma: "cronograma", report: "relatório", entregavel: "entregável", outro: "documento",
};
const DOC_SOURCE_LABEL: Record<string, string> = {
  link: "link do SharePoint", upload: "arquivo enviado", copiloto: "co-piloto",
};

async function loadProjectDocs(supabase: UserClient, projectId: string): Promise<ProjectDoc[]> {
  const { data, error } = await supabase
    .from("documents")
    .select("id, name, type, doc_date, source, url, storage_path, mime_type")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    console.error("documents:", error.message);
    return [];
  }
  // deno-lint-ignore no-explicit-any
  return (data ?? []).map((d: any, i: number) => ({ ...d, code: `D${i + 1}` }));
}

function docsSection(docs: ProjectDoc[]): string {
  if (!docs.length) return "DOCUMENTOS DO PROJETO: nenhum documento na aba Documentos.";
  const lines = docs.map((d) => {
    const readable = d.storage_path ? "" : " — só o link; o conteúdo não pode ser aberto";
    return `- ${d.code} · ${d.name} (${DOC_TYPE_LABEL[d.type] ?? "documento"}, ${d.doc_date}, ${DOC_SOURCE_LABEL[d.source] ?? d.source})${readable}`;
  });
  return `DOCUMENTOS DO PROJETO (aba Documentos, mais recentes primeiro):
${lines.join("\n")}

Você PODE ler esses documentos com a ferramenta ler_documento_do_projeto, informando o código (ex.: D3). Quando a pergunta depender de algo que pode estar num deles — decisões, atas, transcrições, relatórios, entregáveis —, abra os relevantes antes de responder, sem pedir que o usuário anexe. Diga quais documentos consultou. Itens marcados "só o link" estão no SharePoint e não podem ser abertos: nesse caso peça que o usuário anexe o arquivo.`;
}

const READ_DOC_TOOL = {
  name: "ler_documento_do_projeto",
  description:
    "Abre um documento da aba Documentos deste projeto (atas, transcrições, relatórios, PDFs, planilhas exportadas, anexos e respostas salvas do co-piloto) e devolve o conteúdo. Use o código da lista DOCUMENTOS DO PROJETO. Pode ser chamada várias vezes na mesma resposta.",
  input_schema: {
    type: "object",
    properties: { documento: { type: "string", description: "Código do documento na lista, por exemplo D3." } },
    required: ["documento"],
    additionalProperties: false,
  },
};

/** Teto do texto devolvido por documento (~100 mil tokens). */
const MAX_DOC_CHARS = 400_000;
const MAX_TOOL_ROUNDS = 6;

async function extractOfficeText(name: string, bytes: Uint8Array): Promise<string | null> {
  const lower = name.toLowerCase();
  if (lower.endsWith(".docx")) {
    const mammoth = await import("npm:mammoth@1");
    const { Buffer } = await import("node:buffer");
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
    return value;
  }
  if (lower.endsWith(".pptx")) {
    const { default: JSZip } = await import("npm:jszip@3");
    const zip = await JSZip.loadAsync(bytes);
    const slides = Object.keys(zip.files)
      .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
      .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));
    const parts: string[] = [];
    for (const [i, p] of slides.entries()) {
      const xml = await zip.file(p)!.async("string");
      const text = xml.replace(/<\/a:p>/g, "\n").replace(/<a:t>([^<]*)<\/a:t>/g, "$1").replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').trim();
      parts.push(`--- Slide ${i + 1} ---\n${text}`);
    }
    return parts.join("\n\n");
  }
  return null;
}

/**
 * Lê um documento para a ferramenta. Devolve o texto do resultado e, para PDF
 * e imagem, o bloco que vai junto (o modelo lê também o desenho das páginas).
 */
async function readProjectDoc(supabase: UserClient, doc: ProjectDoc): Promise<{ text: string; block?: unknown }> {
  if (!doc.storage_path) {
    return { text: `${doc.code} "${doc.name}" é só um link do SharePoint (${doc.url ?? "sem link"}); o conteúdo não pode ser aberto daqui. Peça ao usuário para anexar o arquivo.` };
  }
  const bucket = supabase.storage.from("project-files");
  const fit = (t: string) =>
    t.length > MAX_DOC_CHARS ? `${t.slice(0, MAX_DOC_CHARS)}\n\n[Documento cortado: mostrados ${MAX_DOC_CHARS.toLocaleString("pt-BR")} de ${t.length.toLocaleString("pt-BR")} caracteres.]` : t;

  // Anexos do co-piloto em Word/PowerPoint/texto já têm o texto extraído ao lado.
  const sidecar = await bucket.download(`${doc.storage_path}.txt`);
  if (sidecar.data) return { text: `Conteúdo de ${doc.code} "${doc.name}":\n\n${fit(await sidecar.data.text())}` };

  const { data, error } = await bucket.download(doc.storage_path);
  if (error || !data) return { text: `Não foi possível abrir ${doc.code} "${doc.name}": ${error?.message ?? "arquivo não encontrado"}.` };

  const mime = doc.mime_type ?? data.type ?? "";
  const lower = doc.name.toLowerCase();
  const bytes = new Uint8Array(await data.arrayBuffer());
  if (mime === "application/pdf" || lower.endsWith(".pdf")) {
    return {
      text: `${doc.code} "${doc.name}" (PDF) está no documento logo abaixo.`,
      block: { type: "document", source: { type: "base64", media_type: "application/pdf", data: toBase64(bytes) }, title: doc.name },
    };
  }
  if (mime.startsWith("image/")) {
    return {
      text: `${doc.code} "${doc.name}" (imagem) está logo abaixo.`,
      block: { type: "image", source: { type: "base64", media_type: mime, data: toBase64(bytes) } },
    };
  }
  try {
    const office = await extractOfficeText(doc.name, bytes);
    if (office !== null) return { text: `Conteúdo de ${doc.code} "${doc.name}":\n\n${fit(office)}` };
  } catch (err) {
    return { text: `Não foi possível extrair o texto de ${doc.code} "${doc.name}": ${err instanceof Error ? err.message : err}.` };
  }
  if (mime.startsWith("text/") || /\.(txt|md|csv|xml|drawio|json|vtt|srt|html?)$/.test(lower)) {
    return { text: `Conteúdo de ${doc.code} "${doc.name}":\n\n${fit(new TextDecoder().decode(bytes))}` };
  }
  return { text: `${doc.code} "${doc.name}" está num formato que não pode ser lido (${mime || "desconhecido"}). Peça ao usuário um PDF ou .docx.` };
}

// ── Handler ───────────────────────────────────────────────────────────────────
// Resposta em streaming, uma linha JSON por evento (NDJSON):
//   {"type":"text","text":"..."}      … trechos da resposta
//   {"type":"status","status":"..."}  … "thinking" enquanto raciocina
//   {"type":"ping"}                   … sinal de vida a cada 5 s
//   {"type":"done","stop_reason":"end_turn","model":"..."}
//      stop_reason "time_limit" = parou perto do limite de tempo; o app continua
//   {"type":"error","error":"..."}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const startedAt = Date.now();

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  let body: {
    // content: texto, ou blocos (imagem, documento, arquivo guardado e texto).
    messages: { role: "user" | "assistant"; content: string | unknown[] }[];
    agentType: "director" | "copilot";
    projectContext?: Record<string, unknown>;
    portfolio?: unknown;
    /** Fichas da Biblioteca disponíveis, para o agente indicar a certa. */
    promptCatalog?: { id: string; title: string; activity: string }[];
    tier?: Tier;
    /** true = NDJSON em streaming; ausente = JSON único (clientes antigos). */
    stream?: boolean;
    /** Etapa de continuação de uma resposta longa (o app emenda as partes). */
    continuation?: boolean;
    /** Projeto do co-piloto: dá acesso aos documentos da aba Documentos. */
    projectId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Corpo da requisição inválido." }, 400);
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "ANTHROPIC_API_KEY não configurada." }, 500);

  const supabase = userClient(req.headers.get("Authorization"), req.headers.get("apikey"));
  let messages: typeof body.messages;
  let docs: ProjectDoc[] = [];
  try {
    [messages, docs] = await Promise.all([
      resolveStoredFiles(body.messages, supabase),
      body.agentType === "copilot" && body.projectId ? loadProjectDocs(supabase, body.projectId) : Promise.resolve([]),
    ]);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 400);
  }

  const tier: Tier = body.tier && body.tier in MODEL_BY_TIER ? body.tier : "T2";
  const model = MODEL_BY_TIER[tier];
  const system = body.agentType === "director"
    ? DIRECTOR_SYSTEM(body.portfolio)
    : `${COPILOT_SYSTEM(body.projectContext, body.promptCatalog)}${body.projectId ? `\n\n${docsSection(docs)}` : ""}`;
  // A ferramenta só existe quando há documento que possa ser aberto.
  const tools = docs.some((d) => d.storage_path) ? [READ_DOC_TOOL] : undefined;

  const client = new Anthropic({ apiKey });
  const encoder = new TextEncoder();

  // Opus 5: fallback automático no servidor caso o modelo recuse a requisição
  // por classificador de segurança — sem isto a resposta pararia vazia.
  const fallbackParams = model === "claude-opus-5"
    ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" }
    : {};
  // Conversa livre (T2) com esforço médio: o raciocínio silencioso no padrão
  // "high" deixava a tela em "Pensando..." por minutos. Fichas T3 mantêm o padrão.
  // Continuação: o conteúdo já foi decidido na etapa anterior, só falta
  // escrever — sem isto cada etapa recomeçava a raciocinar do zero e gastava
  // o tempo dela sem escrever nada (medido em produção em 20/10).
  // Haiku 4.5 (T1) não aceita o parâmetro de esforço.
  const effortParams = tier === "T1"
    ? {}
    : body.continuation
    ? { output_config: { effort: "low" } }
    : tier === "T2"
    ? { output_config: { effort: "medium" } }
    : {};

  // allowTools=false depois de MAX_TOOL_ROUNDS leituras: a ferramenta continua
  // definida (o histórico já tem chamadas a ela), mas o modelo precisa responder.
  const openStream = (convo: typeof messages = messages, allowTools = true) =>
    client.beta.messages.stream({
      model,
      max_tokens: MAX_TOKENS,
      system,
      messages: convo,
      ...(tools ? { tools, ...(allowTools ? {} : { tool_choice: { type: "none" } }) } : {}),
      // Documentos e histórico são reenviados a cada pergunta: com cache, a
      // parte repetida custa ~10% e responde mais rápido.
      cache_control: { type: "ephemeral" },
      ...effortParams,
      ...fallbackParams,
      // deno-lint-ignore no-explicit-any
    } as any);

  // Cliente antigo (sem stream): mesma chamada, resposta acumulada num JSON só.
  // Mantém o app publicado funcionando enquanto o front novo não chega.
  if (!body.stream) {
    try {
      const s = openStream(messages, false);
      let text = "";
      for await (const event of s) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") text += event.delta.text;
      }
      const final = await s.finalMessage();
      return json({ content: text, stop_reason: final.stop_reason, model: final.model });
    } catch (err) {
      console.error("chat error:", err);
      return json({ error: err instanceof Error ? err.message : String(err) }, 500);
    }
  }

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (obj: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
        } catch {
          closed = true; // o navegador desconectou
        }
      };
      let current: ReturnType<typeof openStream> | null = null;
      let timedOut = false;
      let aborted = false;
      const keepalive = setInterval(() => send({ type: "ping" }), KEEPALIVE_MS);
      const budget = setTimeout(() => {
        timedOut = true;
        current?.abort();
      }, Math.max(10_000, TIME_BUDGET_MS - (Date.now() - startedAt)));
      // "Parar" no app fecha a conexão: interrompe a geração e a cobrança.
      req.signal.addEventListener("abort", () => { aborted = true; current?.abort(); });

      try {
        // Cada volta: o modelo responde ou pede para abrir documentos; os
        // documentos pedidos são lidos aqui e a resposta continua.
        let convo = messages;
        let wroteText = false;
        for (let round = 0; ; round++) {
          if (timedOut || aborted) throw new Error("interrompido");
          const s = openStream(convo, round < MAX_TOOL_ROUNDS);
          current = s;
          for await (const event of s) {
            if (event.type === "content_block_start" && event.content_block.type === "thinking") {
              send({ type: "status", status: "thinking" });
            } else if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              wroteText = true;
              send({ type: "text", text: event.delta.text });
            }
          }
          const final = await s.finalMessage();
          if (final.stop_reason !== "tool_use") {
            send({ type: "done", stop_reason: final.stop_reason, model: final.model });
            break;
          }

          // deno-lint-ignore no-explicit-any
          const calls = final.content.filter((b: any) => b.type === "tool_use") as any[];
          const results: unknown[] = [];
          const attachments: unknown[] = [];
          for (const call of calls) {
            const code = String(call.input?.documento ?? "").trim().toUpperCase();
            const doc = docs.find((d) => d.code === code);
            send({ type: "status", status: "reading", document: doc?.name ?? code });
            const read = doc
              ? await readProjectDoc(supabase, doc)
              : { text: `Não existe documento ${code} neste projeto. Use um código da lista DOCUMENTOS DO PROJETO.` };
            results.push({ type: "tool_result", tool_use_id: call.id, content: read.text });
            if ("block" in read && read.block) attachments.push(read.block);
          }
          // Texto antes e depois da leitura vira um parágrafo novo, não uma frase emendada.
          if (wroteText) send({ type: "text", text: "\n\n" });
          convo = [
            ...convo,
            { role: "assistant", content: final.content as unknown[] },
            { role: "user", content: [...results, ...attachments] },
          ];
        }
      } catch (err) {
        if (timedOut) {
          send({ type: "done", stop_reason: "time_limit", model });
        } else {
          console.error("chat stream error:", err);
          send({ type: "error", error: err instanceof Error ? err.message : String(err) });
        }
      } finally {
        clearInterval(keepalive);
        clearTimeout(budget);
        if (!closed) controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { ...corsHeaders, "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache" },
  });
});

