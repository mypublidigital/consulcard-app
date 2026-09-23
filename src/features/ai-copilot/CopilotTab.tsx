import { memo, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Upload, Loader2, Sparkles, FileText, ChevronRight, AlertCircle, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { useProjectsStore } from "@/store/projects-store";
import { DATA_PROTOCOL, PROMPTS, withDataProtocol } from "@/mocks/prompts";
import { COPILOT_INITIAL_MESSAGES } from "@/mocks/copilot";
import { sendChatMessage, type ApiMessage, type ChatMessage } from "@/lib/chat";
import { IMAGE_ACCEPT, MAX_IMAGES_PER_MESSAGE, toImageAttachment } from "@/lib/images";
import { attachmentBlocks, readPptxText, toPdfAttachment, type Attachment } from "@/lib/attachments";
import { appendCopilotExchange, loadCopilotHistory } from "@/lib/copilot-history";
import { downloadBlob, downloadText, extractDrawio, safeFilename } from "@/lib/download";
import {
  TRANSCRIPT_ACCEPT, TRANSCRIPT_CHUNK_CHARS, consolidatePrompt, partPrompt, readTranscriptFile, splitTranscript,
} from "@/lib/transcript";
import { dropDuplicateTitle, guessTitle, markdownToBlocks } from "@/lib/export/blocks";
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

export function CopilotTab({
  project,
  initialPromptId,
  onPromptConsumed,
}: {
  project: Project;
  /** Prompt escolhido na Biblioteca via "Usar em projeto" (item 15). */
  initialPromptId?: string | null;
  onPromptConsumed?: () => void;
}) {
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
  const [historyLoading, setHistoryLoading] = useState(true);
  // Resposta em construção (streaming) e se a última foi cortada pelo limite.
  const [streamingText, setStreamingText] = useState("");
  const [truncated, setTruncated] = useState(false);
  /** Etapa atual de uma tarefa longa (transcrição em partes). */
  const [progress, setProgress] = useState("");
  // Anexos aguardando envio: imagens (item 2) e PDFs (pedido na reunião de 17/09).
  const [images, setImages] = useState<Attachment[]>([]);
  const imageRef = useRef<HTMLInputElement>(null);

  async function addImages(files: File[]) {
    const room = MAX_IMAGES_PER_MESSAGE - images.length;
    if (room <= 0) {
      setError(`No máximo ${MAX_IMAGES_PER_MESSAGE} anexos por mensagem.`);
      return;
    }
    setError("");
    const added: Attachment[] = [];
    for (const f of files.slice(0, room)) {
      try {
        const name = f.name || "arquivo";
        if (f.type.startsWith("image/")) {
          added.push({ ...(await toImageAttachment(f, name)), kind: "image" });
        } else if (f.type === "application/pdf" || name.toLowerCase().endsWith(".pdf")) {
          // PDF vai inteiro ao modelo: ele lê texto, tabelas e layout.
          added.push(await toPdfAttachment(f));
        } else if (name.toLowerCase().endsWith(".pptx")) {
          // O modelo não abre .pptx: extraímos o texto dos slides aqui.
          const text = await readPptxText(f);
          await send(`Conteúdo da apresentação — ${name}:\n\n${text}`);
          return;
        } else {
          throw new Error(`"${name}": formato não suportado aqui. Use o botão Transcrição para .txt, .md, .docx, .vtt e .srt.`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível anexar o arquivo.");
      }
    }
    if (added.length) setImages((cur) => [...cur, ...added]);
    if (files.length > room) setError(`Só os primeiros ${room} anexos foram aceitos (limite de ${MAX_IMAGES_PER_MESSAGE}).`);
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const files = Array.from(e.clipboardData.items)
      .filter((it) => it.kind === "file" && it.type.startsWith("image/"))
      .map((it) => it.getAsFile())
      .filter((f): f is File => !!f);
    if (files.length === 0) return; // texto comum: deixa colar normalmente
    e.preventDefault();
    addImages(files);
  }
  const activities = useProjectsStore((s) => s.activitiesByProject[project.id] ?? []);
  const pendencies = useProjectsStore((s) => s.pendencies);

  // Carrega o histórico gravado do projeto (itens 1 e 12). A saudação inicial
  // só aparece em projeto sem conversa e não é gravada.
  useEffect(() => {
    let cancelled = false;
    setHistoryLoading(true);
    loadCopilotHistory(project.id)
      .then((saved) => {
        if (!cancelled) setMessages(saved.length > 0 ? saved : COPILOT_INITIAL_MESSAGES);
      })
      .catch((err) => {
        if (!cancelled) {
          setMessages(COPILOT_INITIAL_MESSAGES);
          setError(`Não foi possível carregar o histórico: ${err instanceof Error ? err.message : err}`);
        }
      })
      .finally(() => { if (!cancelled) setHistoryLoading(false); });
    return () => { cancelled = true; };
  }, [project.id]);

  // Campo cresce com o texto até ~10 linhas e passa a rolar (item 11).
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }, [input]);

  // Prompt vindo da Biblioteca: carrega no campo depois que o histórico abrir.
  useEffect(() => {
    if (!initialPromptId || historyLoading) return;
    const p = PROMPTS.find((x) => x.id === initialPromptId && x.status === "ready");
    if (p) loadPrompt(p);
    onPromptConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPromptId, historyLoading]);

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

  /** Catálogo enxuto das fichas prontas, para o agente indicar a adequada. */
  const promptCatalog = useMemo(
    () =>
      PROMPTS.filter((p) => p.status === "ready").map((p) => ({
        id: p.id,
        title: p.title,
        activity: p.activityLabel,
      })),
    []
  );

  // Contexto real do projeto: o agente só conhece o que vier aqui.
  const projectContext = {
    name: project.name,
    client: project.client,
    macroCategory: project.macroCategory,
    projectType: project.projectType,
    status: project.status,
    progress: project.progress,
    complexity: project.complexity,
    startDate: project.startDate,
    targetEndDate: project.targetEndDate,
    managerName: project.manager?.name,
    consultantNames: project.consultants.map((c) => c.name),
    activities: activities.slice(0, 40).map((a) => ({
      label: a.label,
      status: a.status ?? "todo",
      assignee: a.assignee?.name,
      dueDate: a.dueDate,
    })),
    openPendencies: pendencies
      .filter((p) => p.projectId === project.id && p.status === "open")
      .slice(0, 20)
      .map((p) => ({ description: p.description, owner: p.owner.name, dueDate: p.dueDate })),
  };

  async function send(rawText: string) {
    const attached = images;
    if ((!rawText.trim() && attached.length === 0) || loading) return;
    const text = rawText.trim() ? rawText : "Analise a(s) imagem(ns) anexada(s).";
    const prompt = activePrompt;
    // Transcrição colada no campo também é dividida, como a enviada por arquivo (item 18).
    if (!prompt && attached.length === 0 && text.length > TRANSCRIPT_CHUNK_CHARS) {
      setInput("");
      await processLongTranscript("texto colado", text, splitTranscript(text));
      return;
    }
    // Regra da biblioteca: prompt vindo da ficha segue com o PD.0 anexado.
    const content = prompt ? withDataProtocol(text) : text;
    // No histórico (tela e banco) a imagem vira uma marcação: ela só é enviada
    // ao modelo nesta pergunta — reenviá-la a cada turno multiplicaria o custo.
    const marker = attached.length
      ? `\n\n[${attached.length === 1 ? "anexo" : `${attached.length} anexos`}: ${attached.map((a) => a.name).join(", ")}]`
      : "";
    const userMsg: ChatMessage = { role: "user", content: content + marker };
    const previous = messages;
    const history = [...previous, userMsg];
    setMessages(history);
    setInput("");
    setActivePrompt(null);
    setImages([]);
    setLoading(true);
    setError("");
    setTruncated(false);
    setStreamingText("");

    const askedAt = new Date();
    // Atualiza a tela no máximo uma vez por quadro durante o streaming.
    let pendingText = "";
    let frame = 0;
    try {
      const apiHistory: ApiMessage[] = trimHistory(history);
      if (attached.length) {
        // A pergunta atual vai com as imagens em blocos, antes do texto.
        apiHistory[apiHistory.length - 1] = {
          role: "user",
          content: [...attachmentBlocks(attached), { type: "text" as const, text: content }],
        };
      }
      const result = await sendChatMessage(apiHistory, {
        agentType: "copilot",
        projectContext,
        // Sem a ficha carregada, o agente indica a da Biblioteca que serve ao pedido.
        promptCatalog: prompt ? undefined : promptCatalog,
        tier: prompt?.tier,
        onText: (t) => {
          pendingText = t;
          if (!frame) frame = requestAnimationFrame(() => { frame = 0; setStreamingText(pendingText); });
        },
      });
      cancelAnimationFrame(frame);
      setStreamingText("");
      const reply = result.content;
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
      // Cortada pelo limite: avisa e oferece continuar (item 8).
      if (result.stopReason === "max_tokens") setTruncated(true);

      if (currentUser?.id) {
        appendCopilotExchange(project.id, currentUser.id, { content: userMsg.content, at: askedAt }, { content: reply, at: new Date() })
          .catch((e) =>
            setError(`A resposta chegou, mas não foi salva no histórico: ${e instanceof Error ? e.message : e}`)
          );
      }
    } catch (err) {
      cancelAnimationFrame(frame);
      setStreamingText("");
      // Tira a mensagem que falhou do histórico e devolve o texto ao campo.
      // Antes ela ficava presa e era reenviada em toda tentativa seguinte.
      setMessages(previous);
      setInput(rawText);
      setActivePrompt(prompt);
      setImages(attached);
      setError(err instanceof Error ? err.message : "Erro ao contactar o co-piloto.");
    } finally {
      setLoading(false);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (fileRef.current) fileRef.current.value = "";
    setError("");

    let text: string;
    try {
      text = await readTranscriptFile(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Não foi possível ler "${file.name}".`);
      return;
    }
    if (!text) {
      setError(`"${file.name}" está vazio ou não pôde ser lido.`);
      return;
    }

    const parts = splitTranscript(text);
    if (parts.length === 1) {
      // Cabe numa chamada: vai inteira. Antes era cortada em 8.000 caracteres.
      await send(`Transcrição de reunião — ${file.name}:\n\n${text}`);
    } else {
      await processLongTranscript(file.name, text, parts);
    }
  }

  /**
   * Transcrição longa demais para uma chamada (item 18): cada parte é lida em
   * separado, extraindo decisões, pendências e riscos; depois os extratos são
   * consolidados numa ata. Só a ata final entra no histórico da conversa.
   */
  async function processLongTranscript(fileName: string, text: string, parts: string[]) {
    if (loading) return;
    const summary = `Transcrição de reunião — ${fileName} (${text.length.toLocaleString("pt-BR")} caracteres, processada em ${parts.length} partes)`;
    const previous = messages;
    setMessages([...previous, { role: "user", content: summary }]);
    setLoading(true);
    setTruncated(false);
    const askedAt = new Date();
    try {
      const extracts: string[] = [];
      for (let i = 0; i < parts.length; i++) {
        setProgress(`Lendo a parte ${i + 1} de ${parts.length} da transcrição…`);
        const r = await sendChatMessage(
          [{ role: "user", content: partPrompt(fileName, i + 1, parts.length, parts[i]) }],
          { agentType: "copilot", projectContext }
        );
        extracts.push(r.content);
      }
      setProgress("Consolidando a ata…");
      let pendingText = "";
      let frame = 0;
      const final = await sendChatMessage(
        [{ role: "user", content: consolidatePrompt(fileName, extracts) }],
        {
          agentType: "copilot",
          projectContext,
          onText: (t) => {
            pendingText = t;
            if (!frame) frame = requestAnimationFrame(() => { frame = 0; setStreamingText(pendingText); });
          },
        }
      );
      cancelAnimationFrame(frame);
      setStreamingText("");
      setMessages((m) => [...m, { role: "assistant", content: final.content }]);
      if (final.stopReason === "max_tokens") setTruncated(true);
      if (currentUser?.id) {
        appendCopilotExchange(project.id, currentUser.id, { content: summary, at: askedAt }, { content: final.content, at: new Date() })
          .catch((e) => setError(`A ata foi gerada, mas não foi salva no histórico: ${e instanceof Error ? e.message : e}`));
      }
    } catch (err) {
      setStreamingText("");
      setMessages(previous);
      setError(`Falha ao processar a transcrição: ${err instanceof Error ? err.message : err}`);
    } finally {
      setProgress("");
      setLoading(false);
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
          {historyLoading ? (
            <div className="flex items-center gap-2 text-xs text-text-faint">
              <Loader2 size={12} className="animate-spin" /> Carregando histórico do projeto...
            </div>
          ) : (
            messages.map((m, i) => <MessageBubble key={i} message={m} />)
          )}
          {loading && streamingText && (
            <MessageBubble message={{ role: "assistant", content: streamingText }} streaming />
          )}
          {!loading && truncated && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-accent-amber/30 bg-accent-amber/10 px-4 py-3 text-xs text-text-primary">
              <span>A resposta atingiu o limite de tamanho e foi interrompida.</span>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => send("Continue exatamente de onde parou, sem repetir nada do que já foi escrito.")}
              >
                Continuar
              </Button>
            </div>
          )}
          {loading && !streamingText && (
            <div className="flex items-start gap-3">
              <div className="h-7 w-7 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center">
                <Sparkles size={14} />
              </div>
              <div className="flex-1">
                <div className="text-xs text-text-faint mb-1">Co-piloto</div>
                <div className="rounded-lg border border-border bg-surface px-4 py-3 flex items-center gap-2 text-sm text-text-muted">
                  <Loader2 size={14} className="animate-spin text-brand-primary" />
                  <span className="animate-pulse-soft">{progress || "Pensando..."}</span>
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
          {images.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {images.map((img) => (
                <div key={img.id} className="relative h-16 w-16 overflow-hidden rounded-md border border-border bg-surface" title={img.name}>
                  {img.kind === "image" ? (
                    <img src={img.previewUrl} alt={img.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 px-1 text-center">
                      <FileText size={16} className="text-accent-red" />
                      <span className="text-[8px] leading-tight text-text-muted line-clamp-2">{img.name}</span>
                      <span className="text-[8px] text-text-faint">{img.sizeLabel}</span>
                    </div>
                  )}
                  <button
                    onClick={() => setImages((cur) => cur.filter((x) => x.id !== img.id))}
                    className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-[10px] text-white hover:bg-black/80"
                    title="Remover imagem"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <input ref={fileRef} type="file" accept={TRANSCRIPT_ACCEPT} className="hidden" onChange={handleFile} />
            <input
              ref={imageRef}
              type="file"
              accept={`${IMAGE_ACCEPT},application/pdf,.pdf,.pptx`}
              multiple
              className="hidden"
              onChange={(e) => {
                addImages(Array.from(e.target.files ?? []));
                e.target.value = "";
              }}
            />
            <Button
              variant="secondary"
              size="md"
              leftIcon={<Upload size={14} />}
              onClick={() => fileRef.current?.click()}
              title="Fazer upload de transcrição (.txt, .docx, .md, .vtt, .srt)"
            >
              Transcrição
            </Button>
            <Button
              variant="secondary"
              size="md"
              leftIcon={<Paperclip size={14} />}
              onClick={() => imageRef.current?.click()}
              title="Anexar imagem, PDF ou PowerPoint — imagem também pode ser colada com Ctrl+V"
            >
              Anexar
            </Button>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                if (!e.target.value) setActivePrompt(null);
              }}
              onPaste={handlePaste}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Pergunte algo, cole uma transcrição ou uma imagem (Ctrl+V)..."
              rows={1}
              className="flex-1 resize-none overflow-y-auto rounded-md border border-border bg-white px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
            />
            <Button
              onClick={() => send(input)}
              disabled={(!input.trim() && images.length === 0) || loading}
              leftIcon={<Send size={14} />}
            >
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
                        !reached && "bg-[#EDEEEF] text-text-faint"
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

/**
 * Quanto do histórico acompanha cada pergunta. Sem limite, toda pergunta
 * reenviava a conversa inteira — transcrições antigas incluídas —, ficando
 * lenta, cara e, depois de algumas reuniões, estourando o limite do modelo.
 * ~200 mil caracteres ≈ 50 mil tokens: cabe com folga em qualquer tier.
 */
const HISTORY_BUDGET_CHARS = 200_000;

/** Mensagens mais recentes que cabem no orçamento; começa sempre por "user". */
function trimHistory(history: ChatMessage[]): ChatMessage[] {
  let total = 0;
  let start = history.length;
  for (let i = history.length - 1; i >= 0; i--) {
    total += history[i].content.length;
    // A última mensagem (a pergunta atual) vai sempre, mesmo se sozinha passar do orçamento.
    if (total > HISTORY_BUDGET_CHARS && i < history.length - 1) break;
    start = i;
  }
  const kept = history.slice(start);
  // A saudação é do app, e a API espera que a conversa comece pelo usuário.
  const firstUser = kept.findIndex((m) => m.role === "user");
  return kept.slice(firstUser);
}

/** Mensagens do usuário maiores que isto (ex: transcrição colada) aparecem recolhidas. */
const COLLAPSE_AT = 1200;

// memo: sem isto, cada tecla digitada no campo redesenha o histórico inteiro e
// reprocessa o Markdown de todas as mensagens — com uma transcrição longa no
// histórico, a digitação trava (item 17).
const MessageBubble = memo(function MessageBubble({
  message,
  streaming = false,
}: {
  message: Message;
  /** Resposta ainda sendo escrita: sem barra de ações. */
  streaming?: boolean;
}) {
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
                  code: ({ children }) => <code className="font-mono bg-[#EDEEEF] px-1 py-0.5 rounded text-[11px]">{children}</code>,
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
        {!isUser && !streaming && <AssistantActions content={message.content} />}
      </div>
    </div>
  );
});

/**
 * Ações de uma resposta do agente: copiar, exportar (item 3) e, se houver,
 * baixar o fluxograma. Antes não havia nenhuma forma de exportar.
 */
function AssistantActions({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<"docx" | "pdf" | null>(null);
  const [exportError, setExportError] = useState("");
  const drawio = useMemo(() => extractDrawio(content), [content]);

  function copy() {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function exportAs(format: "md" | "docx" | "pdf") {
    const title = guessTitle(content, "Resposta do co-piloto");
    if (format === "md") return downloadText(safeFilename(title, "md"), content, "text/markdown;charset=utf-8");
    setBusy(format);
    setExportError("");
    try {
      const doc = { title, blocks: dropDuplicateTitle(markdownToBlocks(content), title), aiGenerated: true };
      const blob = format === "docx"
        ? await (await import("@/lib/export/docx")).docToDocxBlob(doc)
        : await (await import("@/lib/export/pdf")).docToPdfBlob(doc);
      downloadBlob(safeFilename(title, format), blob);
    } catch (err) {
      setExportError(`Falha ao exportar: ${err instanceof Error ? err.message : err}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-text-faint">
      <button onClick={copy} className="hover:text-brand-primary">
        {copied ? "Copiado ✓" : "Copiar"}
      </button>
      <span className="text-border">|</span>
      <span>Exportar:</span>
      <button onClick={() => exportAs("md")} className="hover:text-brand-primary">Markdown</button>
      <button onClick={() => exportAs("docx")} disabled={busy !== null} className="hover:text-brand-primary disabled:opacity-50">
        {busy === "docx" ? "Gerando…" : "Word"}
      </button>
      <button onClick={() => exportAs("pdf")} disabled={busy !== null} className="hover:text-brand-primary disabled:opacity-50">
        {busy === "pdf" ? "Gerando…" : "PDF"}
      </button>
      {exportError && <span className="text-accent-red">{exportError}</span>}
      {drawio.status === "ok" && (
        <button
          onClick={() => downloadText("fluxograma.drawio", drawio.xml, "application/xml")}
          className="font-medium text-brand-primary hover:underline"
        >
          Baixar fluxograma (.drawio)
        </button>
      )}
      {drawio.status === "invalid" && (
        <span className="text-accent-red">
          O XML do fluxograma está incompleto ou inválido — peça ao co-piloto para gerar de novo.
        </span>
      )}
    </div>
  );
}
