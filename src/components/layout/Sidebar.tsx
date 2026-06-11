import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  BookOpenText,
  Database,
  ExternalLink,
  Crown,
  Users,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";
import { MOCK_PROJECTS } from "@/mocks/projects";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/projects", label: "Projetos", icon: FolderKanban },
  { to: "/prompts", label: "Biblioteca de Prompts", icon: BookOpenText },
  { to: "/knowledge", label: "Base de Conhecimento", icon: Database, disabled: true },
];

export function Sidebar() {
  const currentUser = useAuthStore((s) => s.currentUser);
  return (
    <aside className="hidden md:flex flex-col w-[240px] shrink-0 h-screen bg-sidebar text-white">
      <div className="px-5 py-5">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-brand-primary flex items-center justify-center font-bold text-sm">
            C
          </div>
          <div>
            <div className="text-sm font-semibold tracking-wide">Consulcard</div>
            <div className="text-[10px] text-white/50 font-mono">v0.1 · interno</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 mt-2 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          if (item.disabled) {
            return (
              <div
                key={item.to}
                className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-white/35 cursor-not-allowed"
                title="Em breve"
              >
                <Icon size={16} />
                <span className="flex-1">{item.label}</span>
                <span className="text-[10px] uppercase tracking-wider">em breve</span>
              </div>
            );
          }
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  isActive
                    ? "bg-brand-primary text-white"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                )
              }
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}

        <div className="my-3 border-t border-white/10" />

        <div className="px-2 mb-1 text-[10px] uppercase tracking-wider text-white/40">
          Diretoria
        </div>
        <NavLink
          to="/admin"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
              isActive ? "bg-brand-primary text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
            )
          }
        >
          <Crown size={16} />
          <span>Painel Executivo</span>
        </NavLink>
        <NavLink
          to="/users"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
              isActive ? "bg-brand-primary text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
            )
          }
        >
          <Users size={16} />
          <span>Usuários</span>
        </NavLink>

        <div className="my-3 border-t border-white/10" />

        <div className="px-2 mb-1 text-[10px] uppercase tracking-wider text-white/40">
          Portal do Cliente
        </div>
        {MOCK_PROJECTS.slice(0, 2).map((p) => (
          <NavLink
            key={p.id}
            to={`/client/${p.id}`}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-1.5 rounded-md text-xs transition-colors",
                isActive ? "bg-white/10 text-white" : "text-white/55 hover:bg-white/5 hover:text-white"
              )
            }
          >
            <ExternalLink size={12} />
            <span className="truncate">{p.client}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-3 px-2 py-1.5">
          <Avatar initials={currentUser?.initials ?? "??"} size="sm" tone="brand" />
          <div className="min-w-0">
            <div className="text-xs font-medium truncate">{currentUser?.name ?? "—"}</div>
            <div className="text-[10px] text-white/45 truncate">{currentUser?.role ?? ""}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
