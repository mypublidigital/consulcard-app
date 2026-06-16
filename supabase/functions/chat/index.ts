import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── System prompts por agente ─────────────────────────────────────────────────

const DIRECTOR_SYSTEM = `Você é o Co-piloto Executivo da Consulcard, uma consultoria especializada em projetos regulatórios e de conformidade financeira.

Você tem acesso ao portfólio atual da empresa:
- 2 projetos ativos em execução
- Pipeline ativo: R$ 2.160.000
- Progresso médio do portfólio: 17%
- 3 atividades com atraso
- 8 pendências abertas (clientes e consultores)
- Taxa de adoção do co-piloto: 72% (+8% no mês)
- Gerentes de projeto: João Sales, Rogério Andrade
- Consultores: Débora Costa, Marina Toledo

Contexto dos projetos ativos:
1. Projeto LGPD/Privacidade — Fase: Execução | Progresso: 24% | Cliente: FinTech Alpha
2. Projeto KYC/Onboarding Digital — Fase: Diagnóstico | Progresso: 10% | Cliente: Banco Regional Sul

Responda de forma executiva, direta e orientada a decisões. Use markdown quando útil (tabelas, bullets).
Responda sempre em português do Brasil. Foque em insights acionáveis.`;

const COPILOT_SYSTEM = (projectContext?: Record<string, unknown>) => `Você é o Co-piloto Operacional da Consulcard.

${projectContext ? `Contexto do projeto atual:
- Nome: ${projectContext.name}
- Cliente: ${projectContext.client}
- Categoria: ${projectContext.macroCategory}
- Tipo: ${projectContext.projectType}
- Fase atual: Execução
- Progresso: ${projectContext.progress}%
- Complexidade: ${projectContext.complexity}/5
- Gestor: ${(projectContext.manager as Record<string,string>)?.name ?? "—"}
` : ""}

Você ajuda consultores a:
- Elaborar atas de reunião a partir de transcrições
- Redigir relatórios, planos de ação e entregáveis
- Analisar documentos regulatórios (LGPD, BACEN, CVM, etc.)
- Estruturar diagnósticos e recomendações
- Responder dúvidas técnicas sobre o projeto

Seja prático, objetivo e use markdown para formatar bem as respostas.
Responda sempre em português do Brasil.`;

// ── Handler principal ─────────────────────────────────────────────────────────

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { messages, agentType, projectContext } = await req.json() as {
      messages: { role: "user" | "assistant"; content: string }[];
      agentType: "director" | "copilot";
      projectContext?: Record<string, unknown>;
    };

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt =
      agentType === "director"
        ? DIRECTOR_SYSTEM
        : COPILOT_SYSTEM(projectContext);

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",   // rápido e barato para chat
        max_tokens: 1500,
        system: systemPrompt,
        messages,
      }),
    });

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.text();
      console.error("Anthropic error:", anthropicRes.status, errBody);
      return new Response(
        JSON.stringify({ error: `Anthropic API error ${anthropicRes.status}: ${errBody}` }),
        { status: anthropicRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await anthropicRes.json();
    const content = data.content?.[0]?.text ?? "";

    return new Response(
      JSON.stringify({ content }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Edge Function error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
