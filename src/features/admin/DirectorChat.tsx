import { useRef, useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Sparkles, Loader2, Crown } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { DIRECTOR_REPLIES, DIRECTOR_SUGGESTIONS } from "@/mocks/admin";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const INITIAL: Message[] = [
  {
    role: "assistant",
    content:
      "Olá, diretor. Posso responder sobre status de projetos, cycle time, adoção do co-piloto, performance por consultor ou qualquer indicador do portfólio. O que quer saber?",
  },
];

export function DirectorChat() {
  const [messages, setMessages] = useState<Message[]>(INITIAL);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function send(text: string) {
    if (!text.trim()) return;
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setLoading(true);
    setTimeout(() => {
      const matched = Object.keys(DIRECTOR_REPLIES).find((k) => text.includes(k));
      const reply = matched ? DIRECTOR_REPLIES[matched] : DIRECTOR_REPLIES.default;
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
      setLoading(false);
    }, 1400);
  }

  return (
    <Card className="flex flex-col h-[640px]">
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-brand-primary text-white flex items-center justify-center">
            <Crown size={14} />
          </div>
          <div>
            <div className="text-sm font-semibold">Co-piloto Executivo</div>
            <div className="text-[10px] text-text-faint">portfólio · KPIs · co-piloto operacional</div>
          </div>
        </div>
        <Badge tone="green" size="sm">Online</Badge>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((m, i) => (
          <Bubble key={i} message={m} />
        ))}
        {loading && (
          <div className="flex items-start gap-3">
            <div className="h-7 w-7 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center">
              <Sparkles size={14} />
            </div>
            <div className="flex-1">
              <div className="rounded-lg border border-border bg-surface px-4 py-3 flex items-center gap-2 text-sm text-text-muted">
                <Loader2 size={14} className="animate-spin text-brand-primary" />
                <span className="animate-pulse-soft">Cruzando dados do portfólio...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {messages.length <= 2 && (
        <div className="px-5 py-3 border-t border-border">
          <div className="text-[10px] uppercase tracking-wider text-text-faint mb-2">Perguntas sugeridas</div>
          <div className="flex flex-wrap gap-1.5">
            {DIRECTOR_SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                disabled={loading}
                className="text-[11px] rounded-full border border-border bg-white px-3 py-1.5 hover:border-brand-primary hover:bg-brand-primary/5 text-text-muted hover:text-brand-primary"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Pergunte sobre status, riscos, adoção do co-piloto..."
            rows={1}
            className="flex-1 resize-none rounded-md border border-border bg-white px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
          />
          <Button onClick={() => send(input)} disabled={!input.trim() || loading} leftIcon={<Send size={14} />}>
            Enviar
          </Button>
        </div>
      </div>
    </Card>
  );
}

function Bubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex items-start gap-3", isUser && "flex-row-reverse")}>
      {isUser ? (
        <Avatar initials="DR" size="sm" tone="brand" />
      ) : (
        <div className="h-7 w-7 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
          <Sparkles size={14} />
        </div>
      )}
      <div className={cn("max-w-[88%]", isUser && "items-end")}>
        <div className={cn("text-[10px] text-text-faint mb-1", isUser && "text-right")}>
          {isUser ? "Diretor" : "Co-piloto Executivo"}
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
            message.content
          ) : (
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="m-0 mb-1.5 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-5 my-1.5 space-y-0.5">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-5 my-1.5 space-y-0.5">{children}</ol>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                table: ({ children }) => <table className="w-full text-xs border-collapse my-2">{children}</table>,
                th: ({ children }) => <th className="border border-border bg-surface px-2 py-1 text-left font-medium">{children}</th>,
                td: ({ children }) => <td className="border border-border px-2 py-1">{children}</td>,
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>
      </div>
    </div>
  );
}
