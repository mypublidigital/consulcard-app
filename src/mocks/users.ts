import type { UserRole } from "@/types";

// Rótulos dos perfis de acesso. Os usuários de exemplo que ficavam aqui foram
// removidos (testes de 06/10): eles apareciam no lugar de pessoas reais.
export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  diretor: "Diretor",
  gerente: "Gerente de Projetos",
  consultor: "Consultor",
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: "Acesso total ao sistema, incluindo Painel Executivo e gestão de usuários",
  diretor: "Acesso ao Painel Executivo completo e gestão de usuários",
  gerente: "Acesso ao Painel Executivo filtrado pelos próprios projetos",
  consultor: "Acesso ao dashboard, projetos atribuídos e biblioteca de prompts",
};
