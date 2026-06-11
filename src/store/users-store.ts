import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { User, UserRole } from "@/types";

function generatePassword(name: string): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#";
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  let rand = "";
  for (let i = 0; i < 8; i++) rand += chars[Math.floor(Math.random() * chars.length)];
  return `Cc@${rand}${initials}`;
}

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
  generateNewPassword: (id: string) => string;
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
    // Step 1: Create auth user (sends invite email — disable email confirmation in Supabase Auth settings)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: generatePassword(formData.name),
      options: {
        data: {
          name: formData.name,
          initials: deriveInitials(formData.name),
        },
      },
    });

    if (authError || !authData.user) {
      throw new Error(authError?.message ?? "Erro ao criar usuário.");
    }

    const pwd = generatePassword(formData.name);

    // Step 2: Update profile with full data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: profileError } = await (supabase.from("profiles") as any)
      .update({
        name: formData.name,
        initials: deriveInitials(formData.name),
        role: formData.role,
        system_role: formData.systemRole,
        whatsapp: formData.whatsapp || null,
        linkedin: formData.linkedin || null,
        temp_password: pwd,
      })
      .eq("id", authData.user.id);

    if (profileError) {
      console.error("Profile update error:", profileError);
    }

    const newUser: User = {
      id: authData.user.id,
      name: formData.name,
      initials: deriveInitials(formData.name),
      role: formData.role,
      systemRole: formData.systemRole,
      email: formData.email,
      whatsapp: formData.whatsapp || undefined,
      linkedin: formData.linkedin || undefined,
      active: true,
      createdAt: new Date().toISOString().split("T")[0],
      password: pwd,
    };

    set((s) => ({ users: [...s.users, newUser] }));
    return newUser;
  },

  deleteUser: async (id) => {
    // Soft delete — set active = false
    // Hard delete requires service_role key (admin API)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("profiles") as any).update({ active: false }).eq("id", id);
    set((s) => ({ users: s.users.filter((u) => u.id !== id) }));
  },

  generateNewPassword: (id) => {
    const user = get().users.find((u) => u.id === id);
    const pwd = generatePassword(user?.name ?? "User");

    // Store temp password in profile (admin readable)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from("profiles") as any).update({ temp_password: pwd }).eq("id", id).then();

    set((s) => ({
      users: s.users.map((u) => (u.id === id ? { ...u, password: pwd } : u)),
    }));
    return pwd;
  },

  updateUser: async (id, data) => {
    const update: Record<string, unknown> = {};
    if (data.name)        { update.name = data.name; update.initials = deriveInitials(data.name); }
    if (data.role)          update.role = data.role;
    if (data.systemRole)    update.system_role = data.systemRole;
    if (data.whatsapp !== undefined)  update.whatsapp = data.whatsapp || null;
    if (data.linkedin !== undefined)  update.linkedin = data.linkedin || null;
    if (data.active !== undefined)    update.active = data.active;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("profiles") as any).update(update).eq("id", id);
    if (error) throw new Error(error.message);

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
