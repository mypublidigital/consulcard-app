import { useState, useRef, useEffect } from "react";
import {
  Eye,
  EyeOff,
  LogIn,
  ArrowLeft,
  Mail,
  Lock,
  CheckSquare,
  Square,
  ShieldCheck,
  RefreshCw,
  Send,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";

// ─── Simple Captcha ───────────────────────────────────────────────────────────
function Captcha({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const [animating, setAnimating] = useState(false);

  function handleClick() {
    if (checked) return;
    setAnimating(true);
    setTimeout(() => {
      onChange(true);
      setAnimating(false);
    }, 600);
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-md border px-4 py-3 transition-colors select-none",
        checked
          ? "border-accent-green/40 bg-accent-green/5"
          : "border-border bg-surface hover:border-brand-primary/30 cursor-pointer"
      )}
      onClick={handleClick}
      role="checkbox"
      aria-checked={checked}
      tabIndex={0}
      onKeyDown={(e) => e.key === " " && handleClick()}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "h-6 w-6 rounded flex items-center justify-center transition-all duration-300",
            animating && "animate-spin",
            checked
              ? "bg-accent-green/20 text-accent-green"
              : "border-2 border-border text-transparent"
          )}
        >
          {animating ? (
            <RefreshCw size={14} className="text-brand-primary" />
          ) : checked ? (
            <CheckSquare size={20} className="text-accent-green" />
          ) : (
            <Square size={20} className="text-text-faint" />
          )}
        </div>
        <span className="text-sm text-text-primary">Não sou um robô</span>
      </div>
      <div className="flex flex-col items-center gap-0.5 opacity-40">
        <ShieldCheck size={22} className="text-text-muted" />
        <span className="text-[8px] text-text-faint font-mono leading-none">reCAPTCHA</span>
        <span className="text-[7px] text-text-faint leading-none">Privacidade · Termos</span>
      </div>
    </div>
  );
}

