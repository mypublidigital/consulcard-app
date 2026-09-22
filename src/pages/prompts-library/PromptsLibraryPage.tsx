import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Copy, Check, ChevronRight } from "lucide-react";
import { PageWrapper, PageHeader } from "@/components/layout/PageWrapper";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { PROMPTS, PROMPT_TIERS, withDataProtocol } from "@/mocks/prompts";
import { PROJECT_TYPES, MACRO_COLOR_CLASSES, findMacro } from "@/mocks/project-types";
import { useProjectsStore } from "@/store/projects-store";
import type { PromptDef, ProjectPhase, PromptTier } from "@/types";
import { cn } from "@/lib/utils";

/**
 * Abre o co-piloto do projeto com o prompt já carregado (item 15). Antes o
 * botão só navegava para o projeto — e com window.location, reiniciando o
 * app — e o prompt escolhido se perdia no caminho.
 */
function projectPromptPath(projectId: string, promptId: string) {
  return `/projects/${projectId}?tab=copilot&prompt=${encodeURIComponent(promptId)}`;
}

const TIER_TONE: Record<PromptTier, "neutral" | "blue" | "purple"> = {
  T1: "neutral",
  T2: "blue",
  T3: "purple",
};

const PHASES: { id: ProjectPhase; label: string }[] = [
  { id: "planejamento", label: "Planejamento" },
  { id: "diagnostico", label: "Diagnóstico" },
  { id: "execucao", label: "Execução" },
  { id: "validacao", label: "Validação" },
  { id: "entrega", label: "Entrega" },
];

