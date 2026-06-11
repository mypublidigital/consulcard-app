import type { User, UserRole } from "@/types";

export const USERS: User[] = [
  {
    id: "u1",
    name: "Wagner Lima",
    initials: "WL",
    role: "Sócio",
    systemRole: "admin",
    email: "wagner.lima@consulcard.com.br",
    whatsapp: "+55 11 99000-0001",
    linkedin: "linkedin.com/in/wagner-lima",
    password: "Cc@2024!WL",
    active: true,
    createdAt: "2024-01-10",
  },
  {
    id: "u2",
    name: "Rogério Andrade",
    initials: "RA",
    role: "Diretor",
    systemRole: "diretor",
    email: "rogerio.andrade@consulcard.com.br",
    whatsapp: "+55 11 99000-0002",
    linkedin: "linkedin.com/in/rogerio-andrade",
    password: "Cc@2024!RA",
    active: true,
    createdAt: "2024-01-15",
  },
  {
    id: "u3",
    name: "João Sales",
    initials: "JS",
    role: "Gerente de Projeto",
    systemRole: "gerente",
    email: "joao.sales@consulcard.com.br",
    whatsapp: "+55 11 99000-0003",
    linkedin: "linkedin.com/in/joao-sales",
    password: "Cc@2024!JS",
    active: true,
    createdAt: "2024-02-01",
  },
  {
    id: "u4",
    name: "Débora Costa",
    initials: "DC",
    role: "Consultora",
    systemRole: "consultor",
    email: "debora.costa@consulcard.com.br",
    whatsapp: "+55 11 99000-0004",
    linkedin: "linkedin.com/in/debora-costa",
    password: "Cc@2024!DC",
    active: true,
    createdAt: "2024-02-10",
  },
  {
    id: "u5",
    name: "Marina Toledo",
    initials: "MT",
    role: "Consultora",
    systemRole: "consultor",
    email: "marina.toledo@consulcard.com.br",
    whatsapp: "+55 11 99000-0005",
    linkedin: "linkedin.com/in/marina-toledo",
    password: "Cc@2024!MT",
    active: true,
    createdAt: "2024-02-15",
  },
];

export const CURRENT_USER: User = USERS[0];

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
