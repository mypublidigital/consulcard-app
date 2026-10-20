import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Send, Upload, Loader2, Sparkles, FileText, ChevronRight, AlertCircle, Paperclip, Square, Image as ImageIcon,
  FileCode, History, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { useProjectsStore } from "@/store/projects-store";
import { DATA_PROTOCOL, PROMPTS, withDataProtocol } from "@/mocks/prompts";
import { COPILOT_INITIAL_MESSAGES } from "@/mocks/copilot";
import {
  CONTINUE_INSTRUCTION, sendChatWithContinuation,
  type ApiMessage, type ChatMessage, type ChatStatus, type StoredAttachment,
} from "@/lib/chat";
import {
  ATTACHMENT_ACCEPT, MAX_ATTACHMENTS_PER_MESSAGE, attachmentBlock, prepareAttachment, signedFileUrl, uploadAttachment,
  type PendingAttachment,
} from "@/lib/attachments";
import { appendCopilotExchange, loadCopilotHistory } from "@/lib/copilot-history";
import { latestDocument, uploadDocument } from "@/lib/documents";
import { downloadBlob, downloadText, extractDrawio, safeFilename } from "@/lib/download";
import { TRANSCRIPT_ACCEPT, consolidatePrompt, partPrompt, readTranscriptFile, splitTranscript } from "@/lib/transcript";
import { dropDuplicateTitle, guessTitle, markdownToBlocks } from "@/lib/export/blocks";
import type { Document, Project, ProjectPhase, PromptDef } from "@/types";

const PHASES: { id: ProjectPhase; label: string }[] = [
  { id: "planejamento", label: "Planejamento" },
  { id: "diagnostico", label: "Diagnóstico" },
  { id: "execucao", label: "Execução" },
  { id: "validacao", label: "Validação" },
  { id: "entrega", label: "Entrega" },
];

/**
 * Texto colado acima disto vira anexo de texto (testes de 06/10, backlog 18:
 * XML de 60 mil caracteres colado no campo). Assim ele fica guardado no
 * projeto e acompanha as perguntas seguintes, em vez de sumir do histórico.
 */
const PASTE_AS_FILE_CHARS = 20_000;

/**
 * Transcrição acima disto é lida em partes e consolidada (o modelo da
 * conversa livre lê ~1 milhão de tokens; isto é ~150 mil tokens).
 */
