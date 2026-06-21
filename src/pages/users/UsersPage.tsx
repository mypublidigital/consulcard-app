import { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  Eye,
  EyeOff,
  Shield,
  Crown,
  Briefcase,
  UserCheck,
  X,
  Search,
  ChevronDown,
  Pencil,
  Save,
} from "lucide-react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { useUsersStore } from "@/store/users-store";
import { useAuthStore } from "@/store/auth-store";
import { ROLE_LABELS, ROLE_DESCRIPTIONS } from "@/mocks/users";
import type { User, UserRole } from "@/types";
import { cn } from "@/lib/utils";

// ─── Access Guard ────────────────────────────────────────────────────────────
const ALLOWED_ROLES: UserRole[] = ["admin", "diretor"];

function AccessDenied() {
  return (
    <PageWrapper>
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center">
        <div className="h-16 w-16 rounded-full bg-accent-red/10 text-accent-red flex items-center justify-center">
          <Shield size={28} />
        </div>
        <h2 className="text-xl font-semibold text-text-primary">Acesso restrito</h2>
        <p className="text-sm text-text-muted max-w-sm">
          Esta tela é acessível apenas para usuários com perfil <strong>Admin</strong> ou{" "}
          <strong>Diretor</strong>.
        </p>
        <Badge tone="red" size="md">Sem permissão</Badge>
      </div>
    </PageWrapper>
  );
}

// ─── Role badge helpers ───────────────────────────────────────────────────────
const ROLE_TONE: Record<UserRole, "blue" | "purple" | "amber" | "neutral"> = {
  admin: "blue",
  diretor: "purple",
  gerente: "amber",
  consultor: "neutral",
};

const ROLE_ICON: Record<UserRole, React.ReactNode> = {
  admin: <Shield size={11} />,
  diretor: <Crown size={11} />,
  gerente: <Briefcase size={11} />,
  consultor: <UserCheck size={11} />,
};

