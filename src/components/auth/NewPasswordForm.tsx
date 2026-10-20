import { useState } from "react";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Lock, RefreshCw } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";

/**
 * Nova senha + confirmação. Usado na tela do link de recuperação (GAP #1) e
 * em "Alterar senha" no menu do perfil (GAP #2).
 */
export function NewPasswordForm({ onDone, submitLabel = "Salvar nova senha" }: { onDone: () => void; submitLabel?: string }) {
  const updatePassword = useAuthStore((s) => s.updatePassword);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("A senha precisa ter pelo menos 8 caracteres.");
    if (password !== confirm) return setError("As duas senhas não conferem.");
    setSaving(true);
    const r = await updatePassword(password);
    setSaving(false);
    if (!r.ok) return setError(r.error ?? "Não foi possível salvar a senha.");
    setSaved(true);
    setTimeout(onDone, 900);
  }

  const field = "w-full pl-9 pr-10 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary";

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-accent-red/10 border border-accent-red/20 px-3 py-2.5 text-xs text-accent-red">
          <AlertCircle size={14} className="shrink-0" /> {error}
        </div>
      )}
      {saved && (
        <div className="flex items-center gap-2 rounded-lg bg-accent-green/10 border border-accent-green/30 px-3 py-2.5 text-xs text-brand-green-ink">
          <CheckCircle2 size={14} className="shrink-0" /> Senha alterada.
        </div>
      )}
      <div>
        <label className="block text-xs font-medium text-text-primary mb-1.5">Nova senha</label>
        <div className="relative">
          <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
          <input
            type={show ? "text" : "password"}
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            autoComplete="new-password"
            autoFocus
            className={field}
            placeholder="mínimo 8 caracteres"
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-faint hover:text-text-muted"
            tabIndex={-1}
            aria-label={show ? "Ocultar senha" : "Mostrar senha"}
          >
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-text-primary mb-1.5">Confirme a nova senha</label>
        <div className="relative">
          <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
          <input
            type={show ? "text" : "password"}
            value={confirm}
            onChange={(e) => { setConfirm(e.target.value); setError(""); }}
            autoComplete="new-password"
            className={field}
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={saving || saved}
        className={cn(
          "w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold bg-brand-primary text-white hover:bg-[#243140] transition-colors",
          (saving || saved) && "opacity-60 cursor-not-allowed"
        )}
      >
        {saving && <RefreshCw size={14} className="animate-spin" />}
        {submitLabel}
      </button>
    </form>
  );
}
