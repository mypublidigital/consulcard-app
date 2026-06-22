import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Sparkles, X } from "lucide-react";
import { PageWrapper, PageHeader } from "@/components/layout/PageWrapper";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { PROJECT_TYPES, MACRO_COLOR_CLASSES } from "@/mocks/project-types";
import { getActivitiesForType } from "@/mocks/activities";
import { useProjectsStore } from "@/store/projects-store";
import { useUsersStore } from "@/store/users-store";
import { initials, cn } from "@/lib/utils";
import { ComplexityBadge, LLMImpact } from "@/components/ui/StatusPills";
import type { Project, User } from "@/types";

const SIZES = [
  { id: "P1", label: "P1", description: "Pequeno · até 4 semanas" },
  { id: "P2", label: "P2", description: "Pequeno-Médio · até 8 semanas" },
  { id: "P3", label: "P3", description: "Médio · até 16 semanas" },
  { id: "P4", label: "P4", description: "Grande · até 30 semanas" },
  { id: "P5", label: "P5", description: "Muito Grande · 30+ semanas" },
] as const;

interface FormState {
  name: string;
  client: string;
  clientInitials: string;
  managerId: string;
  consultantIds: string[];
  startDate: string;
  targetEndDate: string;
  macroCategory: string;
  projectType: string;
  size: typeof SIZES[number]["id"] | "";
  tags: string[];
}

const initialForm: FormState = {
  name: "",
  client: "",
  clientInitials: "",
  managerId: "",
  consultantIds: [],
  startDate: "",
  targetEndDate: "",
  macroCategory: "",
  projectType: "",
  size: "",
  tags: [],
};

