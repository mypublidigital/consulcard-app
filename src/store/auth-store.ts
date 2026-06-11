import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { User } from "@/types";

// ── helpers ──────────────────────────────────────────────────
async function fetchProfile(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, initials, role, system_role, whatsapp, linkedin, active, created_at")
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
    whatsapp: row.whatsapp ?? undefined,
    linkedin: row.linkedin ?? undefined,
    active: row.active,
    createdAt: row.created_at,
  };
}

// ── store ─────────────────────────────────────────────────────
export interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  initialized: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ ok: boolean }>;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  currentUser: null,
  isAuthenticated: false,
  loading: true,
  initialized: false,

  initialize: () => {
    // Restore existing session on app load
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        // Authenticate even if profile table doesn't exist yet — use auth metadata as fallback
        const user: User = profile ?? {
          id: session.user.id,
          name: session.user.user_metadata?.name ?? session.user.email ?? "Usuário",
          initials: session.user.user_metadata?.initials ?? "??",
          email: session.user.email,
          systemRole: "admin",
        };
        set({ currentUser: user, isAuthenticated: true, loading: false, initialized: true });
      } else {
        set({ loading: false, initialized: true });
      }
    });

    // React to auth state changes (login, logout, token refresh)
    supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session?.user) {
        const profile = await fetchProfile(session.user.id);
        const user: User = profile ?? {
          id: session.user.id,
          name: session.user.user_metadata?.name ?? session.user.email ?? "Usuário",
          initials: session.user.user_metadata?.initials ?? "??",
          email: session.user.email,
          systemRole: "admin",
        };
        set({ currentUser: user, isAuthenticated: true });
      } else if (event === "SIGNED_OUT") {
        set({ currentUser: null, isAuthenticated: false });
      }
    });
  },

  login: async (email, password) => {
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
      const profile = await fetchProfile(data.user.id);
      const user: User = profile ?? {
        id: data.user.id,
        name: data.user.user_metadata?.name ?? data.user.email ?? "Usuário",
        initials: data.user.user_metadata?.initials ?? "??",
        email: data.user.email,
        systemRole: "admin",
      };
      set({ currentUser: user, isAuthenticated: true });
    }
    return { ok: true };
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ currentUser: null, isAuthenticated: false });
  },

  requestPasswordReset: async (email) => {
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    // Always return ok — never reveal which emails exist
    return { ok: true };
  },
}));
