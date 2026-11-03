import { useEffect, useState } from "react";
import { X, Save, Check, Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { PeoplePicker } from "@/components/ui/PeoplePicker";
import { useProjectsStore } from "@/store/projects-store";
import { useUsersStore } from "@/store/users-store";
import { PROJECT_STATUS_OPTIONS } from "@/components/ui/StatusPills";
import type { Project } from "@/types";

export function EditProjectModal({ project, onClose }: { project: Project; onClose: () => void }) {
  const updateProject = useProjectsStore((s) => s.updateProject);
  const users = useUsersStore((s) => s.users);
  const fetchUsers = useUsersStore((s) => s.fetchUsers);
  useEffect(() => { if (users.length === 0) fetchUsers(); }, [users.length, fetchUsers]);

  const managers = users.filter((u) =>
    u.active !== false && (u.systemRole === "gerente" || u.systemRole === "admin" || u.systemRole === "diretor")
  );
  const consultantOptions = users.filter((u) => u.active !== false);

  const [form, setForm] = useState({
    name: project.name,
    client: project.client,
    status: project.status,
    managerId: project.manager?.id ?? "",
    consultantIds: project.consultants.map((c) => c.id),
    startDate: project.startDate,
    targetEndDate: project.targetEndDate,
    tags: project.tags.join(", "),
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaving(true);
    const manager = users.find((u) => u.id === form.managerId) ?? project.manager;
    const consultants = users.filter((u) => form.consultantIds.includes(u.id));
    updateProject(project.id, {
      name: form.name.trim(),
      client: form.client.trim(),
      status: form.status,
      manager,
      consultants,
      startDate: form.startDate,
      targetEndDate: form.targetEndDate,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
    });
    setSaved(true);
    setTimeout(onClose, 700);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="flex w-full max-w-lg max-h-[calc(100dvh-2rem)] flex-col bg-white rounded-xl shadow-2xl border border-border">
        <div className="flex shrink-0 items-center justify-between px-6 py-4 border-b border-border rounded-t-xl">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-brand-primary/10 text-brand-primary flex items-center justify-center">
              <Pencil size={15} />
            </div>
            <div>
              <div className="text-sm font-semibold text-text-primary">Editar projeto</div>
              <div className="text-[10px] text-text-faint">Atualize os dados do projeto</div>
            </div>
          </div>
          <button onClick={onClose} className="text-text-faint hover:text-text-primary">
            <X size={18} />
          </button>
        </div>

        {/* Conteúdo rola; botões ficam fixos no rodapé, sempre visíveis. */}
        <div className="min-h-0 flex-1 overflow-y-auto p-6 space-y-4">
          <Field label="Nome do projeto" required>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </Field>
          <Field label="Cliente" required>
            <Input value={form.client} onChange={(e) => setForm((f) => ({ ...f, client: e.target.value }))} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <Select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Project["status"] }))}
              >
                {PROJECT_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Gerente">
              <Select
                value={form.managerId}
                onChange={(e) => setForm((f) => ({ ...f, managerId: e.target.value }))}
              >
                {managers.length === 0 && <option value="">Nenhum gerente cadastrado</option>}
                {managers.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Consultores alocados" hint="Marque quantos forem necessários">
            <PeoplePicker
              people={consultantOptions}
              value={form.consultantIds}
              onChange={(ids) => setForm((f) => ({ ...f, consultantIds: ids }))}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data de kick-off">
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              />
            </Field>
            <Field label="Data prevista de encerramento">
              <Input
                type="date"
                value={form.targetEndDate}
                onChange={(e) => setForm((f) => ({ ...f, targetEndDate: e.target.value }))}
              />
            </Field>
          </div>
          <Field label="Tags" hint="separe por vírgula">
            <Input
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              placeholder="migração, regulatório, ..."
            />
          </Field>
        </div>

        <div className="shrink-0 border-t border-border px-6 py-4">
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1"
              leftIcon={saved ? <Check size={14} /> : <Save size={14} />}
            >
              {saved ? "Salvo!" : saving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
