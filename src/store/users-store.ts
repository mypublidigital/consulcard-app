import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { User, UserRole } from "@/types";

function deriveInitials(name: string): string {
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToUser(row: any): User {
  return {
    id: row.id,
    name: row.name,
    initials: row.initials,
    role: row.role ?? undefined,
    systemRole: row.system_role ?? undefined,
    email: row.email ?? undefined,
    whatsapp: row.whatsapp ?? undefined,
    linkedin: row.linkedin ?? undefined,
    active: row.active ?? true,
    createdAt: row.created_at ?? undefined,
    password: row.temp_password ?? undefined,
  };
}

export interface UsersState {
  users: User[];
  loading: boolean;
  fetchUsers: () => Promise<void>;
  addUser: (data: {
    name: string;
    email: string;
    whatsapp: string;
    linkedin: string;
    systemRole: UserRole;
    role: string;
  }) => Promise<User>;
  deleteUser: (id: string) => Promise<void>;
  generateNewPassword: (id: string) => Promise<string>;
  updateUser: (id: string, data: Partial<User>) => Promise<void>;
}

export const useUsersStore = create<UsersState>((set, get) => ({
  users: [],
  loading: false,

  fetchUsers: async () => {
    set({ loading: true });
    // Join with auth.users email via a view or use profiles only
    // We store email in profiles as well for display purposes
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: true });

    if (!error && data) {
      set({ users: data.map(rowToUser) });
    }
    set({ loading: false });
  },

  addUser: async (formData) => {
    // User creation runs server-side in the `admin-users` Edge Function using the
    // service_role key. This is required so the admin's own session is NOT replaced
    // (client-side signUp would log the admin out and in as the new user).
    const { data, error } = await supabase.functions.invoke("admin-users", {
      body: { action: "create", ...formData },
    });

    if (error) {
      // On non-2xx the response body is in error.context, not data.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ctx = (error as any)?.context;
      let detail = error.message ?? "Erro ao criar usuário.";
      if (ctx?.json) {
        try { const b = await ctx.json(); if (b?.error) detail = String(b.error); } catch { /* ignore */ }
      }
      throw new Error(detail);
    }
    if (data?.error) throw new Error(data.error);

    const newUser = data.user as User;
    set((s) => ({ users: [...s.users, newUser] }));
    return newUser;
  },

  deleteUser: async (id) => {
    const { data, error } = await supabase.functions.invoke("admin-users", {
      body: { action: "delete", id },
    });
    if (error || data?.error) {
      throw new Error(data?.error ?? error?.message ?? "Erro ao excluir usuário.");
    }
    set((s) => ({ users: s.users.filter((u) => u.id !== id) }));
  },

  generateNewPassword: async (id) => {
    const user = get().users.find((u) => u.id === id);
    const { data, error } = await supabase.functions.invoke("admin-users", {
      body: { action: "resetPassword", id, name: user?.name ?? "User" },
    });
    if (error || data?.error) {
      throw new Error(data?.error ?? error?.message ?? "Erro ao gerar nova senha.");
    }
    const pwd = data.password as string;
    set((s) => ({
      users: s.users.map((u) => (u.id === id ? { ...u, password: pwd } : u)),
    }));
    return pwd;
  },

  updateUser: async (id, data) => {
    const { error: fnError, data: fnData } = await supabase.functions.invoke("admin-users", {
      body: {
        action: "update",
        id,
        name: data.name,
        email: data.email,
        whatsapp: data.whatsapp,
        linkedin: data.linkedin,
        systemRole: data.systemRole,
        role: data.role,
      },
    });
    if (fnError || fnData?.error) {
      throw new Error(fnData?.error ?? fnError?.message ?? "Erro ao atualizar usuário.");
    }

    set((s) => ({
      users: s.users.map((u) =>
        u.id === id
          ? {
              ...u,
              ...data,
              initials: data.name ? deriveInitials(data.name) : u.initials,
            }
          : u
      ),
    }));
  },
}));
