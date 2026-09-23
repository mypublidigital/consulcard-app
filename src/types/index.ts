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
  /** Se o usuário logado tem permissão para ver a senha deste perfil (hierarquia de papéis). */
  canViewPassword?: boolean;
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

/** Tier de modelo recomendado pela planilha (aba 07 · Custo-Benefício LLM). */
export type PromptTier = "T1" | "T2" | "T3";

export interface PromptDef {
  id: string;
  /** Bloco de origem na biblioteca (ex: "Bloco 0 — Pré-Execução"). */
  bloco: string;
  title: string;
  macroCategory: string;
  /** Preenchido só quando o prompt vale para mais de uma macro (ex: "Meios de Pagamento / Banking"). */
  macroCategories?: string[];
  projectTypeId: string | "all";
  activityLabel: string;
  phase: ProjectPhase;
  /** Fase original da planilha, antes do mapeamento para as 5 fases do app. */
  phaseLabel: string;
  tier?: PromptTier;
  modelo?: string;
  alternativo?: string;
  insumos?: string;
  entregavel?: string;
  /** "pending" = prompt não reescrito, aguardando especialista (R2, R4). */
  status: "ready" | "pending";
  body: string;
}

export interface Document {
  id: string;
  name: string;
  type: "ata" | "cronograma" | "report" | "entregavel" | "outro";
  date: string;
  sharepointUrl: string;
}
