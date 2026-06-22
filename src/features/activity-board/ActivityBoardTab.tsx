import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Plus, MessageCircleWarning } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { ComplexityBadge, LLMImpact } from "@/components/ui/StatusPills";
import { Drawer, Modal } from "@/components/ui/Modal";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { useProjectsStore } from "@/store/projects-store";
import type { Activity, ActivityStatusValue } from "@/types";
import { cn } from "@/lib/utils";
import { useUsersStore } from "@/store/users-store";

const COLUMNS: { id: ActivityStatusValue; label: string; tone: string; dot: string }[] = [
  { id: "todo", label: "A fazer", tone: "bg-[#F0EDE6] text-text-muted", dot: "bg-text-faint" },
  { id: "in_progress", label: "Em andamento", tone: "bg-brand-primary/10 text-brand-primary", dot: "bg-brand-primary" },
  { id: "review", label: "Em revisão", tone: "bg-accent-amber/10 text-accent-amber", dot: "bg-accent-amber" },
  { id: "done", label: "Concluída", tone: "bg-accent-green/10 text-accent-green", dot: "bg-accent-green" },
];

export function ActivityBoardTab({ projectId }: { projectId: string }) {
  const activities = useProjectsStore((s) => s.activitiesByProject[projectId] ?? []);
  const update = useProjectsStore((s) => s.updateActivityStatus);
  const addActivity = useProjectsStore((s) => s.addActivity);

  const [selected, setSelected] = useState<Activity | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const grouped = useMemo(() => {
    const groups: Record<ActivityStatusValue, Activity[]> = { todo: [], in_progress: [], review: [], done: [] };
    for (const a of activities) {
      const status = (a.status ?? "todo") as ActivityStatusValue;
      groups[status].push(a);
    }
    return groups;
  }, [activities]);

  function onDragStart(e: DragStartEvent) {
    setDraggingId(String(e.active.id));
  }
  function onDragEnd(e: DragEndEvent) {
    setDraggingId(null);
    const overId = e.over?.id as ActivityStatusValue | undefined;
    if (!overId) return;
    update(projectId, String(e.active.id), overId);
  }

  const draggingActivity = draggingId ? activities.find((a) => a.id === draggingId) : null;

  if (activities.length === 0) {
    return (
      <EmptyState
        icon={<Plus size={28} />}
        title="Nenhuma atividade ainda"
        description="Adicione a primeira atividade deste projeto para começar."
        action={<Button onClick={() => setShowAdd(true)} leftIcon={<Plus size={14} />}>Atividade</Button>}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-text-muted">
          {activities.length} atividades · {grouped.done.length} concluídas
        </div>
        <Button size="sm" variant="outline" leftIcon={<Plus size={14} />} onClick={() => setShowAdd(true)}>
          Atividade
        </Button>
      </div>

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {COLUMNS.map((col) => (
            <Column key={col.id} col={col} count={grouped[col.id].length}>
              {grouped[col.id].map((a) => (
                <ActivityCard key={a.id} activity={a} onClick={() => setSelected(a)} />
              ))}
              {grouped[col.id].length === 0 && (
                <div className="text-[11px] text-text-faint text-center py-6">Sem atividades</div>
              )}
            </Column>
          ))}
        </div>

        <DragOverlay>
          {draggingActivity && (
            <div className="cursor-grabbing rotate-1 opacity-90">
              <ActivityCardInner activity={draggingActivity} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <Drawer open={!!selected} onClose={() => setSelected(null)} title="Detalhe da atividade">
        {selected && <ActivityDetail activity={selected} projectId={projectId} onClose={() => setSelected(null)} />}
      </Drawer>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nova atividade">
        <AddActivityForm
          onSubmit={(a) => {
            addActivity(projectId, a);
            setShowAdd(false);
          }}
          onCancel={() => setShowAdd(false)}
        />
      </Modal>
    </div>
  );
}

function Column({
  col,
  count,
  children,
}: {
  col: (typeof COLUMNS)[number];
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-lg border border-border bg-surface min-h-[400px] flex flex-col transition-colors",
        isOver && "border-brand-primary/40 bg-brand-primary/5"
      )}
    >
      <div className="px-3 py-2 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2">
          <span className={cn("h-1.5 w-1.5 rounded-full", col.dot)} />
          <span className="text-xs font-semibold text-text-primary">{col.label}</span>
        </div>
        <span className="text-[10px] text-text-faint font-mono">{count}</span>
      </div>
      <div className="p-2 space-y-2 flex-1">{children}</div>
    </div>
  );
}

function ActivityCard({ activity, onClick }: { activity: Activity; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: activity.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        if (!isDragging) onClick();
        e.stopPropagation();
      }}
      className={cn("cursor-grab", isDragging && "opacity-30")}
    >
      <ActivityCardInner activity={activity} />
    </div>
  );
}

