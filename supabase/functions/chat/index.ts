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
// (150 s no gratuito): gerar um fluxograma de 60 mil caracteres leva vários
// minutos, a função morria no meio e a tela mostrava "A conexão caiu".
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
- Documentos — documentos do projeto: links do SharePoint e os arquivos anexados no co-piloto.
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
- Nunca diga que não consegue abrir ou ler anexos. Se o usuário citar um arquivo que não está na conversa, diga que esse arquivo específico não chegou e peça para anexá-lo de novo pelo botão "Anexar".
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

async function resolveStoredFiles(
  messages: { role: "user" | "assistant"; content: string | unknown[] }[],
  authHeader: string | null,
) {
  const hasStored = messages.some((m) =>
    Array.isArray(m.content) && m.content.some((b) => (b as { type?: string })?.type === "stored_file")
  );
  if (!hasStored) return messages;

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: authHeader ? { Authorization: authHeader } : {} },
  });
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
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Corpo da requisição inválido." }, 400);
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "ANTHROPIC_API_KEY não configurada." }, 500);

  let messages: typeof body.messages;
  try {
    messages = await resolveStoredFiles(body.messages, req.headers.get("Authorization"));
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 400);
  }

  const tier: Tier = body.tier && body.tier in MODEL_BY_TIER ? body.tier : "T2";
  const model = MODEL_BY_TIER[tier];
  const system = body.agentType === "director"
    ? DIRECTOR_SYSTEM(body.portfolio)
    : COPILOT_SYSTEM(body.projectContext, body.promptCatalog);

  const client = new Anthropic({ apiKey });
  const encoder = new TextEncoder();

  // Opus 5: fallback automático no servidor caso o modelo recuse a requisição
  // por classificador de segurança — sem isto a resposta pararia vazia.
  const fallbackParams = model === "claude-opus-5"
    ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" }
    : {};
  // Conversa livre (T2) com esforço médio: o raciocínio silencioso no padrão
  // "high" deixava a tela em "Pensando..." por minutos. Fichas T3 mantêm o padrão.
  const effortParams = tier === "T2" ? { output_config: { effort: "medium" } } : {};

  const openStream = () =>
    client.beta.messages.stream({
      model,
      max_tokens: MAX_TOKENS,
      system,
      messages,
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
      const s = openStream();
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
      const s = openStream();
      let timedOut = false;
      const keepalive = setInterval(() => send({ type: "ping" }), KEEPALIVE_MS);
      const budget = setTimeout(() => {
        timedOut = true;
        s.abort();
      }, Math.max(10_000, TIME_BUDGET_MS - (Date.now() - startedAt)));
      // "Parar" no app fecha a conexão: interrompe a geração e a cobrança.
      req.signal.addEventListener("abort", () => s.abort());

      try {
        for await (const event of s) {
          if (event.type === "content_block_start" && event.content_block.type === "thinking") {
            send({ type: "status", status: "thinking" });
          } else if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            send({ type: "text", text: event.delta.text });
          }
        }
        const final = await s.finalMessage();
        send({ type: "done", stop_reason: final.stop_reason, model: final.model });
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

