import { useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Upload, Loader2, Sparkles, FileText, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { CURRENT_USER } from "@/mocks/users";
import { PROMPTS } from "@/mocks/prompts";
import { COPILOT_INITIAL_MESSAGES, COPILOT_QUICK_REPLIES, COPILOT_TRANSCRIPT_RESPONSE } from "@/mocks/copilot";
import type { Project, ProjectPhase } from "@/types";

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
  const [messages, setMessages] = useState<Message[]>(COPILOT_INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const currentPhase: ProjectPhase = "execucao";

  const phasePrompts = useMemo(
    () =>
      PROMPTS.filter(
        (p) => p.macroCategory === project.macroCategory || p.macroCategory === "all"
      ).slice(0, 6),
    [project]
  );

  function send(text: string) {
    if (!text.trim()) return;
    const userMsg: Message = { role: "user", content: text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);
    setTimeout(() => {
      const matched = Object.keys(COPILOT_QUICK_REPLIES).find((k) => text.includes(k));
      const reply = matched ? COPILOT_QUICK_REPLIES[matched] : COPILOT_QUICK_REPLIES.default;
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
      setLoading(false);
    }, 1200);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMessages((m) => [
      ...m,
      { role: "user", content: `Upload de transcrição: **${file.name}**`, attachment: file.name },
    ]);
    setLoading(true);
    setTimeout(() => {
      setMessages((m) => [...m, { role: "assistant", content: COPILOT_TRANSCRIPT_RESPONSE }]);
      setLoading(false);
    }, 2000);
    if (fileRef.current) fileRef.current.value = "";
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
                  <span className="animate-pulse-soft">Analisando reunião...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border p-3">
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
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Pergunte algo ao co-piloto ou cole uma transcrição..."
              rows={1}
              className="flex-1 resize-none rounded-md border border-border bg-white px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
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
                onClick={() => setInput(p.title)}
                className="w-full text-left px-4 py-3 hover:bg-surface"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-medium text-text-primary leading-snug">{p.title}</span>
                  <Badge tone={p.kind === "specialist" ? "blue" : "neutral"} size="sm">
                    {p.kind === "specialist" ? "Especialista" : "Generalista"}
                  </Badge>
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

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex items-start gap-3", isUser && "flex-row-reverse")}>
      {isUser ? (
        <Avatar initials={CURRENT_USER.initials} size="sm" tone="brand" />
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
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="m-0">{children}</p>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              }}
            >
              {message.content}
            </ReactMarkdown>
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
}
