import { NewPasswordForm } from "@/components/auth/NewPasswordForm";
import { useAuthStore } from "@/store/auth-store";

/**
 * Tela do link "redefinir senha" (testes de 06/10, GAP #1). Antes o link
 * abria uma sessão e o sistema entrava direto nos projetos, sem pedir a nova
 * senha — e a sessão continuava aberta nas visitas seguintes.
 */
export function SetNewPasswordPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="min-h-screen bg-[#F5F6F7] flex flex-col items-center justify-center p-4">
      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/brand/consulcard-horizontal.png" alt="Consulcard" className="mx-auto mb-3 h-12 w-auto" />
          <p className="text-sm text-text-muted">Redefinição de senha</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-border/60 overflow-hidden">
          <div className="px-8 pt-7 pb-2">
            <h1 className="text-lg font-semibold text-text-primary">Crie sua nova senha</h1>
            <p className="text-xs text-text-faint mt-0.5">
              {currentUser?.email ? <>Conta <strong>{currentUser.email}</strong>. </> : null}
              O acesso ao sistema é liberado depois de salvar.
            </p>
          </div>
          <div className="px-8 py-6">
            {/* Ao salvar, recoveryMode desliga e o App mostra o sistema. */}
            <NewPasswordForm onDone={() => undefined} submitLabel="Salvar e entrar" />
          </div>
        </div>

        <button
          onClick={logout}
          className="mt-4 w-full text-center text-xs text-text-muted hover:text-text-primary"
        >
          Cancelar e voltar ao login
        </button>
      </div>
    </div>
  );
}
