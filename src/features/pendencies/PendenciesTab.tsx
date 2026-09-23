import { useEffect, useState } from "react";
import { Plus, Check, RotateCcw, Pencil } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { useProjectsStore } from "@/store/projects-store";
import { useUsersStore } from "@/store/users-store";
import type { Pendency } from "@/types";

export function PendenciesTab({ projectId }: { projectId: string }) {
  const all = useProjectsStore((s) => s.pendencies);
  const list = all.filter((p) => p.projectId === projectId);
  const add = useProjectsStore((s) => s.addPendency);
  const resolve = useProjectsStore((s) => s.resolvePendency);
  const reopen = useProjectsStore((s) => s.reopenPendency);
  const updatePendency = useProjectsStore((s) => s.updatePendency);
  const [detail, setDetail] = useState<Pendency | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all");

  const filtered = list.filter((p) => filter === "all" || p.status === filter);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5">
          {(["all", "open", "resolved"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs rounded-md ${filter === f ? "bg-brand-primary text-white" : "bg-white border border-border text-text-muted hover:bg-surface"}`}
            >
              {f === "all" ? "Todas" : f === "open" ? "Abertas" : "Resolvidas"}
              <span className="ml-1.5 font-mono text-[10px] opacity-70">
                {f === "all" ? list.length : list.filter((p) => p.status === f).length}
              </span>
            </button>
          ))}
        </div>
        <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => setShowAdd(true)}>
          Pendência
        </Button>
      </div>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState title="Nenhuma pendência" description="Adicione uma pendência manualmente ou deixe o co-piloto extrair de transcrições." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-text-faint border-b border-border">
                  <th className="px-5 py-3 font-medium">Descrição</th>
                  <th className="py-3 font-medium">Responsável</th>
                  <th className="py-3 font-medium">Prazo</th>
                  <th className="py-3 font-medium">Origem</th>
                  <th className="py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-b-0 hover:bg-surface/60">
                    <td className="px-5 py-3">
                      {/* Abrir para ver/editar sem resolver: na reunião, clicar na
                          pendência só para consultar já a marcava como resolvida. */}
                      <button
                        onClick={() => setDetail(p)}
                        className="text-left text-text-primary hover:text-brand-primary hover:underline"
                      >
                        {p.description}
                      </button>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1.5">
                        <Avatar initials={p.owner.initials} size="xs" tone={p.ownerType === "client" ? "amber" : "brand"} />
                        <span className="text-xs">{p.owner.name}</span>
                      </div>
                    </td>
                    <td className="py-3 text-xs text-text-muted font-mono">
                      {new Date(p.dueDate).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="py-3">
                      <Badge tone={p.origin === "agente" ? "purple" : p.origin === "reuniao" ? "blue" : "neutral"} size="sm">
                        {p.origin === "agente" ? "Agente IA" : p.origin === "reuniao" ? "Reunião" : "Manual"}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <Badge tone={p.status === "open" ? "amber" : "green"} size="sm">
                        {p.status === "open" ? "Aberta" : "Resolvida"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <Button size="sm" variant="ghost" leftIcon={<Pencil size={12} />} onClick={() => setDetail(p)}>
                        Abrir
                      </Button>
                      {p.status === "open" ? (
                        <Button size="sm" variant="ghost" leftIcon={<Check size={12} />} onClick={() => resolve(p.id)}>
                          Resolver
                        </Button>
                      ) : (
                        // Antes não havia caminho de volta: resolvida por engano ficava resolvida (item 6).
                        <Button size="sm" variant="ghost" leftIcon={<RotateCcw size={12} />} onClick={() => reopen(p.id)}>
                          Reabrir
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Pendência">
        {detail && (
          <PendencyDetail
            pendency={detail}
            onClose={() => setDetail(null)}
            onSave={(patch) => { updatePendency(detail.id, patch); setDetail(null); }}
            onResolve={() => { resolve(detail.id); setDetail(null); }}
            onReopen={() => { reopen(detail.id); setDetail(null); }}
          />
        )}
      </Modal>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nova pendência">
        <AddPendencyForm
          projectId={projectId}
          onSubmit={(p) => {
            add(p);
            setShowAdd(false);
          }}
          onCancel={() => setShowAdd(false)}
        />
      </Modal>
    </div>
  );
}

/**
 * Detalhe da pendência: consultar e editar sem resolver. Na reunião de 17/09 o
 * time relatou que clicar na pendência só para ver já a marcava como resolvida,
 * e que a descrição não era editável.
 */
function PendencyDetail({
  pendency,
  onClose,
  onSave,
  onResolve,
  onReopen,
}: {
  pendency: Pendency;
  onClose: () => void;
  onSave: (patch: Partial<Pendency>) => void;
  onResolve: () => void;
  onReopen: () => void;
}) {
  const [description, setDescription] = useState(pendency.description);
  const [dueDate, setDueDate] = useState(pendency.dueDate);
  const changed = description.trim() !== pendency.description || dueDate !== pendency.dueDate;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={pendency.status === "open" ? "amber" : "green"} size="sm">
          {pendency.status === "open" ? "Aberta" : "Resolvida"}
        </Badge>
        <Badge tone={pendency.origin === "agente" ? "purple" : pendency.origin === "reuniao" ? "blue" : "neutral"} size="sm">
          {pendency.origin === "agente" ? "Agente IA" : pendency.origin === "reuniao" ? "Reunião" : "Manual"}
        </Badge>
        <span className="text-xs text-text-muted">
          Responsável: <strong className="text-text-primary">{pendency.owner.name}</strong>
          {pendency.ownerType === "client" ? " (Cliente)" : ""}
        </span>
      </div>

      <Field label="Descrição">
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
      </Field>

      <Field label="Prazo">
        <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </Field>

      <div className="flex flex-wrap justify-between gap-2 pt-1">
        {pendency.status === "open" ? (
          <Button variant="secondary" size="sm" leftIcon={<Check size={14} />} onClick={onResolve}>
            Marcar como resolvida
          </Button>
        ) : (
          <Button variant="secondary" size="sm" leftIcon={<RotateCcw size={14} />} onClick={onReopen}>
            Reabrir
          </Button>
        )}
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Fechar</Button>
          <Button
            size="sm"
            disabled={!changed || !description.trim()}
            onClick={() => onSave({ description: description.trim(), dueDate })}
          >
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
}

function AddPendencyForm({
  projectId,
  onSubmit,
  onCancel,
}: {
  projectId: string;
  onSubmit: (p: Pendency) => void;
  onCancel: () => void;
}) {
  const users = useUsersStore((s) => s.users);
  const fetchUsers = useUsersStore((s) => s.fetchUsers);
  useEffect(() => { if (users.length === 0) fetchUsers(); }, [users.length, fetchUsers]);
  const activeUsers = users.filter((u) => u.active !== false);

  const [description, setDescription] = useState("");
  const [ownerType, setOwnerType] = useState<"consultant" | "client">("consultant");
  const [ownerId, setOwnerId] = useState("");
  const [clientName, setClientName] = useState("");
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    if (!ownerId && activeUsers.length > 0) setOwnerId(activeUsers[0].id);
  }, [activeUsers, ownerId]);

  return (
    <div className="space-y-4">
      <Field label="Descrição" required>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="ex: Cliente enviar contratos vigentes" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo de responsável">
          <Select value={ownerType} onChange={(e) => setOwnerType(e.target.value as any)}>
            <option value="consultant">Equipe Consulcard</option>
            <option value="client">Cliente</option>
          </Select>
        </Field>
        {ownerType === "consultant" ? (
          <Field label="Responsável">
            <Select value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
              {activeUsers.length === 0 && <option value="">Nenhum usuário cadastrado</option>}
              {activeUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </Select>
          </Field>
        ) : (
          <Field label="Contato do cliente">
            <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nome / função" />
          </Field>
        )}
        <Field label="Prazo" required>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button
          disabled={!description.trim() || !dueDate}
          onClick={() => {
            const owner = ownerType === "consultant"
              ? activeUsers.find((u) => u.id === ownerId)!
              : { name: clientName || "Cliente", initials: (clientName || "CL").slice(0, 2).toUpperCase() };
            onSubmit({
              id: crypto.randomUUID(),
              projectId,
              description,
              owner,
              ownerType,
              dueDate,
              origin: "manual",
              status: "open",
            });
          }}
        >
          Adicionar
        </Button>
      </div>
    </div>
  );
}
