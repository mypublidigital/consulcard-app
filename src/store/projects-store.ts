import { create } from "zustand";
import type { Activity, ActivityStatusValue, Pendency, Project, User } from "@/types";
import { MOCK_PROJECTS } from "@/mocks/projects";
import { MOCK_PENDENCIES } from "@/mocks/pendencies";
import { getActivitiesForType } from "@/mocks/activities";
import { USERS } from "@/mocks/users";
import { supabase } from "@/lib/supabase";

interface ProjectsState {
  projects: Project[];
  activitiesByProject: Record<string, Activity[]>;
  pendencies: Pendency[];
  loading: boolean;
  initialized: boolean;
  /** Última falha ao gravar no banco; a tela mostra e oferece fechar. */
  syncError: string | null;
  clearSyncError: () => void;
  fetchProjects: () => Promise<void>;
  addProject: (p: Project, typeId: string) => Promise<void>;
  updateActivityStatus: (projectId: string, activityId: string, status: ActivityStatusValue) => Promise<void>;
  addActivity: (projectId: string, activity: Activity) => Promise<void>;
  addPendency: (p: Pendency) => Promise<void>;
  resolvePendency: (id: string) => Promise<void>;
  /** Volta uma pendência resolvida para aberta (item 6). */
  reopenPendency: (id: string) => Promise<void>;
  updatePendency: (id: string, patch: Partial<Pendency>) => Promise<void>;
  setProjectStatus: (projectId: string, status: Project["status"]) => Promise<void>;
  updateProject: (projectId: string, patch: Partial<Project>) => Promise<void>;
}

function seedActivities(): Record<string, Activity[]> {
  const out: Record<string, Activity[]> = {};
  for (const p of MOCK_PROJECTS) {
    const base = getActivitiesForType(p.projectType).map((a, idx) => {
      let status: ActivityStatusValue = "todo";
      if (p.id === "proj-001") {
        if (idx < 3) status = "done";
        else if (idx < 5) status = "in_progress";
        else if (idx === 5) status = "review";
      } else if (p.id === "proj-002") {
        if (idx === 0) status = "done";
        else if (idx === 1) status = "in_progress";
      }
      const assignee = p.consultants[idx % Math.max(1, p.consultants.length)] ?? p.manager ?? USERS[0];
      const due = new Date(p.startDate);
      due.setDate(due.getDate() + (idx + 1) * 14);
      return {
        ...a,
        status,
        assignee,
        dueDate: due.toISOString().slice(0, 10),
        pendingCount: idx === 1 && p.id === "proj-001" ? 2 : 0,
      };
    });
    out[p.id] = base;
  }
  return out;
}

