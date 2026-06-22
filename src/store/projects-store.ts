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
  fetchProjects: () => Promise<void>;
  addProject: (p: Project, typeId: string) => Promise<void>;
  updateActivityStatus: (projectId: string, activityId: string, status: ActivityStatusValue) => void;
  addActivity: (projectId: string, activity: Activity) => void;
  addPendency: (p: Pendency) => void;
  resolvePendency: (id: string) => void;
  updatePendency: (id: string, patch: Partial<Pendency>) => void;
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

export const useProjectsStore = create<ProjectsState>((set) => ({
  projects: MOCK_PROJECTS,
  activitiesByProject: seedActivities(),
  pendencies: MOCK_PENDENCIES,
  loading: false,
  initialized: false,

  fetchProjects: async () => {
    set({ loading: true });
    const { data, error } = await supabase
      .from("projects")
      .select(`
        *,
        manager:profiles!projects_manager_id_fkey(*),
        project_consultants(profile_id, profiles(*))
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[projects] fetch error:", error);
      set({ loading: false, initialized: true });
      return;
    }

    if (data && data.length > 0) {
      set({ projects: data.map(rowToProject), loading: false, initialized: true });
    } else {
      // Empty DB → keep mock projects as demo data
      set({ loading: false, initialized: true });
    }
  },

  addProject: async (p, typeId) => {
    // Optimistic update
    set((s) => {
      const acts = getActivitiesForType(typeId).map((a) => ({ ...a, status: "todo" as ActivityStatusValue }));
      return {
        projects: [p, ...s.projects],
        activitiesByProject: { ...s.activitiesByProject, [p.id]: acts },
      };
    });

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
      return;
    }
    if (p.consultants.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("project_consultants") as any).insert(
        p.consultants.map((c) => ({ project_id: p.id, profile_id: c.id }))
      );
    }
  },

  updateActivityStatus: (projectId, activityId, status) =>
    set((s) => {
      const list = s.activitiesByProject[projectId] ?? [];
      const updated = list.map((a) => (a.id === activityId ? { ...a, status } : a));
      return { activitiesByProject: { ...s.activitiesByProject, [projectId]: updated } };
    }),

  addActivity: (projectId, activity) =>
    set((s) => {
      const list = s.activitiesByProject[projectId] ?? [];
      return { activitiesByProject: { ...s.activitiesByProject, [projectId]: [...list, activity] } };
    }),

  addPendency: (p) => set((s) => ({ pendencies: [p, ...s.pendencies] })),

  resolvePendency: (id) =>
    set((s) => ({
      pendencies: s.pendencies.map((p) => (p.id === id ? { ...p, status: "resolved" } : p)),
    })),

  updatePendency: (id, patch) =>
    set((s) => ({ pendencies: s.pendencies.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),

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