const TRANSCRIPT_SPLIT_CHARS = 600_000;

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
  // Resposta em construção (streaming) e se a última ficou incompleta.
  const [streamingText, setStreamingText] = useState("");
  const [truncated, setTruncated] = useState(false);
  /** Etapa atual mostrada enquanto o co-piloto trabalha. */
  const [progress, setProgress] = useState("");
  const [status, setStatus] = useState<ChatStatus>("waiting");
  const [round, setRound] = useState(1);
  const [elapsed, setElapsed] = useState(0);
  // Anexos aguardando envio (imagem, PDF, Word, PowerPoint, texto).
  const [pending, setPending] = useState<PendingAttachment[]>([]);
  const [dragging, setDragging] = useState(false);
  const attachRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [lastDoc, setLastDoc] = useState<Document | null>(null);

  const refreshLastDoc = useCallback(() => {
    latestDocument(project.id).then(setLastDoc).catch(() => setLastDoc(null));
  }, [project.id]);
  useEffect(() => { refreshLastDoc(); }, [refreshLastDoc]);

  // Cronômetro enquanto o co-piloto trabalha: respostas longas levam minutos
  // e a tela parecia travada em "Pensando..." (GAPs #10 e #14).
  useEffect(() => {
    if (!loading) return;
    const started = Date.now();
    setElapsed(0);
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(t);
  }, [loading]);

  async function addAttachments(files: File[]) {
    const room = MAX_ATTACHMENTS_PER_MESSAGE - pending.length;
    if (room <= 0) {
      setError(`No máximo ${MAX_ATTACHMENTS_PER_MESSAGE} anexos por mensagem.`);
      return;
    }
    setError("");
    const added: PendingAttachment[] = [];
    const errors: string[] = [];
    for (const f of files.slice(0, room)) {
      try {
        added.push(await prepareAttachment(f));
      } catch (err) {
        errors.push(err instanceof Error ? err.message : `Não foi possível anexar "${f.name}".`);
      }
    }
    if (added.length) setPending((cur) => [...cur, ...added]);
    if (files.length > room) errors.push(`Só os primeiros ${room} anexos foram aceitos (limite de ${MAX_ATTACHMENTS_PER_MESSAGE}).`);
    if (errors.length) setError(errors.join(" "));
  }

  // GAP #13: colar documento não fazia nada. Texto copiado do Word também traz
  // uma imagem da seleção na área de transferência, e o campo pegava a imagem
  // em vez do texto. Agora: havendo texto, cola o texto; só arquivo (print,
  // arquivo copiado no Explorer) vira anexo; texto muito longo vira anexo.
  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const data = e.clipboardData;
    const text = data.getData("text/plain");
    const files = Array.from(data.files ?? []);
    if (text) {
      if (text.length > PASTE_AS_FILE_CHARS) {
        e.preventDefault();
        const name = /<mxfile|<mxGraphModel/.test(text) ? "fluxograma-colado.xml" : "texto-colado.txt";
        addAttachments([new File([text], name, { type: "text/plain" })]);
      }
      return; // texto comum: cola normalmente
    }
    if (files.length === 0) return;
    e.preventDefault();
    addAttachments(files);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length) addAttachments(files);
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
      }),
    [project]
  );

  // Backlog 10/16: o prompt usado via "Usar em projeto" não aparecia na
  // lateral. As fichas usadas ficam registradas no histórico do projeto.
  const usedPrompts = useMemo(() => {
    const seen = new Set<string>();
    const out: PromptDef[] = [];
    for (let i = messages.length - 1; i >= 0; i--) {
      const id = messages[i].promptId;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const p = PROMPTS.find((x) => x.id === id);
      if (p) out.push(p);
    }
    return out;
  }, [messages]);

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

  /** "Parar" (GAP #6): encerra a resposta em andamento e mantém o que já chegou. */
  function stop() {
    abortRef.current?.abort();
  }

  async function send(rawText: string, extra: PendingAttachment[] = []) {
    const toUpload = [...pending, ...extra];
    if ((!rawText.trim() && toUpload.length === 0) || loading) return;
    if (!currentUser?.id) {
      setError("Sessão expirada: entre novamente para usar o co-piloto.");
      return;
    }
    const text = rawText.trim() ? rawText : "Analise o(s) anexo(s).";
    const prompt = activePrompt;
    // Regra da biblioteca: prompt vindo da ficha segue com o PD.0 anexado.
    const content = prompt ? withDataProtocol(text) : text;
    const previous = messages;

    setInput("");
    setActivePrompt(null);
    setPending([]);
    setLoading(true);
    setError("");
    setTruncated(false);
    setStreamingText("");
    setStatus("waiting");
    setRound(1);

    const controller = new AbortController();
    abortRef.current = controller;
    // Atualiza a tela no máximo uma vez por quadro durante o streaming.
    let pendingText = "";
    let frame = 0;
    let uploaded: StoredAttachment[] = [];
    try {
      // Anexos ficam guardados no projeto (aba Documentos) e acompanham todas
      // as perguntas seguintes desta conversa (GAPs #7 e #9).
      if (toUpload.length) {
        setProgress(`Guardando ${toUpload.length === 1 ? "o anexo" : `${toUpload.length} anexos`} no projeto…`);
        uploaded = await Promise.all(toUpload.map((a) => uploadAttachment(project.id, currentUser.id, a)));
        setProgress("");
        refreshLastDoc();
      }

      const userMsg: ChatMessage = {
        role: "user",
        content,
        attachments: uploaded.length ? uploaded : undefined,
        promptId: prompt?.id,
      };
      const history = [...previous, userMsg];
      setMessages(history);
      const askedAt = new Date();

      const result = await sendChatWithContinuation(toApiHistory(history, prompt?.tier), {
        agentType: "copilot",
        projectContext,
        // Sem a ficha carregada, o agente indica a da Biblioteca que serve ao pedido.
        promptCatalog: prompt ? undefined : promptCatalog,
        tier: prompt?.tier,
        signal: controller.signal,
        onStatus: (s) => {
          setStatus(s);
          if (s === "continuing") setRound((r) => r + 1);
        },
        onText: (t) => {
          pendingText = t;
          if (!frame) frame = requestAnimationFrame(() => { frame = 0; setStreamingText(pendingText); });
        },
      });
      cancelAnimationFrame(frame);
      setStreamingText("");

      const aborted = result.stopReason === "aborted";
      if (aborted && !result.content) {
        // Parado antes de qualquer texto: a pergunta volta para o campo.
        setMessages(previous);
        setInput(rawText);
        setActivePrompt(prompt);
        return;
      }
      const reply = aborted ? `${result.content}\n\n_[Resposta interrompida pelo usuário.]_` : result.content;
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
      // Esgotou as continuações automáticas sem terminar: oferece continuar.
      if (["max_tokens", "time_limit", "connection_lost"].includes(result.stopReason ?? "")) setTruncated(true);

      appendCopilotExchange(
        project.id,
        currentUser.id,
        { content, at: askedAt, attachments: uploaded, promptId: prompt?.id },
        { content: reply, at: new Date() }
      ).catch((e) => setError(`A resposta chegou, mas não foi salva no histórico: ${e instanceof Error ? e.message : e}`));
    } catch (err) {
      cancelAnimationFrame(frame);
      setStreamingText("");
      // Tira a mensagem que falhou do histórico e devolve o texto ao campo.
      // Anexos já guardados continuam em Documentos; os que não subiram voltam.
      setMessages(previous);
      setInput(rawText);
      setActivePrompt(prompt);
      if (!uploaded.length) setPending(toUpload);
      setError(err instanceof Error ? err.message : "Erro ao contactar o co-piloto.");
    } finally {
      abortRef.current = null;
      setProgress("");
      setLoading(false);
    }
  }

  async function handleTranscriptFile(e: React.ChangeEvent<HTMLInputElement>) {
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

    if (text.length > TRANSCRIPT_SPLIT_CHARS) {
      await processLongTranscript(file.name, text, splitTranscript(text));
      return;
    }
    // Vai como anexo: fica guardada em Documentos e acompanha toda a conversa.
    // Antes ia como texto da mensagem e saía do histórico depois de algumas
    // perguntas — o co-piloto dizia que nunca tinha recebido (GAP #9).
    try {
      const att = await prepareAttachment(file);
      await send(
        input.trim() ||
          "Esta é a transcrição da reunião. Elabore a ata com resumo, decisões, pendências (tabela com responsável e prazo), riscos e próximos passos.",
        [att]
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : `Não foi possível anexar "${file.name}".`);
    }
  }

  /**
   * Transcrição longa demais para uma chamada: cada parte é lida em separado,
   * extraindo decisões, pendências e riscos; depois os extratos são
   * consolidados numa ata. Só a ata final entra no histórico da conversa.
   */
  async function processLongTranscript(fileName: string, text: string, parts: string[]) {
    if (loading || !currentUser?.id) return;
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
        const r = await sendChatWithContinuation(
          [{ role: "user", content: partPrompt(fileName, i + 1, parts.length, parts[i]) }],
          { agentType: "copilot", projectContext }
        );
        extracts.push(r.content);
      }
      setProgress("Consolidando a ata…");
      let pendingText = "";
      let frame = 0;
      const final = await sendChatWithContinuation(
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
      appendCopilotExchange(project.id, currentUser.id, { content: summary, at: askedAt }, { content: final.content, at: new Date() })
        .catch((e) => setError(`A ata foi gerada, mas não foi salva no histórico: ${e instanceof Error ? e.message : e}`));
    } catch (err) {
      setStreamingText("");
      setMessages(previous);
      setError(`Falha ao processar a transcrição: ${err instanceof Error ? err.message : err}`);
    } finally {
      setProgress("");
      setLoading(false);
    }
  }

  /** "Salvar em Documentos": resposta vira .docx guardado no projeto. */
  const saveToDocuments = useCallback(async (markdown: string) => {
    if (!currentUser?.id) throw new Error("Sessão expirada.");
    const title = guessTitle(markdown, "Resposta do co-piloto");
    const doc = { title, blocks: dropDuplicateTitle(markdownToBlocks(markdown), title), aiGenerated: true };
    const blob = await (await import("@/lib/export/docx")).docToDocxBlob(doc);
    const n = title.toLowerCase();
    const type: Document["type"] = /\bata\b/.test(n) ? "ata" : /status|report|relat/.test(n) ? "report" : /cronograma/.test(n) ? "cronograma" : "entregavel";
    await uploadDocument(project.id, currentUser.id, blob, { name: safeFilename(title, "docx"), type, source: "copiloto" });
    refreshLastDoc();
  }, [currentUser?.id, project.id, refreshLastDoc]);

  async function openDocument(d: Document) {
    try {
      if (d.storagePath) window.open(await signedFileUrl(d.storagePath), "_blank", "noopener");
      else if (d.sharepointUrl) window.open(d.sharepointUrl, "_blank", "noopener");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível abrir o documento.");
    }
  }

  const minutes = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`;
  const statusLabel = progress
    || (status === "continuing" || round > 1
      ? `Resposta longa — escrevendo a parte ${round}…`
      : status === "thinking" ? "Analisando o material…" : "Pensando…");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
      {/* Chat */}
      <Card
        className={cn("relative flex flex-col h-[calc(100vh-340px)] min-h-[520px]", dragging && "ring-2 ring-brand-primary/40")}
        onDragOver={(e: React.DragEvent) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={(e: React.DragEvent) => { if (e.currentTarget === e.target) setDragging(false); }}
        onDrop={handleDrop}
      >
        {dragging && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-brand-primary/5 text-sm font-medium text-brand-primary">
            Solte o arquivo para anexar
          </div>
        )}
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
            messages.map((m, i) => <MessageBubble key={i} message={m} onSave={saveToDocuments} />)
          )}
          {loading && streamingText && (
            <MessageBubble message={{ role: "assistant", content: streamingText }} streaming />
          )}
          {loading && (
            <div className="flex items-start gap-3">
              <div className="h-7 w-7 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center">
                <Sparkles size={14} />
              </div>
              <div className="flex-1">
                <div className="rounded-lg border border-border bg-surface px-4 py-2.5 flex items-center gap-2 text-xs text-text-muted">
                  <Loader2 size={13} className="animate-spin text-brand-primary" />
                  <span className="animate-pulse-soft">{streamingText && !progress && round === 1 ? "Escrevendo…" : statusLabel}</span>
                  <span className="ml-auto font-mono text-text-faint">{minutes}</span>
                </div>
              </div>
            </div>
          )}
          {!loading && truncated && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-accent-amber/30 bg-accent-amber/10 px-4 py-3 text-xs text-text-primary">
              <span>A resposta ficou incompleta mesmo após as continuações automáticas.</span>
              <Button size="sm" variant="secondary" onClick={() => send(CONTINUE_INSTRUCTION)}>
                Continuar
              </Button>
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
          {pending.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {pending.map((a) => (
                <div key={a.id} className="relative h-16 w-16 overflow-hidden rounded-md border border-border bg-surface" title={a.name}>
                  {a.previewUrl ? (
                    <img src={a.previewUrl} alt={a.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 px-1 text-center">
                      <AttachmentIcon kind={a.kind} name={a.name} />
                      <span className="text-[8px] leading-tight text-text-muted line-clamp-2">{a.name}</span>
                      <span className="text-[8px] text-text-faint">{a.sizeLabel}</span>
                    </div>
                  )}
                  <button
                    onClick={() => setPending((cur) => cur.filter((x) => x.id !== a.id))}
                    className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-[10px] text-white hover:bg-black/80"
                    title="Remover anexo"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <input ref={fileRef} type="file" accept={TRANSCRIPT_ACCEPT} className="hidden" onChange={handleTranscriptFile} />
            <input
              ref={attachRef}
              type="file"
              accept={ATTACHMENT_ACCEPT}
              multiple
              className="hidden"
              onChange={(e) => {
                addAttachments(Array.from(e.target.files ?? []));
                e.target.value = "";
              }}
            />
            <Button
              variant="secondary"
              size="md"
              leftIcon={<Upload size={14} />}
              onClick={() => fileRef.current?.click()}
              disabled={loading}
              title="Transcrição de reunião (.docx, .txt, .vtt, .srt, .md) — vira ata"
            >
              Transcrição
            </Button>
            <Button
              variant="secondary"
              size="md"
              leftIcon={<Paperclip size={14} />}
              onClick={() => attachRef.current?.click()}
              title="Anexar PDF, imagem, Word, PowerPoint ou texto/XML — também dá para arrastar ou colar (Ctrl+V)"
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
                  if (!loading) send(input);
                }
              }}
              placeholder={loading
                ? "Você pode ir escrevendo o complemento — envie quando a resposta terminar, ou clique em Parar."
                : "Pergunte algo, cole um texto ou arraste um arquivo aqui..."}
              rows={1}
              className="flex-1 resize-none overflow-y-auto rounded-md border border-border bg-white px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
            />
            {loading ? (
              <Button variant="secondary" onClick={stop} leftIcon={<Square size={12} className="fill-current" />} title="Interromper a resposta">
                Parar
              </Button>
            ) : (
              <Button
                onClick={() => send(input)}
                disabled={!input.trim() && pending.length === 0}
                leftIcon={<Send size={14} />}
              >
                Enviar
              </Button>
            )}
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

        {usedPrompts.length > 0 && (
          <Card>
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <History size={13} className="text-text-muted" />
              <div className="text-sm font-semibold text-text-primary">Usados neste projeto</div>
            </div>
            <div className="divide-y divide-border max-h-48 overflow-y-auto">
              {usedPrompts.map((p) => (
                <PromptRow key={p.id} prompt={p} onClick={() => loadPrompt(p)} />
              ))}
            </div>
          </Card>
        )}

        <Card>
          <div className="px-4 py-3 border-b border-border">
            <div className="text-sm font-semibold text-text-primary">Prompts para esta fase</div>
            <div className="text-[11px] text-text-faint">Clique para carregar no campo</div>
          </div>
          <div className="divide-y divide-border max-h-80 overflow-y-auto">
            {phasePrompts.map((p) => (
              <PromptRow key={p.id} prompt={p} onClick={() => loadPrompt(p)} />
            ))}
            {phasePrompts.length === 0 && (
              <div className="px-4 py-6 text-xs text-text-faint text-center">Sem prompts para esta fase.</div>
            )}
          </div>
        </Card>

        {/* GAP #11: era um link fixo e falso ("Ata de reunião — 28/04/2026") que não abria nada. */}
        <Card>
          <div className="p-4">
            <div className="text-[11px] uppercase tracking-wider text-text-faint mb-2">Último documento do projeto</div>
            {lastDoc ? (
              <>
                <button
                  onClick={() => openDocument(lastDoc)}
                  className="flex items-center gap-2 text-left text-sm text-brand-primary hover:underline"
                >
                  {lastDoc.storagePath ? <FileText size={14} className="shrink-0" /> : <ExternalLink size={14} className="shrink-0" />}
                  <span className="line-clamp-2">{lastDoc.name}</span>
                </button>
                <div className="text-[10px] text-text-faint mt-1">
                  {lastDoc.source === "copiloto" ? "co-piloto" : lastDoc.source === "upload" ? "enviado" : "SharePoint"}
                  {" · "}{new Date(lastDoc.date).toLocaleDateString("pt-BR")}
                  {lastDoc.sizeBytes ? ` · ${Math.max(1, Math.round(lastDoc.sizeBytes / 1024))} KB` : ""}
                </div>
              </>
            ) : (
              <div className="text-xs text-text-faint">
                Nenhum documento ainda. Anexos do co-piloto e respostas salvas aparecem aqui e na aba Documentos.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function PromptRow({ prompt: p, onClick }: { prompt: PromptDef; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full text-left px-4 py-3 hover:bg-surface">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-text-primary leading-snug">{p.title}</span>
        {p.tier && (
          <Badge tone={p.tier === "T3" ? "purple" : p.tier === "T2" ? "blue" : "neutral"} size="sm">
            {p.tier}
          </Badge>
        )}
      </div>
      <div className="text-[10px] text-text-faint mt-1">{p.id} · {p.activityLabel}</div>
    </button>
  );
}

function AttachmentIcon({ kind, name, className }: { kind: StoredAttachment["kind"]; name: string; className?: string }) {
  if (kind === "image") return <ImageIcon size={16} className={cn("text-brand-primary", className)} />;
  if (/\.(xml|drawio|json|html?)$/i.test(name)) return <FileCode size={16} className={cn("text-brand-primary", className)} />;
  return <FileText size={16} className={cn(kind === "pdf" ? "text-accent-red" : "text-brand-primary", className)} />;
}

/**
 * Quanto do histórico acompanha cada pergunta, em caracteres. A conversa livre
 * e as fichas T2/T3 usam modelos com janela de 1 milhão de tokens; fichas T1
 * usam o Haiku 4.5 (200 mil). O limite antigo (200 mil caracteres para todos)
 * descartava a transcrição enviada no início da conversa (GAP #9).
 */
const HISTORY_BUDGET_CHARS: Record<"T1" | "T2" | "T3", number> = { T1: 300_000, T2: 1_200_000, T3: 1_200_000 };

/**
 * Converte o histórico para a API. Mensagens com anexo nunca são cortadas —
 * o anexo vai por referência e a Edge Function busca o conteúdo —; o corte
 * por orçamento só descarta conversa comum, da mais antiga para a mais nova.
 */
function toApiHistory(history: ChatMessage[], tier?: "T1" | "T2" | "T3"): ApiMessage[] {
  const budget = HISTORY_BUDGET_CHARS[tier ?? "T2"];
  const keep = new Array(history.length).fill(false);
  let total = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i];
    const pinned = !!m.attachments?.length || /^Transcrição de reunião —/.test(m.content);
    total += m.content.length;
    // A última mensagem (a pergunta atual) vai sempre.
    if (pinned || i === history.length - 1 || total <= budget) keep[i] = true;
  }
  const kept = history.filter((_, i) => keep[i]);
  // A saudação é do app, e a API espera que a conversa comece pelo usuário.
  const firstUser = kept.findIndex((m) => m.role === "user");
  return kept.slice(firstUser).map((m) =>
    m.attachments?.length
      ? { role: m.role, content: [...m.attachments.map(attachmentBlock), { type: "text" as const, text: m.content }] }
      : { role: m.role, content: m.content }
  );
}

/** Mensagens do usuário maiores que isto (ex: transcrição colada) aparecem recolhidas. */
const COLLAPSE_AT = 1200;

// memo: sem isto, cada tecla digitada no campo redesenha o histórico inteiro e
// reprocessa o Markdown de todas as mensagens — com uma transcrição longa no
// histórico, a digitação trava (item 17).
const MessageBubble = memo(function MessageBubble({
  message,
  streaming = false,
  onSave,
}: {
  message: ChatMessage;
  /** Resposta ainda sendo escrita: sem barra de ações. */
  streaming?: boolean;
  onSave?: (markdown: string) => Promise<void>;
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

  async function openAttachment(a: StoredAttachment) {
    // Word/PowerPoint/texto: o modelo lê o .txt extraído, guardado ao lado do
    // original com ".txt" a mais no nome; o usuário abre o original.
    const original = a.kind === "text" ? a.storagePath.replace(/\.txt$/, "") : a.storagePath;
    try {
      window.open(await signedFileUrl(original), "_blank", "noopener");
    } catch {
      window.alert(`Não foi possível abrir "${a.name}" — ele pode ter sido removido da aba Documentos.`);
    }
  }

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
        {isUser && message.attachments?.length ? (
          <div className="mb-1.5 flex flex-wrap justify-end gap-1.5">
            {message.attachments.map((a, i) => (
              <button
                key={`${a.storagePath}-${i}`}
                onClick={() => openAttachment(a)}
                className="inline-flex max-w-[220px] items-center gap-1.5 rounded-md border border-border bg-white px-2 py-1 text-[11px] text-text-primary hover:border-brand-primary/40"
                title={`Abrir ${a.name}`}
              >
                <AttachmentIcon kind={a.kind} name={a.name} className="shrink-0" />
                <span className="truncate">{a.name}</span>
              </button>
            ))}
          </div>
        ) : null}
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
        {!isUser && !streaming && <AssistantActions content={message.content} onSave={onSave} />}
      </div>
    </div>
  );
});

/**
 * Ações de uma resposta do agente: copiar, exportar (item 3), salvar em
 * Documentos e, se houver, baixar o fluxograma.
 */
function AssistantActions({ content, onSave }: { content: string; onSave?: (markdown: string) => Promise<void> }) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<"docx" | "pdf" | "save" | null>(null);
  const [saved, setSaved] = useState(false);
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

  async function save() {
    if (!onSave) return;
    setBusy("save");
    setExportError("");
    try {
      await onSave(content);
      setSaved(true);
    } catch (err) {
      setExportError(`Falha ao salvar: ${err instanceof Error ? err.message : err}`);
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
      {onSave && (
        <>
          <span className="text-border">|</span>
          <button onClick={save} disabled={busy !== null || saved} className="hover:text-brand-primary disabled:opacity-60">
            {busy === "save" ? "Salvando…" : saved ? "Salvo em Documentos ✓" : "Salvar em Documentos"}
          </button>
        </>
      )}
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