// ─── Password cell ────────────────────────────────────────────────────────────
function PasswordCell({ userId, initial }: { userId: string; initial?: string }) {
  const generateNewPassword = useUsersStore((s) => s.generateNewPassword);
  const users = useUsersStore((s) => s.users);
  const user = users.find((u) => u.id === userId);
  const pwd = user?.password ?? initial ?? "—";

  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generated, setGenerated] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const newPwd = await generateNewPassword(userId);
      setGenerated(newPwd);
      setVisible(true);
    } catch (err) {
      console.error("Erro ao gerar senha:", err);
    } finally {
      setGenerating(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(generated ?? pwd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const display = generated ?? pwd;

  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className="font-mono text-xs text-text-primary truncate">
        {visible ? display : "••••••••••"}
      </span>
      <button
        onClick={() => setVisible((v) => !v)}
        className="text-text-faint hover:text-text-muted shrink-0"
        title={visible ? "Ocultar" : "Mostrar"}
      >
        {visible ? <EyeOff size={12} /> : <Eye size={12} />}
      </button>
      <button
        onClick={handleCopy}
        className="text-text-faint hover:text-brand-primary shrink-0"
        title="Copiar"
      >
        {copied ? <Check size={12} className="text-accent-green" /> : <Copy size={12} />}
      </button>
      <button
        onClick={handleGenerate}
        disabled={generating}
        className="text-text-faint hover:text-brand-primary shrink-0 disabled:opacity-50"
        title="Gerar nova senha"
      >
        <RefreshCw size={12} className={cn(generating && "animate-spin")} />
      </button>
    </div>
  );
}

// ─── Add User Modal ───────────────────────────────────────────────────────────
interface AddUserModalProps {
  onClose: () => void;
}

const ROLE_OPTIONS: { value: UserRole; label: string; description: string }[] = [
  { value: "admin", label: "Admin", description: ROLE_DESCRIPTIONS.admin },
  { value: "diretor", label: "Diretor", description: ROLE_DESCRIPTIONS.diretor },
  { value: "gerente", label: "Gerente de Projetos", description: ROLE_DESCRIPTIONS.gerente },
  { value: "consultor", label: "Consultor", description: ROLE_DESCRIPTIONS.consultor },
];

function AddUserModal({ onClose }: AddUserModalProps) {
  const addUser = useUsersStore((s) => s.addUser);

  const [form, setForm] = useState({
    name: "",
    email: "",
    whatsapp: "",
    linkedin: "",
    systemRole: "consultor" as UserRole,
  });
  const [errors, setErrors] = useState<Partial<typeof form>>({});
  const [added, setAdded] = useState<User | null>(null);
  const [showPwd, setShowPwd] = useState(false);
  const [copied, setCopied] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);

  function validate() {
    const e: Partial<typeof form> = {};
    if (!form.name.trim()) e.name = "Nome obrigatório";
    if (!form.email.trim() || !form.email.includes("@")) e.email = "E-mail inválido";
    return e;
  }

  async function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    const roleLabel: Record<UserRole, string> = {
      admin: "Admin",
      diretor: "Diretor",
      gerente: "Gerente de Projeto",
      consultor: "Consultor",
    };

    try {
      const user = await addUser({
        name: form.name.trim(),
        email: form.email.trim(),
        whatsapp: form.whatsapp.trim(),
        linkedin: form.linkedin.trim(),
        systemRole: form.systemRole,
        role: roleLabel[form.systemRole],
      });
      setAdded(user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao criar usuário.";
      setErrors((prev) => ({ ...prev, email: msg }));
    }
  }

  function handleCopy() {
    if (added?.password) {
      navigator.clipboard.writeText(added.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const selectedRole = ROLE_OPTIONS.find((r) => r.value === form.systemRole)!;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-brand-primary/10 text-brand-primary flex items-center justify-center">
              <UserPlus size={16} />
            </div>
            <div>
              <div className="text-sm font-semibold text-text-primary">
                {added ? "Usuário criado" : "Novo usuário"}
              </div>
              <div className="text-[10px] text-text-faint">
                {added ? "Compartilhe a senha gerada" : "Preencha os dados do novo membro"}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-text-faint hover:text-text-primary">
            <X size={18} />
          </button>
        </div>

        {added ? (
          /* Success state */
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-accent-green/10 border border-accent-green/20">
              <div className="h-10 w-10 rounded-full bg-accent-green/20 text-accent-green flex items-center justify-center font-semibold text-sm shrink-0">
                {added.initials}
              </div>
              <div>
                <div className="text-sm font-semibold text-text-primary">{added.name}</div>
                <div className="text-xs text-text-muted">{added.email}</div>
                <Badge tone={ROLE_TONE[added.systemRole!]} size="sm" className="mt-1">
                  {ROLE_ICON[added.systemRole!]}
                  {ROLE_LABELS[added.systemRole!]}
                </Badge>
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-wider text-text-faint mb-2">
                Senha gerada automaticamente
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-surface font-mono text-sm">
                <span className="flex-1">{showPwd ? added.password : "••••••••••••"}</span>
                <button onClick={() => setShowPwd((v) => !v)} className="text-text-faint hover:text-text-muted">
                  {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button onClick={handleCopy} className="text-text-faint hover:text-brand-primary">
                  {copied ? <Check size={14} className="text-accent-green" /> : <Copy size={14} />}
                </button>
              </div>
              <p className="text-[10px] text-text-faint mt-1.5">
                Compartilhe a senha com segurança. O usuário deverá alterá-la no primeiro acesso.
              </p>
            </div>

            <Button onClick={onClose} className="w-full" variant="secondary">
              Fechar
            </Button>
          </div>
        ) : (
          /* Form state */
          <div className="p-6 space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-text-primary mb-1.5">
                Nome completo <span className="text-accent-red">*</span>
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Ana Rodrigues"
                className={cn(
                  "w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary",
                  errors.name ? "border-accent-red" : "border-border"
                )}
              />
              {errors.name && <p className="text-[11px] text-accent-red mt-1">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-text-primary mb-1.5">
                E-mail <span className="text-accent-red">*</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="nome@consulcard.com.br"
                className={cn(
                  "w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary",
                  errors.email ? "border-accent-red" : "border-border"
                )}
              />
              {errors.email && <p className="text-[11px] text-accent-red mt-1">{errors.email}</p>}
            </div>

            {/* WhatsApp + LinkedIn side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-primary mb-1.5">WhatsApp</label>
                <input
                  value={form.whatsapp}
                  onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))}
                  placeholder="+55 11 99999-9999"
                  className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-primary mb-1.5">LinkedIn</label>
                <input
                  value={form.linkedin}
                  onChange={(e) => setForm((f) => ({ ...f, linkedin: e.target.value }))}
                  placeholder="linkedin.com/in/..."
                  className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                />
              </div>
            </div>

            {/* Role selector */}
            <div>
              <label className="block text-xs font-medium text-text-primary mb-1.5">
                Perfil de acesso <span className="text-accent-red">*</span>
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setRoleOpen((o) => !o)}
                  className="w-full flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm text-left focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary bg-white"
                >
                  <div className="flex items-center gap-2">
                    <Badge tone={ROLE_TONE[form.systemRole]} size="sm">
                      {ROLE_ICON[form.systemRole]}
                      {selectedRole.label}
                    </Badge>
                    <span className="text-xs text-text-muted">{selectedRole.description}</span>
                  </div>
                  <ChevronDown size={14} className={cn("text-text-faint transition-transform", roleOpen && "rotate-180")} />
                </button>
                {roleOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-lg z-10 overflow-hidden">
                    {ROLE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => { setForm((f) => ({ ...f, systemRole: opt.value })); setRoleOpen(false); }}
                        className={cn(
                          "w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-surface transition-colors",
                          form.systemRole === opt.value && "bg-brand-primary/5"
                        )}
                      >
                        <Badge tone={ROLE_TONE[opt.value]} size="sm" className="mt-0.5 shrink-0">
                          {ROLE_ICON[opt.value]}
                          {opt.label}
                        </Badge>
                        <span className="text-xs text-text-muted leading-relaxed">{opt.description}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="secondary" onClick={onClose} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleSubmit} className="flex-1" leftIcon={<UserPlus size={14} />}>
                Criar usuário
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Edit User Modal ──────────────────────────────────────────────────────────
interface EditUserModalProps {
  user: User;
  onClose: () => void;
}

const ROLE_LABEL_MAP: Record<UserRole, string> = {
  admin: "Admin",
  diretor: "Diretor",
  gerente: "Gerente de Projeto",
  consultor: "Consultor",
};

function EditUserModal({ user, onClose }: EditUserModalProps) {
  const updateUser = useUsersStore((s) => s.updateUser);

  const [form, setForm] = useState({
    name: user.name,
    email: user.email ?? "",
    whatsapp: user.whatsapp ?? "",
    linkedin: user.linkedin ?? "",
    systemRole: (user.systemRole ?? "consultor") as UserRole,
  });
  const [errors, setErrors] = useState<Partial<typeof form>>({});
  const [roleOpen, setRoleOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  function validate() {
    const e: Partial<typeof form> = {};
    if (!form.name.trim()) e.name = "Nome obrigatório";
    if (!form.email.trim() || !form.email.includes("@")) e.email = "E-mail inválido";
    return e;
  }

  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    setSaving(true);
    try {
      await updateUser(user.id, {
        name: form.name.trim(),
        initials: form.name.trim().split(" ").filter(Boolean).reduce(
          (acc, w, i, arr) => i === 0 || i === arr.length - 1 ? acc + w[0].toUpperCase() : acc, ""
        ).slice(0, 2) || user.initials,
        email: form.email.trim(),
        whatsapp: form.whatsapp.trim(),
        linkedin: form.linkedin.trim(),
        systemRole: form.systemRole,
        role: ROLE_LABEL_MAP[form.systemRole],
      });
      setSaved(true);
      setTimeout(onClose, 900);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar.";
      setErrors((prev) => ({ ...prev, email: msg }));
    } finally {
      setSaving(false);
    }
  }

  const selectedRole = ROLE_OPTIONS.find((r) => r.value === form.systemRole)!;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-brand-primary/10 text-brand-primary flex items-center justify-center">
              <Pencil size={15} />
            </div>
            <div>
              <div className="text-sm font-semibold text-text-primary">Editar usuário</div>
              <div className="text-[10px] text-text-faint">Atualize os dados e o perfil de acesso</div>
            </div>
          </div>
          <button onClick={onClose} className="text-text-faint hover:text-text-primary">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Avatar preview */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-surface border border-border">
            <Avatar
              initials={form.name.trim().split(" ").filter(Boolean).reduce(
                (acc, w, i, arr) => i === 0 || i === arr.length - 1 ? acc + w[0].toUpperCase() : acc, ""
              ).slice(0, 2) || user.initials}
              size="sm"
              tone="brand"
            />
            <div className="min-w-0">
              <div className="text-sm font-medium text-text-primary truncate">{form.name || "—"}</div>
              <div className="text-[10px] text-text-faint truncate">{form.email || "—"}</div>
            </div>
            {user.systemRole && (
              <Badge tone={ROLE_TONE[form.systemRole]} size="sm" className="ml-auto shrink-0">
                {ROLE_ICON[form.systemRole]}
                {ROLE_LABELS[form.systemRole]}
              </Badge>
            )}
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-text-primary mb-1.5">
              Nome completo <span className="text-accent-red">*</span>
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={cn(
                "w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary",
                errors.name ? "border-accent-red" : "border-border"
              )}
            />
            {errors.name && <p className="text-[11px] text-accent-red mt-1">{errors.name}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-text-primary mb-1.5">
              E-mail <span className="text-accent-red">*</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className={cn(
                "w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary",
                errors.email ? "border-accent-red" : "border-border"
              )}
            />
            {errors.email && <p className="text-[11px] text-accent-red mt-1">{errors.email}</p>}
          </div>

          {/* WhatsApp + LinkedIn */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-primary mb-1.5">WhatsApp</label>
              <input
                value={form.whatsapp}
                onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))}
                placeholder="+55 11 99999-9999"
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-primary mb-1.5">LinkedIn</label>
              <input
                value={form.linkedin}
                onChange={(e) => setForm((f) => ({ ...f, linkedin: e.target.value }))}
                placeholder="linkedin.com/in/..."
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
              />
            </div>
          </div>

          {/* Role selector */}
          <div>
            <label className="block text-xs font-medium text-text-primary mb-1.5">
              Perfil de acesso <span className="text-accent-red">*</span>
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setRoleOpen((o) => !o)}
                className="w-full flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm text-left focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary bg-white"
              >
                <div className="flex items-center gap-2">
                  <Badge tone={ROLE_TONE[form.systemRole]} size="sm">
                    {ROLE_ICON[form.systemRole]}
                    {selectedRole.label}
                  </Badge>
                  <span className="text-xs text-text-muted truncate">{selectedRole.description}</span>
                </div>
                <ChevronDown size={14} className={cn("text-text-faint shrink-0 transition-transform", roleOpen && "rotate-180")} />
              </button>
              {roleOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-lg z-10 overflow-hidden">
                  {ROLE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { setForm((f) => ({ ...f, systemRole: opt.value })); setRoleOpen(false); }}
                      className={cn(
                        "w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-surface transition-colors",
                        form.systemRole === opt.value && "bg-brand-primary/5"
                      )}
                    >
                      <Badge tone={ROLE_TONE[opt.value]} size="sm" className="mt-0.5 shrink-0">
                        {ROLE_ICON[opt.value]}
                        {opt.label}
                      </Badge>
                      <span className="text-xs text-text-muted leading-relaxed">{opt.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="secondary" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
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

// ─── Delete confirm ───────────────────────────────────────────────────────────
function DeleteConfirm({ user, onConfirm, onCancel }: { user: User; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-2xl border border-border p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-accent-red/10 text-accent-red flex items-center justify-center">
            <Trash2 size={18} />
          </div>
          <div>
            <div className="text-sm font-semibold text-text-primary">Excluir usuário</div>
            <div className="text-xs text-text-muted">Esta ação não pode ser desfeita.</div>
          </div>
        </div>
        <p className="text-sm text-text-primary">
          Tem certeza que deseja excluir <strong>{user.name}</strong>?
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onCancel} className="flex-1">Cancelar</Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            className="flex-1"
            leftIcon={<Trash2 size={14} />}
          >
            Excluir
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function UsersPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const { users, loading, fetchUsers, deleteUser } = useUsersStore();

  useEffect(() => { fetchUsers(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Access guard
  if (!currentUser?.systemRole || !ALLOWED_ROLES.includes(currentUser.systemRole)) {
    return <AccessDenied />;
  }

  const [showAdd, setShowAdd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<UserRole | "all">("all");

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchQ =
      !q ||
      u.name.toLowerCase().includes(q) ||
      (u.email ?? "").toLowerCase().includes(q);
    const matchRole = filterRole === "all" || u.systemRole === filterRole;
    return matchQ && matchRole;
  });

  // KPI counts
  const countByRole = (r: UserRole) => users.filter((u) => u.systemRole === r).length;

  return (
    <PageWrapper>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-7 w-7 rounded-md bg-brand-primary text-white flex items-center justify-center">
              <Users size={14} />
            </div>
            <Badge tone="blue" size="md">Administração</Badge>
          </div>
          <h1 className="text-2xl font-semibold text-text-primary">Gestão de Usuários</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Cadastro, permissões e credenciais dos membros da equipe Consulcard.
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)} leftIcon={<UserPlus size={15} />}>
          Novo usuário
        </Button>
      </div>

      {/* Role KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {(["admin", "diretor", "gerente", "consultor"] as UserRole[]).map((role) => {
          const count = countByRole(role);
          const tones = { admin: "bg-brand-primary/10 text-brand-primary", diretor: "bg-[#6D28D9]/10 text-[#6D28D9]", gerente: "bg-accent-amber/10 text-accent-amber", consultor: "bg-surface border border-border text-text-muted" };
          return (
            <button
              key={role}
              onClick={() => setFilterRole(filterRole === role ? "all" : role)}
              className={cn(
                "rounded-lg border text-left p-4 transition-all",
                filterRole === role
                  ? "border-brand-primary ring-2 ring-brand-primary/20 bg-brand-primary/5"
                  : "border-border bg-white hover:border-brand-primary/30"
              )}
            >
              <div className={cn("h-8 w-8 rounded-md flex items-center justify-center mb-2", tones[role])}>
                {ROLE_ICON[role]}
              </div>
              <div className="text-xl font-semibold text-text-primary">{count}</div>
              <div className="text-xs text-text-muted">{ROLE_LABELS[role]}</div>
            </button>
          );
        })}
      </div>

      {/* Table card */}
      <Card>
        {/* Toolbar */}
        <div className="px-5 py-3 border-b border-border flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou e-mail..."
              className="w-full pl-8 pr-3 py-2 text-sm rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary bg-white"
            />
          </div>
          <div className="text-xs text-text-faint ml-auto">
            {filtered.length} de {users.length} usuários
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider text-text-faint font-medium">Usuário</th>
                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-text-faint font-medium">Perfil</th>
                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-text-faint font-medium">E-mail</th>
                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-text-faint font-medium">WhatsApp</th>
                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-text-faint font-medium">LinkedIn</th>
                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-text-faint font-medium">Senha</th>
                <th className="px-4 py-3 text-[11px] uppercase tracking-wider text-text-faint font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-sm text-text-faint">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-surface/60 transition-colors">
                    {/* User */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar initials={user.initials} size="sm" tone="brand" />
                        <div>
                          <div className="text-sm font-medium text-text-primary">{user.name}</div>
                          {user.createdAt && (
                            <div className="text-[10px] text-text-faint">
                              desde {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3.5">
                      {user.systemRole ? (
                        <Badge tone={ROLE_TONE[user.systemRole]} size="sm">
                          {ROLE_ICON[user.systemRole]}
                          {ROLE_LABELS[user.systemRole]}
                        </Badge>
                      ) : (
                        <span className="text-xs text-text-faint">—</span>
                      )}
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3.5">
                      <a
                        href={`mailto:${user.email}`}
                        className="text-xs text-brand-primary hover:underline truncate max-w-[180px] block"
                      >
                        {user.email ?? "—"}
                      </a>
                    </td>

                    {/* WhatsApp */}
                    <td className="px-4 py-3.5">
                      {user.whatsapp ? (
                        <a
                          href={`https://wa.me/${user.whatsapp.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-text-primary hover:text-brand-primary hover:underline"
                        >
                          {user.whatsapp}
                        </a>
                      ) : (
                        <span className="text-xs text-text-faint">—</span>
                      )}
                    </td>

                    {/* LinkedIn */}
                    <td className="px-4 py-3.5">
                      {user.linkedin ? (
                        <a
                          href={`https://${user.linkedin.replace(/^https?:\/\//, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-text-primary hover:text-brand-primary hover:underline truncate max-w-[140px] block"
                        >
                          {user.linkedin}
                        </a>
                      ) : (
                        <span className="text-xs text-text-faint">—</span>
                      )}
                    </td>

                    {/* Password */}
                    <td className="px-4 py-3.5 min-w-[180px]">
                      <PasswordCell userId={user.id} initial={user.password} />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditTarget(user)}
                          className="p-1.5 rounded-md text-text-faint hover:bg-brand-primary/10 hover:text-brand-primary transition-colors"
                          title="Editar usuário"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(user)}
                          disabled={user.id === currentUser?.id}
                          className={cn(
                            "p-1.5 rounded-md transition-colors",
                            user.id === currentUser?.id
                              ? "text-text-faint cursor-not-allowed"
                              : "text-text-faint hover:bg-accent-red/10 hover:text-accent-red"
                          )}
                          title={user.id === currentUser?.id ? "Não é possível excluir a si mesmo" : "Excluir usuário"}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer note */}
        <div className="px-5 py-3 border-t border-border bg-surface">
          <p className="text-[10px] text-text-faint">
            <Shield size={10} className="inline mr-1" />
            Apenas usuários com perfil <strong>Admin</strong> ou <strong>Diretor</strong> têm acesso a esta tela.
            As senhas são geradas automaticamente e devem ser compartilhadas de forma segura.
          </p>
        </div>
      </Card>

      {/* Role reference card */}
      <Card className="mt-4">
        <CardBody>
          <div className="text-xs font-semibold text-text-primary mb-3">Níveis de acesso</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {(["admin", "diretor", "gerente", "consultor"] as UserRole[]).map((role) => (
              <div key={role} className="rounded-md border border-border bg-surface px-3 py-3 space-y-1.5">
                <Badge tone={ROLE_TONE[role]} size="sm">
                  {ROLE_ICON[role]}
                  {ROLE_LABELS[role]}
                </Badge>
                <p className="text-[11px] text-text-muted leading-relaxed">{ROLE_DESCRIPTIONS[role]}</p>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Modals */}
      {showAdd && <AddUserModal onClose={() => setShowAdd(false)} />}
      {editTarget && (
        <EditUserModal
          user={editTarget}
          onClose={() => setEditTarget(null)}
        />
      )}
      {deleteTarget && (
        <DeleteConfirm
          user={deleteTarget}
          onConfirm={() => { deleteUser(deleteTarget.id); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </PageWrapper>
  );
}
