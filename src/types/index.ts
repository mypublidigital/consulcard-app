export type LLMImpactLevel = "high" | "medium" | "low";
export type ActivityStatusValue = "todo" | "in_progress" | "review" | "done";
export type ProjectStatus = "planning" | "in_progress" | "review" | "closed";
export type ProjectPhase = "planejamento" | "diagnostico" | "execucao" | "validacao" | "entrega";
export type PromptKind = "specialist" | "generalist";
export type UserRole = "admin" | "diretor" | "gerente" | "consultor";

export interface User {
  id: string;
  name: string;
  initials: string;
  role?: string;
  // Extended fields for user management
  systemRole?: UserRole;
  email?: string;
  whatsapp?: string;
  linkedin?: string;
  password?: string;
  active?: boolean;
  createdAt?: string;
}

export interface ProjectType {
  id: string;
  label: string;
  complexity: string;
  anchor?: boolean;
}

export interface MacroCategory {
  id: string;
  label: string;
  color: "blue" | "purple" | "teal" | "amber" | "green" | "red";
  types: ProjectType[];
}

export interface Activity {
  id: string;
  label: string;
  description: string;
  complexity: 1 | 2 | 3 | 4 | 5;
  llmImpact: LLMImpactLevel;
  llmIndexMin: number;
  llmIndexMax: number;
  phase: ProjectPhase | "planejamento";
  status?: ActivityStatusValue;
  assignee?: User;
  dueDate?: string;
  pendingCount?: number;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  clientInitials: string;
  macroCategory: string;
  projectType: string;
  size: "P1" | "P2" | "P3" | "P4" | "P5";
  complexity: 1 | 2 | 3 | 4 | 5;
  status: ProjectStatus;
  startDate: string;
  targetEndDate: string;
  manager: User;
  consultants: User[];
  progress: number;
  activitiesTotal: number;
  activitiesDone: number;
  activitiesDelayed: number;
  lastUpdate: string;
  tags: string[];
}

export interface Pendency {
  id: string;
  projectId: string;
  description: string;
  owner: User | { name: string; initials: string };
  ownerType: "consultant" | "client";
  dueDate: string;
  origin: "reuniao" | "manual" | "agente";
  status: "open" | "resolved";
}

export interface PromptDef {
  id: string;
  title: string;
  macroCategory: string;
  projectTypeId: string | "all";
  activityLabel: string;
  kind: PromptKind;
  phase: ProjectPhase;
  body: string;
}

export interface Document {
  id: string;
  name: string;
  type: "ata" | "cronograma" | "report" | "entregavel" | "outro";
  date: string;
  driveUrl: string;
}