function ActivityCardInner({ activity }: { activity: Activity }) {
  return (
    <div className="rounded-md border border-border bg-white p-3 shadow-card hover:border-brand-primary/30">
      <div className="text-xs font-medium text-text-primary leading-snug">{activity.label}</div>
      <div className="flex flex-wrap items-center gap-1 mt-2">
        <ComplexityBadge level={activity.complexity} />
        <LLMImpact level={activity.llmImpact} />
      </div>
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
        <div className="flex items-center gap-1.5">
          {activity.assignee && <Avatar initials={activity.assignee.initials} size="xs" />}
          {activity.dueDate && (
            <span className="text-[10px] text-text-muted font-mono">
              {new Date(activity.dueDate).toLocaleDateString("pt-BR")}
            </span>
          )}
        </div>
        {activity.pendingCount && activity.pendingCount > 0 ? (
          <span className="inline-flex items-center gap-1 text-[10px] text-accent-amber font-mono">
            <MessageCircleWarning size={10} />
            {activity.pendingCount}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function ActivityDetail({
  activity,
  projectId,
  onClose,
}: {
  activity: Activity;
  projectId: string;
  onClose: () => void;
}) {
  const update = useProjectsStore((s) => s.updateActivityStatus);
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-text-primary">{activity.label}</h3>
        <p className="text-sm text-text-muted mt-1">{activity.description}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Info label="Complexidade"><ComplexityBadge level={activity.complexity} /></Info>
        <Info label="Impacto IA"><LLMImpact level={activity.llmImpact} /></Info>
        <Info label="Fase">{activity.phase}</Info>
        <Info label="Responsável">
          {activity.assignee ? (
            <span className="inline-flex items-center gap-1.5">
              <Avatar initials={activity.assignee.initials} size="xs" />
              <span className="text-xs">{activity.assignee.name}</span>
            </span>
          ) : "—"}
        </Info>
        <Info label="Data prevista">
          {activity.dueDate ? new Date(activity.dueDate).toLocaleDateString("pt-BR") : "—"}
        </Info>
        <Info label="Índice IA">{activity.llmIndexMin}–{activity.llmIndexMax}%</Info>
      </div>

      <div>
        <div className="text-[11px] uppercase tracking-wider text-text-faint mb-2">Atualizar status</div>
        <div className="grid grid-cols-4 gap-1.5">
          {COLUMNS.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                update(projectId, activity.id, c.id);
                onClose();
              }}
              className={cn(
                "rounded-md border border-border bg-white px-2 py-2 text-[11px] hover:border-brand-primary",
                activity.status === c.id && "border-brand-primary bg-brand-primary/5"
              )}
            >
              <span className={cn("inline-block h-1.5 w-1.5 rounded-full mr-1.5 align-middle", c.dot)} />
              {c.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] text-text-faint mb-1">{label}</div>
      <div className="text-sm text-text-primary">{children}</div>
    </div>
  );
}

function AddActivityForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (a: Activity) => void;
  onCancel: () => void;
}) {
  const users = useUsersStore((s) => s.users);
  const fetchUsers = useUsersStore((s) => s.fetchUsers);
  useEffect(() => { if (users.length === 0) fetchUsers(); }, [users.length, fetchUsers]);
  const activeUsers = users.filter((u) => u.active !== false);

  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [complexity, setComplexity] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [llm, setLLM] = useState<"high" | "medium" | "low">("medium");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    if (!assigneeId && activeUsers.length > 0) setAssigneeId(activeUsers[0].id);
  }, [activeUsers, assigneeId]);

  return (
    <div className="space-y-4">
      <Field label="Título" required>
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="ex: Reunião de alinhamento" />
      </Field>
      <Field label="Descrição">
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Complexidade">
          <Select value={complexity} onChange={(e) => setComplexity(Number(e.target.value) as any)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>C{n}</option>
            ))}
          </Select>
        </Field>
        <Field label="Impacto IA">
          <Select value={llm} onChange={(e) => setLLM(e.target.value as any)}>
            <option value="high">Alto</option>
            <option value="medium">Médio</option>
            <option value="low">Baixo</option>
          </Select>
        </Field>
        <Field label="Responsável">
          <Select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
            {activeUsers.length === 0 && <option value="">Nenhum usuário cadastrado</option>}
            {activeUsers.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Data prevista">
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button
          disabled={!label.trim()}
          onClick={() => {
            onSubmit({
              id: "act-" + Math.random().toString(36).slice(2, 7),
              label,
              description: description || "Atividade custom adicionada manualmente.",
              complexity,
              llmImpact: llm,
              llmIndexMin: llm === "high" ? 35 : llm === "medium" ? 20 : 10,
              llmIndexMax: llm === "high" ? 55 : llm === "medium" ? 35 : 20,
              phase: "execucao",
              status: "todo",
              assignee: activeUsers.find((u) => u.id === assigneeId),
              dueDate: dueDate || undefined,
            });
          }}
        >
          Adicionar
        </Button>
      </div>
    </div>
  );
}
