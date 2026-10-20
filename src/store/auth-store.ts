import { create } from "zustand";
import { RECOVERY_LINK, browserSessionStillOpen, markTabAlive, setRememberSession, supabase } from "@/lib/supabase";
import type { User } from "@/types";

// ── helpers ──────────────────────────────────────────────────
async function fetchProfile(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, initials, role, system_role, email, whatsapp, linkedin, active, created_at")
    .eq("id", userId)
    .single();

  if (error || !data) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any;
  return {
    id: row.id,
    name: row.name,
    initials: row.initials,
    role: row.role ?? undefined,
    systemRole: (row.system_role as User["systemRole"]) ?? undefined,
    email: row.email ?? undefined,
    whatsapp: row.whatsapp ?? undefined,
    linkedin: row.linkedin ?? undefined,
    active: row.active,
    createdAt: row.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function userFromSession(authUser: any): Promise<User> {
  const profile = await fetchProfile(authUser.id);
  if (profile) return { ...profile, email: profile.email ?? authUser.email };
  // Sem perfil carregado, o usuário entra com o MENOR nível de acesso. Antes
  // entrava como "admin", e a tela liberava cadastro de usuários e Painel
  // Executivo a quem não deveria vê-los.
  return {
    id: authUser.id,
    name: authUser.user_metadata?.name ?? authUser.email ?? "Usuário",
    initials: authUser.user_metadata?.initials ?? "??",
    email: authUser.email,
    systemRole: "consultor",
  };
}

// ── store ─────────────────────────────────────────────────────
export interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  initialized: boolean;
  /**
   * Chegou pelo link de redefinição de senha: o sistema só abre depois que a
   * nova senha for definida (testes de 06/10, GAP #1).
   */
  recoveryMode: boolean;
  /** Erro do link de recuperação (vencido/usado), mostrado no login. */
  recoveryError: string | null;
  login: (email: string, password: string, remember?: boolean) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ ok: boolean; error?: string }>;
  /** Troca a senha do usuário logado (perfil ou link de recuperação). */
  updatePassword: (newPassword: string) => Promise<{ ok: boolean; error?: string }>;
  initialize: () => void;
}

const PASSWORD_ERRORS: Record<string, string> = {
  "New password should be different from the old password.": "A nova senha precisa ser diferente da atual.",
  "Password should be at least 6 characters.": "A senha precisa ter pelo menos 6 caracteres.",
  "Auth session missing!": "O link expirou. Peça um novo em \"Esqueci minha senha\".",
};

export const useAuthStore = create<AuthState>()((set, get) => ({
  currentUser: null,
  isAuthenticated: false,
  loading: true,
  initialized: false,
  recoveryMode: RECOVERY_LINK.active && !RECOVERY_LINK.error,
  recoveryError: RECOVERY_LINK.error,

  initialize: () => {
    // Restore existing session on app load. getSession espera o Supabase ler
    // o link de recuperação do endereço; só depois o endereço é limpo, para o
    // link não ser reprocessado a cada recarga.
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (RECOVERY_LINK.error || RECOVERY_LINK.active) window.history.replaceState(null, "", "/");

      // Sessão de uma visita que já terminou, sem "Manter conectado": pede
      // login de novo (GAP #1). O link de recuperação abre a própria sessão.
      if (session && !RECOVERY_LINK.active && !(await browserSessionStillOpen())) {
        await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
        set({ loading: false, initialized: true });
        return;
      }
      if (session?.user) {
        markTabAlive();
        const user = await userFromSession(session.user);
        set({ currentUser: user, isAuthenticated: true, loading: false, initialized: true });
      } else {
        set({ loading: false, initialized: true });
      }
    })();

    // React to auth state changes (login, logout, token refresh)
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        set({ recoveryMode: true });
      }
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "PASSWORD_RECOVERY") && session?.user) {
        const user = await userFromSession(session.user);
        set({ currentUser: user, isAuthenticated: true });
      } else if (event === "SIGNED_OUT") {
        set({ currentUser: null, isAuthenticated: false, recoveryMode: false });
      }
    });
  },

  login: async (email, password, remember = false) => {
    // Definido antes de entrar: decide onde a sessão será guardada.
    setRememberSession(remember);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const errorMap: Record<string, string> = {
        "Invalid login credentials": "E-mail ou senha incorretos.",
        "Email not confirmed": "E-mail ainda não confirmado. Verifique sua caixa de entrada ou desative a confirmação no Supabase.",
        "Too many requests": "Muitas tentativas. Aguarde alguns minutos.",
      };
      const msg = errorMap[error.message] ?? error.message;
      return { ok: false, error: msg };
    }
    if (data.user) {
      markTabAlive();
      const user = await userFromSession(data.user);
      set({ currentUser: user, isAuthenticated: true, recoveryError: null });
    }
    return { ok: true };
  },

  logout: async () => {
    // scope "local": encerra a sessão neste navegador mesmo se a rede falhar.
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    set({ currentUser: null, isAuthenticated: false, recoveryMode: false });
  },

  requestPasswordReset: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    // Limite de envio do Supabase: avisa em vez de dizer que enviou.
    if (error && /rate limit|too many/i.test(error.message)) {
      return { ok: false, error: "Muitos pedidos de redefinição em pouco tempo. Aguarde alguns minutos ou peça ao administrador uma senha temporária." };
    }
    // Demais casos: sempre "ok", para não revelar quais e-mails existem.
    return { ok: true };
  },

  updatePassword: async (newPassword) => {
    if (newPassword.length < 8) return { ok: false, error: "A senha precisa ter pelo menos 8 caracteres." };
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { ok: false, error: PASSWORD_ERRORS[error.message] ?? error.message };
    if (get().recoveryMode) set({ recoveryMode: false });
    return { ok: true };
  },
}));