export function NewProjectPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [tagInput, setTagInput] = useState("");
  const navigate = useNavigate();
  const addProject = useProjectsStore((s) => s.addProject);
  const users = useUsersStore((s) => s.users);
  const fetchUsers = useUsersStore((s) => s.fetchUsers);

  useEffect(() => { if (users.length === 0) fetchUsers(); }, [users.length, fetchUsers]);

  // Managers can be admin/diretor/gerente; consultants are everyone (admin/diretor can also play that role).
  const managerOptions = useMemo(
    () => users.filter((u) => u.active !== false && (u.systemRole === "admin" || u.systemRole === "diretor" || u.systemRole === "gerente")),
    [users]
  );
  const consultantOptions = useMemo(
    () => users.filter((u) => u.active !== false),
    [users]
  );

  // Default the manager once users load.
  useEffect(() => {
    if (!form.managerId && managerOptions.length > 0) {
      setForm((f) => ({ ...f, managerId: managerOptions[0].id }));
    }
  }, [managerOptions, form.managerId]);

  const macro = PROJECT_TYPES.find((m) => m.id === form.macroCategory);
  const projectType = macro?.types.find((t) => t.id === form.projectType);
  const previewActivities = useMemo(
    () => (form.projectType ? getActivitiesForType(form.projectType) : []),
    [form.projectType]
  );
  const avgLLM = useMemo(() => {
    if (previewActivities.length === 0) return 0;
    const avg = previewActivities.reduce((a, x) => a + (x.llmIndexMin + x.llmIndexMax) / 2, 0) / previewActivities.length;
    return Math.round(avg);
  }, [previewActivities]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validateStep(s: number): boolean {
    const errs: typeof errors = {};
    if (s === 1) {
      if (!form.name.trim()) errs.name = "Informe o nome do projeto";
      if (!form.client.trim()) errs.client = "Informe o cliente";
      if (!form.managerId) errs.managerId = "Selecione o gerente";
      if (!form.startDate) errs.startDate = "Informe a data de kick-off";
      if (!form.targetEndDate) errs.targetEndDate = "Informe a data prevista";
    }
    if (s === 2) {
      if (!form.macroCategory) errs.macroCategory = "Selecione a macro-categoria";
      if (!form.projectType) errs.projectType = "Selecione o tipo de projeto";
      if (!form.size) errs.size = "Selecione o porte";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function next() {
    if (validateStep(step)) setStep((s) => (Math.min(3, s + 1) as 1 | 2 | 3));
  }
  function prev() {
    setStep((s) => (Math.max(1, s - 1) as 1 | 2 | 3));
  }

  function submit() {
    if (!form.size || !macro || !projectType) return;
    const manager = users.find((u) => u.id === form.managerId)!;
    const consultants = users.filter((u) => form.consultantIds.includes(u.id));
    const id = "proj-" + Math.random().toString(36).slice(2, 7);
    const project: Project = {
      id,
      name: form.name,
      client: form.client,
      clientInitials: (form.clientInitials || initials(form.client)).slice(0, 3).toUpperCase(),
      macroCategory: form.macroCategory,
      projectType: form.projectType,
      size: form.size,
      complexity: Math.max(1, Math.min(5, parseInt(projectType.complexity.split("-").pop() ?? "3"))) as 1 | 2 | 3 | 4 | 5,
      status: "planning",
      startDate: form.startDate,
      targetEndDate: form.targetEndDate,
      manager,
      consultants,
      progress: 0,
      activitiesTotal: previewActivities.length,
      activitiesDone: 0,
      activitiesDelayed: 0,
      lastUpdate: new Date().toISOString().slice(0, 10),
      tags: form.tags,
    };
    addProject(project, form.projectType);
    navigate(`/projects/${id}`);
  }

  return (
    <PageWrapper>
      <PageHeader
        title="Novo Projeto"
        subtitle="Cadastre um novo projeto de consultoria em 3 etapas"
      />

      <Stepper step={step} />

      <Card className="mt-4">
        <CardBody>
          {step === 1 && <Step1 form={form} update={update} errors={errors} managers={managerOptions} consultants={consultantOptions} />}
          {step === 2 && (
            <Step2
              form={form}
              update={update}
              errors={errors}
              tagInput={tagInput}
              setTagInput={setTagInput}
              previewActivities={previewActivities}
              avgLLM={avgLLM}
            />
          )}
          {step === 3 && (
            <Step3 form={form} previewActivities={previewActivities} avgLLM={avgLLM} users={users} />
          )}

          <div className="flex items-center justify-between mt-8 pt-5 border-t border-border">
            <Button variant="ghost" onClick={prev} disabled={step === 1} leftIcon={<ArrowLeft size={14} />}>
              Voltar
            </Button>
            {step < 3 ? (
              <Button onClick={next} rightIcon={<ArrowRight size={14} />}>
                Próximo passo
              </Button>
            ) : (
              <Button onClick={submit} leftIcon={<Check size={14} />}>
                Criar Projeto
              </Button>
            )}
          </div>
        </CardBody>
      </Card>
    </PageWrapper>
  );
}

function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const labels = ["Identificação", "Classificação", "Revisão"];
  return (
    <div className="flex items-center gap-3">
      {labels.map((label, idx) => {
        const n = (idx + 1) as 1 | 2 | 3;
        const active = n === step;
        const done = n < step;
        return (
          <div key={label} className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold border",
                  done && "bg-accent-green text-white border-accent-green",
                  active && "bg-brand-primary text-white border-brand-primary",
                  !done && !active && "bg-white text-text-muted border-border"
                )}
              >
                {done ? <Check size={14} /> : n}
              </div>
              <span
                className={cn(
                  "text-sm",
                  active ? "font-semibold text-text-primary" : "text-text-muted"
                )}
              >
                {label}
              </span>
            </div>
            {idx < labels.length - 1 && <div className="h-px w-12 bg-border" />}
          </div>
        );
      })}
    </div>
  );
}

