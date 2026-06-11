export type UserRole = "admin" | "diretor" | "gerente" | "consultor";
export type ProjectStatus = "planning" | "in_progress" | "review" | "closed";
export type ActivityStatus = "todo" | "in_progress" | "review" | "done";
export type LLMImpact = "high" | "medium" | "low";
export type ProjectPhase = "planejamento" | "diagnostico" | "execucao" | "validacao" | "entrega";
export type PendencyOrigin = "reuniao" | "manual" | "agente";
export type PendencyStatus = "open" | "resolved";
export type OwnerType = "consultant" | "client";
export type PromptKind = "specialist" | "generalist";
export type DocType = "ata" | "cronograma" | "report" | "entregavel" | "outro";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          initials: string;
          role: string | null;
          system_role: UserRole | null;
          whatsapp: string | null;
          linkedin: string | null;
          active: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at"> & { created_at?: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      };
      projects: {
        Row: {
          id: string;
          name: string;
          client: string;
          client_initials: string;
          macro_category: string;
          project_type: string;
          size: "P1" | "P2" | "P3" | "P4" | "P5";
          complexity: number;
          status: ProjectStatus;
          start_date: string;
          target_end_date: string;
          manager_id: string;
          progress: number;
          activities_total: number;
          activities_done: number;
          activities_delayed: number;
          last_update: string;
          tags: string[];
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["projects"]["Row"], "created_at"> & { created_at?: string };
        Update: Partial<Database["public"]["Tables"]["projects"]["Row"]>;
      };
      project_consultants: {
        Row: { project_id: string; profile_id: string };
        Insert: Database["public"]["Tables"]["project_consultants"]["Row"];
        Update: Partial<Database["public"]["Tables"]["project_consultants"]["Row"]>;
      };
      activities: {
        Row: {
          id: string;
          project_id: string;
          label: string;
          description: string;
          complexity: number;
          llm_impact: LLMImpact;
          llm_index_min: number;
          llm_index_max: number;
          phase: ProjectPhase;
          status: ActivityStatus;
          assignee_id: string | null;
          due_date: string | null;
          pending_count: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["activities"]["Row"], "created_at"> & { created_at?: string };
        Update: Partial<Database["public"]["Tables"]["activities"]["Row"]>;
      };
      pendencies: {
        Row: {
          id: string;
          project_id: string;
          description: string;
          owner_id: string | null;
          owner_name: string;
          owner_initials: string;
          owner_type: OwnerType;
          due_date: string;
          origin: PendencyOrigin;
          status: PendencyStatus;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["pendencies"]["Row"], "created_at"> & { created_at?: string };
        Update: Partial<Database["public"]["Tables"]["pendencies"]["Row"]>;
      };
      prompts: {
        Row: {
          id: string;
          title: string;
          macro_category: string;
          project_type_id: string;
          activity_label: string;
          kind: PromptKind;
          phase: ProjectPhase;
          body: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["prompts"]["Row"], "created_at"> & { created_at?: string };
        Update: Partial<Database["public"]["Tables"]["prompts"]["Row"]>;
      };
    };
  };
}