export function PromptsLibraryPage() {
  const [search, setSearch] = useState("");
  const [macros, setMacros] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [tiers, setTiers] = useState<PromptTier[]>([]);
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [active, setActive] = useState<PromptDef | null>(null);
  const projects = useProjectsStore((s) => s.projects);

  const filtered = useMemo(() => {
    return PROMPTS.filter((p) => {
      if (search) {
        const q = search.toLowerCase();
        const hay = `${p.title} ${p.body} ${p.id} ${p.activityLabel}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (macros.length > 0) {
        // macroCategories cobre os prompts válidos para mais de uma macro.
        const scope = p.macroCategories ?? (p.macroCategory === "all" ? null : [p.macroCategory]);
        if (scope && !scope.some((m) => macros.includes(m))) return false;
      }
      if (types.length > 0 && p.projectTypeId !== "all" && !types.includes(p.projectTypeId)) return false;
      if (tiers.length > 0 && (!p.tier || !tiers.includes(p.tier))) return false;
      if (phases.length > 0 && !phases.includes(p.phase)) return false;
      return true;
    });
  }, [search, macros, types, tiers, phases]);

  function toggle<T>(arr: T[], setArr: (v: T[]) => void, val: T) {
    setArr(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  }

  return (
    <PageWrapper>
      <PageHeader
        title="Biblioteca de Prompts"
        subtitle={`${PROMPTS.length} prompts disponíveis para apoiar a execução dos projetos`}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-5">
        {/* Filters */}
        <aside className="space-y-5">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>

          <FilterGroup title="Modelo recomendado">
            {PROMPT_TIERS.map((t) => (
              <Checkbox
                key={t.id}
                checked={tiers.includes(t.id)}
                onChange={() => toggle(tiers, setTiers, t.id)}
                label={t.label}
              />
            ))}
          </FilterGroup>

          <FilterGroup title="Fase">
            {PHASES.map((p) => (
              <Checkbox
                key={p.id}
                checked={phases.includes(p.id)}
                onChange={() => toggle(phases, setPhases, p.id)}
                label={p.label}
              />
            ))}
          </FilterGroup>

          <FilterGroup title="Macro-categoria">
            {PROJECT_TYPES.map((m) => {
              const expanded = macros.includes(m.id);
              return (
                <div key={m.id}>
                  <Checkbox
                    checked={expanded}
                    onChange={() => {
                      toggle(macros, setMacros, m.id);
                      if (expanded) setTypes(types.filter((t) => !m.types.some((mt) => mt.id === t)));
                    }}
                    label={m.label}
                  />
                  {expanded && (
                    <div className="ml-5 mt-1 space-y-1">
                      {m.types.map((t) => (
                        <Checkbox
                          key={t.id}
                          size="xs"
                          checked={types.includes(t.id)}
                          onChange={() => toggle(types, setTypes, t.id)}
                          label={t.label}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </FilterGroup>
        </aside>

        {/* Grid */}
        <div>
          <div className="text-xs text-text-muted mb-3">
            {filtered.length} prompt{filtered.length !== 1 ? "s" : ""}
          </div>
          {filtered.length === 0 ? (
            <Card>
              <EmptyState title="Nenhum prompt encontrado" description="Ajuste os filtros para refinar a busca." />
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filtered.map((p) => (
                <PromptCard key={p.id} prompt={p} onOpen={() => setActive(p)} projects={projects} />
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal
        open={!!active}
        onClose={() => setActive(null)}
        title={active?.title}
        maxWidth="max-w-2xl"
      >
        {active && <PromptDetail prompt={active} projects={projects} />}
      </Modal>
    </PageWrapper>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-text-faint font-semibold mb-2">{title}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Checkbox({
  checked,
  onChange,
  label,
  size = "sm",
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  size?: "xs" | "sm";
}) {
  return (
    <label className={cn("flex items-center gap-2 cursor-pointer", size === "xs" ? "text-[11px]" : "text-xs")}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-3.5 w-3.5 rounded border-border accent-[#1A3A8F]"
      />
      <span className={checked ? "text-text-primary font-medium" : "text-text-muted"}>{label}</span>
    </label>
  );
}

function PromptCard({
  prompt,
  onOpen,
  projects,
}: {
  prompt: PromptDef;
  onOpen: () => void;
  projects: { id: string; name: string }[];
}) {
  const macro = prompt.macroCategory !== "all" ? findMacro(prompt.macroCategory) : null;
  const macroColor = macro ? MACRO_COLOR_CLASSES[macro.color] : null;
  const [menuOpen, setMenuOpen] = useState(false);
  const isPending = prompt.status === "pending";
  const navigate = useNavigate();

  const preview = prompt.body.split("\n").slice(0, 2).join(" ").slice(0, 130) + "...";

  return (
    <Card className={cn("h-full flex flex-col", isPending ? "opacity-75" : "hover:border-brand-primary/30")}>
      <CardBody className="flex-1 flex flex-col">
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          {macroColor ? (
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${macroColor.soft} ${macroColor.text}`}>
              {macro?.label}
            </span>
          ) : (
            <Badge tone="neutral" size="sm">
              {prompt.macroCategories ? "Multi-categoria" : "Todos os projetos"}
            </Badge>
          )}
          {prompt.tier && (
            <Badge tone={TIER_TONE[prompt.tier]} size="sm">{prompt.tier}</Badge>
          )}
          {isPending && <Badge tone="amber" size="sm">Aguarda especialista</Badge>}
        </div>

        <h3 className="text-sm font-semibold text-text-primary leading-snug">{prompt.title}</h3>

        <div className="text-[11px] text-text-faint mt-1">
          <span className="font-mono">{prompt.id}</span> · {prompt.activityLabel}
        </div>

        <p className="text-xs text-text-muted mt-2 line-clamp-2 leading-relaxed flex-1">{preview}</p>

        <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-border">
          <button onClick={onOpen} className="text-xs text-brand-primary hover:underline">
            Ver prompt completo
          </button>
          <div className="relative">
            <Button
              size="sm"
              variant="outline"
              rightIcon={<ChevronRight size={12} />}
              onClick={() => setMenuOpen((v) => !v)}
              disabled={isPending}
              title={isPending ? "Prompt pendente de reescrita" : undefined}
            >
              Usar em projeto
            </Button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 w-56 rounded-md border border-border bg-white shadow-card py-1 max-h-60 overflow-y-auto">
                  {projects.map((pr) => (
                    <button
                      key={pr.id}
                      onClick={() => {
                        setMenuOpen(false);
                        navigate(projectPromptPath(pr.id, prompt.id));
                      }}
                      className="block w-full text-left px-3 py-2 text-xs hover:bg-surface text-text-primary truncate"
                    >
                      {pr.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function PromptDetail({ prompt, projects }: { prompt: PromptDef; projects: { id: string; name: string }[] }) {
  const [copied, setCopied] = useState(false);
  const isPending = prompt.status === "pending";
  const navigate = useNavigate();

  function copy() {
    // Regra da biblioteca: o PD.0 acompanha todo prompt enviado ao modelo.
    navigator.clipboard.writeText(withDataProtocol(prompt.body));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        <Badge tone="neutral">{prompt.id}</Badge>
        {prompt.tier && <Badge tone={TIER_TONE[prompt.tier]}>{prompt.tier} · {prompt.modelo}</Badge>}
        <Badge tone="neutral">{prompt.phaseLabel}</Badge>
        <Badge tone="neutral">{prompt.activityLabel}</Badge>
        {isPending && <Badge tone="amber">Aguarda especialista</Badge>}
      </div>

      {isPending && (
        <div className="rounded-md border border-accent-amber/30 bg-accent-amber/10 px-4 py-3 text-xs text-text-primary">
          A revisão ET-05 registrou crítica de método neste prompt, mas não teve autoridade
          técnica para reescrevê-lo. Ele está na biblioteca como registro — não use como está.
        </div>
      )}

      {(prompt.insumos || prompt.entregavel) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {prompt.insumos && (
            <div className="rounded-md border border-border bg-surface px-3 py-2">
              <div className="text-[10px] uppercase tracking-wider text-text-faint mb-1">Insumos</div>
              <div className="text-xs text-text-primary leading-relaxed">{prompt.insumos}</div>
            </div>
          )}
          {prompt.entregavel && (
            <div className="rounded-md border border-border bg-surface px-3 py-2">
              <div className="text-[10px] uppercase tracking-wider text-text-faint mb-1">Entregável</div>
              <div className="text-xs text-text-primary leading-relaxed">{prompt.entregavel}</div>
            </div>
          )}
        </div>
      )}

      <pre className="whitespace-pre-wrap rounded-md border border-border bg-surface p-4 font-mono text-xs text-text-primary leading-relaxed max-h-96 overflow-y-auto">
        {prompt.body}
      </pre>

      {prompt.alternativo && (
        <p className="text-[11px] text-text-faint">
          Modelo alternativo: <span className="font-medium text-text-muted">{prompt.alternativo}</span>
        </p>
      )}

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
        <Button
          variant="secondary"
          size="sm"
          disabled={isPending}
          leftIcon={copied ? <Check size={14} /> : <Copy size={14} />}
          onClick={copy}
          title={isPending ? "Prompt pendente de reescrita" : "Copia o prompt já com o Protocolo de Dados (PD.0)"}
        >
          {copied ? "Copiado com PD.0" : "Copiar prompt"}
        </Button>
        <select
          onChange={(e) => {
            if (e.target.value) navigate(projectPromptPath(e.target.value, prompt.id));
          }}
          disabled={isPending}
          defaultValue=""
          className="h-9 rounded-md border border-border bg-white px-2.5 text-sm focus:border-brand-primary focus:outline-none"
        >
          <option value="">Usar em projeto...</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
