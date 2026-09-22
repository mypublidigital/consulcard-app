import { memo, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Upload, Loader2, Sparkles, FileText, ChevronRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { DATA_PROTOCOL, PROMPTS, withDataProtocol } from "@/mocks/prompts";
import { COPILOT_INITIAL_MESSAGES } from "@/mocks/copilot";
import { sendChatMessage, type ChatMessage } from "@/lib/chat";
import type { Project, ProjectPhase, PromptDef } from "@/types";

interface Message {
  role: "user" | "assistant";
  content: string;
  attachment?: string;
}

const PHASES: { id: ProjectPhase; label: string }[] = [
  { id: "planejamento", label: "Planejamento" },
  { id: "diagnostico", label: "Diagnóstico" },
  { id: "execucao", label: "Execução" },
  { id: "validacao", label: "Validação" },
  { id: "entrega", label: "Entrega" },
];

export function CopilotTab({ project }: { project: Project }) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const [messages, setMessages] = useState<ChatMessage[]>(COPILOT_INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Prompt da biblioteca carregado no campo: o envio anexa o PD.0 e (no backend)
  // escolhe o modelo pelo tier da ficha.
  const [activePrompt, setActivePrompt] = useState<PromptDef | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const currentPhase: ProjectPhase = "execucao";

  // Campo cresce com o texto até ~10 linhas e passa a rolar (item 11).
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }, [input]);

  function loadPrompt(p: PromptDef) {
    // Antes só o título ia para o campo, então o agente nunca via o prompt (item 14).
    setActivePrompt(p);
    setInput(p.body);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  const phasePrompts = useMemo(
    () =>
      PROMPTS.filter((p) => {
        // Prompts ainda não reescritos (R2/R4) não são oferecidos para uso.
        if (p.status === "pending") return false;
        if (p.macroCategories) return p.macroCategories.includes(project.macroCategory);
        return p.macroCategory === project.macroCategory || p.macroCategory === "all";
      }).slice(0, 6),
    [project]
  );

  const projectContext = {
    name: project.name,
    client: project.client,
    macroCategory: project.macroCategory,
    projectType: project.projectType,
    progress: project.progress,
    complexity: project.complexity,
    manager: project.manager,
  };

  async function send(text: string) {
    if (!text.trim() || loading) return;
    const prompt = activePrompt;
    // Regra da biblioteca: prompt vindo da ficha segue com o PD.0 anexado.
    const content = prompt ? withDataProtocol(text) : text;
    const userMsg: ChatMessage = { role: "user", content };
    const previous = messages;
    const history = [...previous, userMsg];
    setMessages(history);
    setInput("");
    setActivePrompt(null);
    setLoading(true);
    setError("");

    try {
      const reply = await sendChatMessage(history, {
        agentType: "copilot",
        projectContext,
        tier: prompt?.tier,
      });
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (err) {
      // Tira a mensagem que falhou do histórico e devolve o texto ao campo.
      // Antes ela ficava presa e era reenviada em toda tentativa seguinte.
      setMessages(previous);
      setInput(text);
      setActivePrompt(prompt);
      setError(err instanceof Error ? err.message : "Erro ao contactar o co-piloto.");
    } finally {
      setLoading(false);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text().catch(() => "");
    const content = text
      ? `Transcrição de reunião — **${file.name}**:\n\n${text.slice(0, 8000)}`
      : `Upload de transcrição: **${file.name}** (conteúdo não legível)`;

    const userMsg: ChatMessage = { role: "user", content };
    const history = [...messages, userMsg];
    setMessages(history);
    setLoading(true);
    setError("");

    try {
      const reply = await sendChatMessage(history, { agentType: "copilot", projectContext });
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao processar transcrição.");
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
      {/* Chat */}
      <Card className="flex flex-col h-[calc(100vh-340px)] min-h-[520px]">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-brand-primary" />
            <span className="text-sm font-semibold">Co-piloto do projeto</span>
          </div>
          <Badge tone="green" size="sm">Online</Badge>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((m, i) => (
            <MessageBubble key={i} message={m} />
          ))}
          {loading && (
            <div className="flex items-start gap-3">
              <div className="h-7 w-7 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center">
                <Sparkles size={14} />
              </div>
              <div className="flex-1">
                <div className="text-xs text-text-faint mb-1">Co-piloto</div>
                <div className="rounded-lg border border-border bg-surface px-4 py-3 flex items-center gap-2 text-sm text-text-muted">
                  <Loader2 size={14} className="animate-spin text-brand-primary" />
                  <span className="animate-pulse-soft">Pensando...</span>
                </div>
              </div>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-accent-red/10 border border-accent-red/20 px-4 py-3 text-xs text-accent-red">
              <AlertCircle size={13} className="shrink-0" />
              {error}
            </div>
          )}
        </div>

        <div className="border-t border-border p-3">
          {activePrompt && (
            <div className="mb-2 flex items-start justify-between gap-2 rounded-md border border-brand-primary/20 bg-brand-primary/5 px-3 py-2 text-[11px]">
              <div className="text-text-primary">
                <span className="font-semibold">Prompt {activePrompt.id} carregado</span>
                {activePrompt.tier && <span className="text-text-muted"> · {activePrompt.tier}</span>}
                <span className="text-text-muted"> — substitua os campos entre [colchetes] antes de enviar. O PD.0 é anexado no envio.</span>
                {activePrompt.insumos && (
                  <div className="mt-0.5 text-text-faint">Insumos: {activePrompt.insumos}</div>
                )}
              </div>
              <button
                onClick={() => { setActivePrompt(null); setInput(""); }}
                className="shrink-0 text-text-faint hover:text-text-primary"
                title="Descartar prompt"
              >
                ✕
              </button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <input ref={fileRef} type="file" accept=".txt,.docx,.md" className="hidden" onChange={handleFile} />
            <Button
              variant="secondary"
              size="md"
              leftIcon={<Upload size={14} />}
              onClick={() => fileRef.current?.click()}
              title="Fazer upload de transcrição"
            >
              Transcrição
            </Button>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                if (!e.target.value) setActivePrompt(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Pergunte algo ao co-piloto ou cole uma transcrição..."
              rows={1}
              className="flex-1 resize-none overflow-y-auto rounded-md border border-border bg-white px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
            />
            <Button onClick={() => send(input)} disabled={!input.trim() || loading} leftIcon={<Send size={14} />}>
              Enviar
            </Button>
          </div>
        </div>
      </Card>

      {/* Side: phases + prompts */}
      <div className="space-y-4">
        <Card>
          <div className="p-4">
            <div className="text-[11px] uppercase tracking-wider text-text-faint mb-3">Fase atual</div>
            <div className="flex items-center gap-1 text-xs">
              {PHASES.map((p, i) => {
                const reached = PHASES.findIndex((x) => x.id === currentPhase) >= i;
                const active = p.id === currentPhase;
                return (
                  <div key={p.id} className="flex items-center gap-1">
                    <span
                      className={cn(
                        "rounded-full px-2 py-1 text-[10px] font-medium",
                        active && "bg-brand-primary text-white",
                        !active && reached && "bg-brand-primary/10 text-brand-primary",
                        !reached && "bg-[#F0EDE6] text-text-faint"
                      )}
                    >
                      {p.label}
                    </span>
                    {i < PHASES.length - 1 && <ChevronRight size={10} className="text-text-faint" />}
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        <Card>
          <div className="px-4 py-3 border-b border-border">
            <div className="text-sm font-semibold text-text-primary">Prompts para esta fase</div>
            <div className="text-[11px] text-text-faint">Clique para injetar no input</div>
          </div>
          <div className="divide-y divide-border max-h-80 overflow-y-auto">
            {phasePrompts.map((p) => (
              <button
                key={p.id}
                onClick={() => loadPrompt(p)}
                className="w-full text-left px-4 py-3 hover:bg-surface"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-medium text-text-primary leading-snug">{p.title}</span>
                  {p.tier && (
                    <Badge tone={p.tier === "T3" ? "purple" : p.tier === "T2" ? "blue" : "neutral"} size="sm">
                      {p.tier}
                    </Badge>
                  )}
                </div>
                <div className="text-[10px] text-text-faint mt-1">{p.activityLabel}</div>
              </button>
            ))}
            {phasePrompts.length === 0 && (
              <div className="px-4 py-6 text-xs text-text-faint text-center">Sem prompts para esta fase.</div>
            )}
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <div className="text-[11px] uppercase tracking-wider text-text-faint mb-2">Último artefato</div>
            <a href="#" className="flex items-center gap-2 text-sm text-brand-primary hover:underline">
              <FileText size={14} />
              Ata de reunião — 28/04/2026
            </a>
            <div className="text-[10px] text-text-faint mt-1">gerado pelo co-piloto · 12 KB</div>
          </div>
        </Card>
      </div>
    </div>
  );
}

/** Mensagens do usuário maiores que isto (ex: transcrição colada) aparecem recolhidas. */
const COLLAPSE_AT = 1200;

// memo: sem isto, cada tecla digitada no campo redesenha o histórico inteiro e
// reprocessa o Markdown de todas as mensagens — com uma transcrição longa no
// histórico, a digitação trava (item 17).
const MessageBubble = memo(function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const [expanded, setExpanded] = useState(false);
  // O PD.0 vai para o modelo, mas não é exibido — só sinalizado.
  const withProtocol = isUser && message.content.endsWith(DATA_PROTOCOL);
  const text = withProtocol
    ? message.content.slice(0, -DATA_PROTOCOL.length).replace(/\n\n---\n\n$/, "")
    : message.content;
  const isLong = isUser && text.length > COLLAPSE_AT;
  const shown = isLong && !expanded ? text.slice(0, COLLAPSE_AT) + "…" : text;
  return (
    <div className={cn("flex items-start gap-3", isUser && "flex-row-reverse")}>
      {isUser ? (
        <Avatar initials={useAuthStore.getState().currentUser?.initials ?? "??"} size="sm" tone="brand" />
      ) : (
        <div className="h-7 w-7 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
          <Sparkles size={14} />
        </div>
      )}
      <div className={cn("max-w-[85%]", isUser && "items-end")}>
        <div className={cn("text-xs text-text-faint mb-1", isUser && "text-right")}>
          {isUser ? "Você" : "Co-piloto"}
        </div>
        <div
          className={cn(
            "rounded-lg border px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "bg-brand-primary text-white border-brand-primary"
              : "bg-white border-border text-text-primary"
          )}
        >
          {isUser ? (
            <>
              {/* Texto do usuário vai como texto puro, com quebras de linha preservadas. */}
              <div className="whitespace-pre-wrap break-words">{shown}</div>
              {isLong && (
                <button
                  onClick={() => setExpanded((v) => !v)}
                  className="mt-2 text-[11px] underline text-white/80 hover:text-white"
                >
                  {expanded
                    ? "Recolher"
                    : `Ver tudo (${text.length.toLocaleString("pt-BR")} caracteres)`}
                </button>
              )}
              {withProtocol && (
                <div className="mt-2 text-[10px] text-white/70">+ Protocolo de Dados (PD.0) anexado</div>
              )}
            </>
          ) : (
            <div className="prose-sm max-w-none">
              <ReactMarkdown
                components={{
                  h2: ({ children }) => <h2 className="text-sm font-semibold mt-3 mb-1.5">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-xs font-semibold mt-2 mb-1 uppercase tracking-wide text-text-muted">{children}</h3>,
                  p: ({ children }) => <p className="m-0 mb-1.5 last:mb-0">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc pl-5 my-1.5 space-y-0.5">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-5 my-1.5 space-y-0.5">{children}</ol>,
                  li: ({ children }) => <li>{children}</li>,
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                  em: ({ children }) => <em className="italic">{children}</em>,
                  table: ({ children }) => <table className="w-full text-xs border-collapse my-2">{children}</table>,
                  th: ({ children }) => <th className="border border-border bg-surface px-2 py-1 text-left font-medium">{children}</th>,
                  td: ({ children }) => <td className="border border-border px-2 py-1">{children}</td>,
                  code: ({ children }) => <code className="font-mono bg-[#F0EDE6] px-1 py-0.5 rounded text-[11px]">{children}</code>,
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