const PROFILE_COLUMNS =
  "id, name, initials, role, system_role, email, whatsapp, linkedin, active, created_at";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function profileToUser(row: any): User {
  return {
    id: row.id,
    name: row.name,
    initials: row.initials,
    role: row.role ?? undefined,
    systemRole: row.system_role ?? undefined,
    email: row.email ?? undefined,
    active: row.active,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToProject(row: any): Project {
  const manager: User = row.manager
    ? profileToUser(row.manager)
    : { id: "", name: "—", initials: "—" };
  const consultants: User[] = (row.project_consultants ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((pc: any) => pc.profiles)
    .filter(Boolean)
    .map(profileToUser);

  return {
    id: row.id,
    name: row.name,
    client: row.client,
    clientInitials: row.client_initials,
    macroCategory: row.macro_category,
    projectType: row.project_type,
    size: row.size,
    complexity: row.complexity,
    status: row.status,
    startDate: row.start_date,
    targetEndDate: row.target_end_date,
    manager,
    consultants,
    progress: row.progress ?? 0,
    activitiesTotal: row.activities_total ?? 0,
    activitiesDone: row.activities_done ?? 0,
    activitiesDelayed: row.activities_delayed ?? 0,
    lastUpdate: row.last_update,
    tags: row.tags ?? [],
  };
}

function projectToDbPatch(patch: Partial<Project>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (patch.name !== undefined) out.name = patch.name;
  if (patch.client !== undefined) out.client = patch.client;
  if (patch.clientInitials !== undefined) out.client_initials = patch.clientInitials;
  if (patch.macroCategory !== undefined) out.macro_category = patch.macroCategory;
  if (patch.projectType !== undefined) out.project_type = patch.projectType;
  if (patch.size !== undefined) out.size = patch.size;
  if (patch.complexity !== undefined) out.complexity = patch.complexity;
  if (patch.status !== undefined) out.status = patch.status;
  if (patch.startDate !== undefined) out.start_date = patch.startDate;
  if (patch.targetEndDate !== undefined) out.target_end_date = patch.targetEndDate;
  if (patch.manager !== undefined) out.manager_id = patch.manager.id || null;
  if (patch.progress !== undefined) out.progress = patch.progress;
  if (patch.activitiesTotal !== undefined) out.activities_total = patch.activitiesTotal;
  if (patch.activitiesDone !== undefined) out.activities_done = patch.activitiesDone;
  if (patch.activitiesDelayed !== undefined) out.activities_delayed = patch.activitiesDelayed;
  if (patch.tags !== undefined) out.tags = patch.tags;
  return out;
}

// ── Atividades e pendências ↔ banco ──────────────────────────────────────────
// Até aqui estas telas só alteravam memória: nada chegava ao banco, então tudo
// sumia no recarregar e só quem criava enxergava (itens 5, 6 e 7).

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToActivity(row: any): Activity {
  return {
    id: row.id,
    label: row.label,
    description: row.description ?? "",
    complexity: row.complexity,
    llmImpact: row.llm_impact,
    llmIndexMin: row.llm_index_min,
    llmIndexMax: row.llm_index_max,
    phase: row.phase,
    status: row.status,
    assignee: row.assignee ? profileToUser(row.assignee) : undefined,
    dueDate: row.due_date ?? undefined,
    pendingCount: row.pending_count ?? 0,
  };
}

function activityToRow(projectId: string, a: Activity) {
  return {
    id: a.id,
    project_id: projectId,
    label: a.label,
    description: a.description ?? "",
    complexity: a.complexity,
    llm_impact: a.llmImpact,
    llm_index_min: a.llmIndexMin,
    llm_index_max: a.llmIndexMax,
    phase: a.phase,
    status: a.status ?? "todo",
    assignee_id: a.assignee?.id || null,
    due_date: a.dueDate || null,
    pending_count: a.pendingCount ?? 0,
  };
}

/**
 * Atividades-modelo de um novo projeto. O ID leva o projeto como prefixo: os
 * modelos usam IDs fixos ("a1", "a2"...) iguais entre projetos do mesmo tipo,
 * e a coluna activities.id é chave primária — sem o prefixo, o segundo projeto
 * do mesmo tipo colidiria. Mesmo formato do backfill (migração 0006).
 */
function templateActivities(projectId: string, typeId: string, startDate: string): Activity[] {
  return getActivitiesForType(typeId).map((a, idx) => {
    const due = new Date(startDate);
    due.setDate(due.getDate() + (idx + 1) * 14);
    return {
      ...a,
      id: `${projectId}__${a.id}`,
      status: "todo" as ActivityStatusValue,
      dueDate: Number.isNaN(due.getTime()) ? undefined : due.toISOString().slice(0, 10),
      pendingCount: 0,
    };
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToPendency(row: any): Pendency {
  return {
    id: row.id,
    projectId: row.project_id,
    description: row.description,
    // Cliente não tem perfil: o nome fica gravado na própria pendência.
    owner: row.owner ? profileToUser(row.owner) : { name: row.owner_name, initials: row.owner_initials },
    ownerType: row.owner_type,
    dueDate: row.due_date,
    origin: row.origin,
    status: row.status,
  };
}

function pendencyToRow(p: Pendency) {
  const owner = p.owner as Partial<User>;
  return {
    id: p.id,
    project_id: p.projectId,
    description: p.description,
    owner_id: p.ownerType === "consultant" ? owner.id ?? null : null,
    owner_name: p.owner.name,
    owner_initials: p.owner.initials,
    owner_type: p.ownerType,
    due_date: p.dueDate,
    origin: p.origin,
    status: p.status,
  };
}

function describeError(action: string, err: { message?: string } | null): string {
  return `Não foi possível ${action}: ${err?.message ?? "erro desconhecido"}. A alteração foi desfeita.`;
}

export const useProjectsStore = create<ProjectsState>((set, get) => ({
  projects: MOCK_PROJECTS,
  activitiesByProject: seedActivities(),
  pendencies: MOCK_PENDENCIES,
  loading: false,
  initialized: false,
  syncError: null,
  clearSyncError: () => set({ syncError: null }),

  fetchProjects: async () => {
    set({ loading: true });
    const { data, error } = await supabase
      .from("projects")
      // Colunas de profiles são explícitas: temp_password não é legível pelo
      // cliente (GRANT de coluna), então `profiles(*)` falharia.
      .select(`
        *,
        manager:profiles!projects_manager_id_fkey(${PROFILE_COLUMNS}),
        project_consultants(profile_id, profiles(${PROFILE_COLUMNS}))
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[projects] fetch error:", error);
      set({ loading: false, initialized: true });
      return;
    }

    if (!data || data.length === 0) {
      // Banco vazio → mantém os projetos de demonstração em memória.
      set({ loading: false, initialized: true });
      return;
    }

    const [acts, pends] = await Promise.all([
      supabase
        .from("activities")
        .select(`*, assignee:profiles!activities_assignee_id_fkey(${PROFILE_COLUMNS})`)
        .order("created_at", { ascending: true }),
      supabase
        .from("pendencies")
        .select(`*, owner:profiles!pendencies_owner_id_fkey(${PROFILE_COLUMNS})`)
        .order("created_at", { ascending: false }),
    ]);
    if (acts.error) console.error("[activities] fetch error:", acts.error);
    if (pends.error) console.error("[pendencies] fetch error:", pends.error);

    // Com o banco populado, atividades e pendências vêm só dele — nunca do mock,
    // que usava usuários fictícios.
    const activitiesByProject: Record<string, Activity[]> = {};
    for (const row of acts.data ?? []) {
      (activitiesByProject[row.project_id] ??= []).push(rowToActivity(row));
    }

    set({
      projects: data.map(rowToProject),
      activitiesByProject,
      pendencies: (pends.data ?? []).map(rowToPendency),
      loading: false,
      initialized: true,
    });
  },

  addProject: async (p, typeId) => {
    const acts = templateActivities(p.id, typeId, p.startDate);
    // Optimistic update
    set((s) => ({
      projects: [p, ...s.projects],
      activitiesByProject: { ...s.activitiesByProject, [p.id]: acts },
    }));

    // Persist to Supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: projErr } = await (supabase.from("projects") as any).insert({
      id: p.id,
      name: p.name,
      client: p.client,
      client_initials: p.clientInitials,
      macro_category: p.macroCategory,
      project_type: p.projectType,
      size: p.size,
      complexity: p.complexity,
      status: p.status,
      start_date: p.startDate,
      target_end_date: p.targetEndDate,
      manager_id: p.manager?.id || null,
      progress: p.progress,
      activities_total: p.activitiesTotal,
      activities_done: p.activitiesDone,
      activities_delayed: p.activitiesDelayed,
      last_update: p.lastUpdate,
      tags: p.tags,
    });
    if (projErr) {
      console.error("[projects] insert error:", projErr);
      set((s) => ({
        projects: s.projects.filter((x) => x.id !== p.id),
        syncError: describeError("criar o projeto", projErr),
      }));
      return;
    }
    if (p.consultants.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("project_consultants") as any).insert(
        p.consultants.map((c) => ({ project_id: p.id, profile_id: c.id }))
      );
    }
    if (acts.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: actErr } = await (supabase.from("activities") as any).insert(
        acts.map((a) => activityToRow(p.id, a))
      );
      if (actErr) {
        console.error("[activities] insert error:", actErr);
        set({ syncError: describeError("gravar as atividades do projeto", actErr) });
      }
    }
  },

  updateActivityStatus: async (projectId, activityId, status) => {
    const before = get().activitiesByProject[projectId] ?? [];
    set((s) => ({
      activitiesByProject: {
        ...s.activitiesByProject,
        [projectId]: before.map((a) => (a.id === activityId ? { ...a, status } : a)),
      },
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("activities") as any).update({ status }).eq("id", activityId);
    if (error) {
      set((s) => ({
        activitiesByProject: { ...s.activitiesByProject, [projectId]: before },
        syncError: describeError("mover a atividade", error),
      }));
    }
  },

  addActivity: async (projectId, activity) => {
    set((s) => ({
      activitiesByProject: {
        ...s.activitiesByProject,
        [projectId]: [...(s.activitiesByProject[projectId] ?? []), activity],
      },
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("activities") as any).insert(activityToRow(projectId, activity));
    if (error) {
      set((s) => ({
        activitiesByProject: {
          ...s.activitiesByProject,
          [projectId]: (s.activitiesByProject[projectId] ?? []).filter((a) => a.id !== activity.id),
        },
        syncError: describeError("criar a atividade", error),
      }));
    }
  },

  addPendency: async (p) => {
    set((s) => ({ pendencies: [p, ...s.pendencies] }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("pendencies") as any).insert(pendencyToRow(p));
    if (error) {
      set((s) => ({
        pendencies: s.pendencies.filter((x) => x.id !== p.id),
        syncError: describeError("criar a pendência", error),
      }));
    }
  },

  resolvePendency: (id) => get().updatePendency(id, { status: "resolved" }),

  reopenPendency: (id) => get().updatePendency(id, { status: "open" }),

  updatePendency: async (id, patch) => {
    const before = get().pendencies;
    set({ pendencies: before.map((p) => (p.id === id ? { ...p, ...patch } : p)) });

    const row: Record<string, unknown> = {};
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.description !== undefined) row.description = patch.description;
    if (patch.dueDate !== undefined) row.due_date = patch.dueDate;
    if (Object.keys(row).length === 0) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("pendencies") as any).update(row).eq("id", id);
    if (error) {
      set({ pendencies: before, syncError: describeError("atualizar a pendência", error) });
    }
  },

  setProjectStatus: async (projectId, status) => {
    set((s) => ({
      projects: s.projects.map((p) => (p.id === projectId ? { ...p, status } : p)),
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("projects") as any).update({ status }).eq("id", projectId);
  },

  updateProject: async (projectId, patch) => {
    const today = new Date().toISOString().slice(0, 10);
    // Optimistic in-memory update
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === projectId ? { ...p, ...patch, lastUpdate: today } : p
      ),
    }));

    const dbPatch = projectToDbPatch(patch);
    if (Object.keys(dbPatch).length > 0) {
      dbPatch.last_update = today;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from("projects") as any).update(dbPatch).eq("id", projectId);
      if (error) {
        console.warn("[projects] update returned error (project may be a mock not in DB):", error);
      }
    }

    // Sync consultants if changed
    if (patch.consultants !== undefined) {
      await supabase.from("project_consultants").delete().eq("project_id", projectId);
      if (patch.consultants.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from("project_consultants") as any).insert(
          patch.consultants.map((c) => ({ project_id: projectId, profile_id: c.id }))
        );
      }
    }

  },
}));
