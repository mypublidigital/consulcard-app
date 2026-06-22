import { create } from "zustand";
import type { Activity, ActivityStatusValue, Pendency, Project } from "@/types";
import { MOCK_PROJECTS } from "@/mocks/projects";
import { MOCK_PENDENCIES } from "@/mocks/pendencies";
import { getActivitiesForType } from "@/mocks/activities";
import { USERS } from "@/mocks/users";

interface ProjectsState {
  projects: Project[];
  activitiesByProject: Record<string, Activity[]>;
  pendencies: Pendency[];
  addProject: (p: Project, typeId: string) => void;
  updateActivityStatus: (projectId: string, activityId: string, status: ActivityStatusValue) => void;
  addActivity: (projectId: string, activity: Activity) => void;
  addPendency: (p: Pendency) => void;
  resolvePendency: (id: string) => void;
  updatePendency: (id: string, patch: Partial<Pendency>) => void;
  setProjectStatus: (projectId: string, status: Project["status"]) => void;
  updateProject: (projectId: string, patch: Partial<Project>) => void;
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

export const useProjectsStore = create<ProjectsState>((set) => ({
  projects: MOCK_PROJECTS,
  activitiesByProject: seedActivities(),
  pendencies: MOCK_PENDENCIES,

  addProject: (p, typeId) =>
    set((s) => {
      const acts = getActivitiesForType(typeId).map((a) => ({ ...a, status: "todo" as ActivityStatusValue }));
      return {
        projects: [p, ...s.projects],
        activitiesByProject: { ...s.activitiesByProject, [p.id]: acts },
      };
    }),

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

  setProjectStatus: (projectId, status) =>
    set((s) => ({
      projects: s.projects.map((p) => (p.id === projectId ? { ...p, status } : p)),
    })),

  updateProject: (projectId, patch) =>
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === projectId ? { ...p, ...patch, lastUpdate: new Date().toISOString().slice(0, 10) } : p
      ),
    })),
}));