// ─── Forgot Password modal ────────────────────────────────────────────────────
function ForgotPasswordModal({ onClose }: { onClose: () => void }) {
  const requestPasswordReset = useAuthStore((s) => s.requestPasswordReset);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sent">("idle");
  const [error, setError] = useState("");

  function handleSend() {
    if (!email.trim() || !email.includes("@")) {
      setError("Informe um e-mail válido.");
      return;
    }
    requestPasswordReset(email);
    // Always show success to not reveal which emails exist
    setStatus("sent");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-border overflow-hidden">
        {status === "sent" ? (
          <div className="p-8 flex flex-col items-center text-center gap-4">
            <div className="h-14 w-14 rounded-full bg-accent-green/10 text-accent-green flex items-center justify-center">
              <CheckCircle2 size={28} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-text-primary">E-mail enviado</h3>
              <p className="text-sm text-text-muted mt-1.5 leading-relaxed">
                Se o endereço <strong>{email}</strong> estiver cadastrado, você
                receberá as instruções de recuperação de senha em instantes.
              </p>
            </div>
            <p className="text-xs text-text-faint">
              Não encontrou? Verifique a caixa de spam ou contate o administrador do sistema.
            </p>
            <button
              onClick={onClose}
              className="w-full rounded-lg bg-brand-primary text-white py-2.5 text-sm font-medium hover:bg-[#162E73] transition-colors"
            >
              Voltar ao login
            </button>
          </div>
        ) : (
          <>
            <div className="px-6 py-5 border-b border-border">
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary mb-4 -ml-0.5"
              >
                <ArrowLeft size={13} /> Voltar ao login
              </button>
              <div className="h-10 w-10 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center mb-3">
                <Lock size={18} />
              </div>
              <h3 className="text-base font-semibold text-text-primary">Esqueci minha senha</h3>
              <p className="text-sm text-text-muted mt-1">
                Informe seu e-mail de acesso e enviaremos as instruções de recuperação.
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-primary mb-1.5">
                  E-mail cadastrado
                </label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder="seu@email.com.br"
                    autoFocus
                    className={cn(
                      "w-full pl-9 pr-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary",
                      error ? "border-accent-red" : "border-border"
                    )}
                  />
                </div>
                {error && (
                  <p className="text-[11px] text-accent-red mt-1 flex items-center gap-1">
                    <AlertCircle size={11} /> {error}
                  </p>
                )}
              </div>

              <button
                onClick={handleSend}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-brand-primary text-white py-2.5 text-sm font-medium hover:bg-[#162E73] transition-colors"
              >
                <Send size={14} />
                Enviar instruções
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Login Page ───────────────────────────────────────────────────────────────
export function LoginPage() {
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({ email: "", password: "" });

  const emailRef = useRef<HTMLInputElement>(null);
  useEffect(() => { emailRef.current?.focus(); }, []);

  function validate() {
    const e = { email: "", password: "" };
    if (!email.trim()) e.email = "Informe seu e-mail.";
    else if (!email.includes("@")) e.email = "E-mail inválido.";
    if (!password) e.password = "Informe sua senha.";
    return e;
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setError("");

    const fe = validate();
    setFieldErrors(fe);
    if (fe.email || fe.password) return;

    setLoading(true);
    const result = await login(email, password);
    if (!result.ok) {
      setError(result.error ?? "Erro ao autenticar.");
    }
    // On success, App.tsx will re-render with the authenticated layout
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#F4F2EE] flex flex-col items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-brand-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-brand-secondary/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo card */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="h-11 w-11 rounded-xl bg-brand-primary flex items-center justify-center font-bold text-white text-lg shadow-lg">
              C
            </div>
            <div className="text-left">
              <div className="text-xl font-bold text-text-primary tracking-tight">Consulcard</div>
              <div className="text-[11px] text-text-faint font-mono">Gestão de Projetos · v0.1</div>
            </div>
          </div>
          <p className="text-sm text-text-muted">Faça login para continuar</p>
        </div>

        {/* Login card */}
        <div className="bg-white rounded-2xl shadow-xl border border-border/60 overflow-hidden">
          <div className="px-8 pt-7 pb-2">
            <h1 className="text-lg font-semibold text-text-primary">Acesso ao sistema</h1>
            <p className="text-xs text-text-faint mt-0.5">Use as credenciais fornecidas pelo administrador</p>
          </div>

          <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
            {/* Global error */}
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-accent-red/8 border border-accent-red/20 px-4 py-3 text-sm text-accent-red">
                <AlertCircle size={15} className="shrink-0" />
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-text-primary mb-1.5">
                E-mail
              </label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
                <input
                  ref={emailRef}
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setFieldErrors((f) => ({ ...f, email: "" })); setError(""); }}
                  placeholder="seu@email.com.br"
                  autoComplete="email"
                  className={cn(
                    "w-full pl-9 pr-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-colors",
                    fieldErrors.email ? "border-accent-red bg-accent-red/5" : "border-border"
                  )}
                />
              </div>
              {fieldErrors.email && (
                <p className="text-[11px] text-accent-red mt-1 flex items-center gap-1">
                  <AlertCircle size={11} /> {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-text-primary">Senha</label>
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  className="text-[11px] text-brand-primary hover:underline"
                >
                  Esqueci minha senha
                </button>
              </div>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setFieldErrors((f) => ({ ...f, password: "" })); setError(""); }}
                  placeholder="••••••••••"
                  autoComplete="current-password"
                  className={cn(
                    "w-full pl-9 pr-10 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-colors",
                    fieldErrors.password ? "border-accent-red bg-accent-red/5" : "border-border"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-faint hover:text-text-muted"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-[11px] text-accent-red mt-1 flex items-center gap-1">
                  <AlertCircle size={11} /> {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={cn(
                "w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all",
                loading
                  ? "bg-brand-primary/60 text-white/80 cursor-not-allowed"
                  : "bg-brand-primary text-white hover:bg-[#162E73] shadow-sm hover:shadow-md"
              )}
            >
              {loading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Autenticando...
                </>
              ) : (
                <>
                  <LogIn size={14} />
                  Entrar
                </>
              )}
            </button>
          </form>

          {/* Demo hint */}
          <div className="px-8 pb-6">
            <div className="rounded-lg border border-border bg-surface px-4 py-3">
              <p className="text-[10px] text-text-faint leading-relaxed">
                <span className="font-semibold text-text-muted">Acesso demo:</span>{" "}
                wagner.lima@consulcard.com.br{" "}
                <span className="font-mono">/ Cc@2024!WL</span>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-text-faint mt-6">
          © 2025 Consulcard · Uso restrito à equipe interna
        </p>
      </div>

      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}
    </div>
  );
}
