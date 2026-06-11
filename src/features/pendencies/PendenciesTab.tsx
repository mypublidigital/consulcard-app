import { useState } from "react";
import { Plus, Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Field, Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { useProjectsStore } from "@/store/projects-store";
import { USERS } from "@/mocks/users";
import type { Pendency } from "@/types";

export function PendenciesTab({ projectId }: { projectId: string }) {
  const all = useProjectsStore((s) => s.pendencies);
  const list = all.filter((p) => p.projectId === projectId);
  const add = useProjectsStore((s) => s.addPendency);
  const resolve = useProjectsStore((s) => s.resolvePendency);
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
                  <tr key={p.id} className="border-b border-border last:border-b-0">
                    <td className="px-5 py-3 text-text-primary">{p.description}</td>
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
                    <td className="px-5 py-3 text-right">
                      {p.status === "open" && (
                        <Button size="sm" variant="ghost" leftIcon={<Check size={12} />} onClick={() => resolve(p.id)}>
                          Resolver
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

function AddPendencyForm({
  projectId,
  onSubmit,
  onCancel,
}: {
  projectId: string;
  onSubmit: (p: Pendency) => void;
  onCancel: () => void;
}) {
  const [description, setDescription] = useState("");
  const [ownerType, setOwnerType] = useState<"consultant" | "client">("consultant");
  const [ownerId, setOwnerId] = useState(USERS[0].id);
  const [clientName, setClientName] = useState("");
  const [dueDate, setDueDate] = useState("");

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
              {USERS.map((u) => (
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
              ? USERS.find((u) => u.id === ownerId)!
              : { name: clientName || "Cliente", initials: (clientName || "CL").slice(0, 2).toUpperCase() };
            onSubmit({
              id: "pd-" + Math.random().toString(36).slice(2, 7),
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