function Step1({
  form,
  update,
  errors,
  managers,
  consultants,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  errors: Partial<Record<keyof FormState, string>>;
  managers: User[];
  consultants: User[];
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <Field label="Nome do projeto" required error={errors.name} className="md:col-span-2">
        <Input
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder="ex: Migração Orbital → Dock"
        />
      </Field>
      <Field label="Cliente" required error={errors.client}>
        <Input
          value={form.client}
          onChange={(e) => update("client", e.target.value)}
          placeholder="ex: Fintech Consignado S.A."
        />
      </Field>
      <Field label="Iniciais (avatar)" hint="2-3 letras, geradas automaticamente se vazio">
        <Input
          value={form.clientInitials}
          onChange={(e) => update("clientInitials", e.target.value.slice(0, 3).toUpperCase())}
          placeholder="FC"
        />
      </Field>
      <Field label="Gerente de projeto" required error={errors.managerId}>
        <Select value={form.managerId} onChange={(e) => update("managerId", e.target.value)}>
          {managers.length === 0 && <option value="">Nenhum gerente cadastrado</option>}
          {managers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}{u.role ? ` · ${u.role}` : ""}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Consultores alocados" hint="Selecione múltiplos com Ctrl/Cmd">
        <select
          multiple
          value={form.consultantIds}
          onChange={(e) =>
            update(
              "consultantIds",
              Array.from(e.target.selectedOptions).map((o) => o.value)
            )
          }
          className="min-h-[90px] rounded-md border border-border bg-white px-2 py-1.5 text-sm"
        >
          {consultants.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Data de kick-off" required error={errors.startDate}>
        <Input type="date" value={form.startDate} onChange={(e) => update("startDate", e.target.value)} />
      </Field>
      <Field label="Data prevista de encerramento" required error={errors.targetEndDate}>
        <Input
          type="date"
          value={form.targetEndDate}
          onChange={(e) => update("targetEndDate", e.target.value)}
        />
      </Field>
    </div>
  );
}

function Step2({
  form,
  update,
  errors,
  tagInput,
  setTagInput,
  previewActivities,
  avgLLM,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  errors: Partial<Record<keyof FormState, string>>;
  tagInput: string;
  setTagInput: (v: string) => void;
  previewActivities: ReturnType<typeof getActivitiesForType>;
  avgLLM: number;
}) {
  const macro = PROJECT_TYPES.find((m) => m.id === form.macroCategory);
  const projectType = macro?.types.find((t) => t.id === form.projectType);
  const complexity = projectType ? Math.max(1, Math.min(5, parseInt(projectType.complexity.split("-").pop() ?? "3"))) : 3;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
      <div className="space-y-6">
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <div className="text-sm font-medium text-text-primary">
              Macro-categoria <span className="text-accent-red">*</span>
            </div>
            {errors.macroCategory && <div className="text-[11px] text-accent-red">{errors.macroCategory}</div>}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {PROJECT_TYPES.map((m) => {
              const colors = MACRO_COLOR_CLASSES[m.color];
              const selected = form.macroCategory === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    update("macroCategory", m.id);
                    update("projectType", "");
                  }}
                  className={cn(
                    "rounded-lg border p-3 text-left transition-all",
                    selected
                      ? `${colors.border} ${colors.soft} ring-2 ${colors.border.replace("border-", "ring-")}/30`
                      : "border-border bg-white hover:border-text-faint"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2.5 w-2.5 rounded-full", colors.bg)} />
                    <div className={cn("text-xs font-semibold", selected ? colors.text : "text-text-primary")}>
                      {m.label}
                    </div>
                  </div>
                  <div className="text-[11px] text-text-faint mt-1">{m.types.length} tipos disponíveis</div>
                </button>
              );
            })}
          </div>
        </div>

        {macro && (
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <div className="text-sm font-medium text-text-primary">
                Tipo de projeto <span className="text-accent-red">*</span>
              </div>
              {errors.projectType && <div className="text-[11px] text-accent-red">{errors.projectType}</div>}
            </div>
            <div className="space-y-1.5">
              {macro.types.map((t) => {
                const selected = form.projectType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => update("projectType", t.id)}
                    className={cn(
                      "w-full flex items-center justify-between rounded-md border px-3 py-2.5 text-left text-sm transition-all",
                      selected ? "border-brand-primary bg-brand-primary/5" : "border-border bg-white hover:border-text-faint"
                    )}
                  >
                    <div>
                      <div className="font-medium text-text-primary flex items-center gap-2">
                        {t.label}
                        {t.anchor && <Badge tone="amber" size="sm">Âncora</Badge>}
                      </div>
                      <div className="text-[11px] text-text-faint mt-0.5 font-mono">complexidade {t.complexity}</div>
                    </div>
                    {selected && <Check size={16} className="text-brand-primary" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <div className="flex items-baseline justify-between mb-2">
            <div className="text-sm font-medium text-text-primary">
              Porte estimado <span className="text-accent-red">*</span>
            </div>
            {errors.size && <div className="text-[11px] text-accent-red">{errors.size}</div>}
          </div>
          <div className="grid grid-cols-5 gap-2">
            {SIZES.map((s) => {
              const selected = form.size === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => update("size", s.id)}
                  className={cn(
                    "rounded-md border p-3 text-center transition-all",
                    selected ? "border-brand-primary bg-brand-primary/5" : "border-border bg-white hover:border-text-faint"
                  )}
                >
                  <div className={cn("text-base font-semibold", selected ? "text-brand-primary" : "text-text-primary")}>
                    {s.label}
                  </div>
                  <div className="text-[10px] text-text-faint mt-1 leading-tight">{s.description}</div>
                </button>
              );
            })}
          </div>
        </div>

        <Field label="Tags" hint="Pressione Enter para adicionar">
          <div className="flex flex-wrap gap-1.5 items-center rounded-md border border-border bg-white px-2 py-1.5 min-h-[36px]">
            {form.tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 rounded-full bg-[#F0EDE6] px-2 py-0.5 text-[11px] text-text-muted"
              >
                {t}
                <button
                  type="button"
                  onClick={() => update("tags", form.tags.filter((x) => x !== t))}
                  aria-label={`Remover ${t}`}
                >
                  <X size={10} />
                </button>
              </span>
            ))}
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && tagInput.trim()) {
                  e.preventDefault();
                  if (!form.tags.includes(tagInput.trim())) {
                    update("tags", [...form.tags, tagInput.trim()]);
                  }
                  setTagInput("");
                }
              }}
              placeholder="adicionar tag..."
              className="flex-1 min-w-[100px] bg-transparent text-xs outline-none"
            />
          </div>
        </Field>
      </div>

      <div className="lg:sticky lg:top-4 lg:self-start">
        <Card className="bg-brand-primary/5 border-brand-primary/20">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} className="text-brand-primary" />
              <span className="text-xs font-semibold text-brand-primary uppercase tracking-wide">Preview</span>
            </div>
            {projectType ? (
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-[11px] text-text-faint">Tipo selecionado</div>
                  <div className="font-medium text-text-primary">{projectType.label}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[11px] text-text-faint">Atividades</div>
                    <div className="text-lg font-semibold text-text-primary">{previewActivities.length}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-text-faint">Impacto IA médio</div>
                    <div className="text-lg font-semibold text-text-primary">{avgLLM}%</div>
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-text-faint mb-1">Complexidade</div>
                  <ComplexityBadge level={complexity} />
                </div>
                <p className="text-[11px] text-text-muted leading-relaxed pt-2 border-t border-brand-primary/10">
                  Ao criar, o sistema carregará automaticamente {previewActivities.length} atividades padrão deste tipo
                  no board do projeto.
                </p>
              </div>
            ) : (
              <p className="text-xs text-text-muted">
                Selecione uma macro-categoria e um tipo de projeto para ver o preview de atividades e impacto IA.
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Step3({
  form,
  previewActivities,
  avgLLM,
  users,
}: {
  form: FormState;
  previewActivities: ReturnType<typeof getActivitiesForType>;
  avgLLM: number;
  users: User[];
}) {
  const macro = PROJECT_TYPES.find((m) => m.id === form.macroCategory);
  const projectType = macro?.types.find((t) => t.id === form.projectType);
  const manager = users.find((u) => u.id === form.managerId);
  const consultants = users.filter((u) => form.consultantIds.includes(u.id));

  return (
    <div className="space-y-6">
      <h2 className="text-sm font-semibold text-text-primary">Revisão</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h3 className="text-[11px] uppercase tracking-wider text-text-faint">Identificação</h3>
          <Row label="Nome" value={form.name} />
          <Row label="Cliente" value={form.client} />
          <Row label="Gerente" value={manager?.name ?? "—"} />
          <Row
            label="Consultores"
            value={consultants.length > 0 ? consultants.map((c) => c.name).join(", ") : "—"}
          />
          <Row label="Kick-off" value={form.startDate ? new Date(form.startDate).toLocaleDateString("pt-BR") : "—"} />
          <Row
            label="Encerramento previsto"
            value={form.targetEndDate ? new Date(form.targetEndDate).toLocaleDateString("pt-BR") : "—"}
          />
        </div>
        <div className="space-y-3">
          <h3 className="text-[11px] uppercase tracking-wider text-text-faint">Classificação</h3>
          <Row label="Macro-categoria" value={macro?.label ?? "—"} />
          <Row label="Tipo" value={projectType?.label ?? "—"} />
          <Row label="Porte" value={form.size || "—"} />
          <Row label="Tags" value={form.tags.length > 0 ? form.tags.map((t) => `#${t}`).join(" ") : "—"} />
          <Row label="Atividades a carregar" value={`${previewActivities.length} atividades`} />
          <Row label="Impacto IA médio" value={`${avgLLM}%`} />
        </div>
      </div>

      <div className="pt-5 border-t border-border">
        <h3 className="text-sm font-semibold text-text-primary mb-3">
          Atividades que serão carregadas <span className="text-text-muted font-normal">({previewActivities.length})</span>
        </h3>
        <div className="rounded-lg border border-border bg-surface divide-y divide-border">
          {previewActivities.map((a, idx) => (
            <div key={a.id} className="px-4 py-3 flex items-center gap-3">
              <span className="text-[11px] text-text-faint font-mono w-5">{idx + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-text-primary truncate">{a.label}</div>
                <div className="text-[11px] text-text-muted truncate">{a.description}</div>
              </div>
              <ComplexityBadge level={a.complexity} />
              <LLMImpact level={a.llmImpact} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="text-xs text-text-faint w-36 shrink-0">{label}</span>
      <span className="text-sm text-text-primary">{value}</span>
    </div>
  );
}
