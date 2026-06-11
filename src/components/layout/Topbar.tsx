import { Bell, Plus, ChevronRight, LogOut } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { useProjectsStore } from "@/store/projects-store";
import { useAuthStore } from "@/store/auth-store";

function buildCrumbs(pathname: string, projects: { id: string; name: string; client: string }[]) {
  const segs = pathname.split("/").filter(Boolean);
  if (segs.length === 0) return [{ label: "Dashboard", to: "/" }];
  const out: { label: string; to: string }[] = [];
  let acc = "";
  for (let i = 0; i < segs.length; i++) {
    acc += "/" + segs[i];
    let label = segs[i];
    if (segs[i] === "projects") label = "Projetos";
    else if (segs[i] === "new") label = "Novo Projeto";
    else if (segs[i] === "prompts") label = "Biblioteca de Prompts";
    else if (segs[i] === "admin") label = "Painel Executivo";
    else if (segs[i] === "users") label = "Usuários";
    else if (segs[i] === "client") label = "Portal do Cliente";
    else if (i > 0 && segs[i - 1] === "projects") {
      const p = projects.find((x) => x.id === segs[i]);
      label = p?.name ?? segs[i];
    } else if (i > 0 && segs[i - 1] === "client") {
      const p = projects.find((x) => x.id === segs[i]);
      label = p?.client ?? segs[i];
    }
    out.push({ label, to: acc });
  }
  return out;
}

export function Topbar() {
  const location = useLocation();
  const projects = useProjectsStore((s) => s.projects);
  const crumbs = buildCrumbs(location.pathname, projects);
  const onClient = location.pathname.startsWith("/client/");

  const currentUser = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout);

  if (onClient) return null;

  const initials = currentUser?.initials ?? "??";

  return (
    <header className="h-14 shrink-0 border-b border-border bg-white">
      <div className="flex items-center justify-between h-full px-6">
        <nav className="flex items-center gap-1.5 text-sm text-text-muted">
          {crumbs.map((c, i) => (
            <span key={c.to} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight size={14} className="text-text-faint" />}
              {i === crumbs.length - 1 ? (
                <span className="text-text-primary font-medium">{c.label}</span>
              ) : (
                <Link to={c.to} className="hover:text-text-primary">
                  {c.label}
                </Link>
              )}
            </span>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link to="/projects/new">
            <Button size="sm" leftIcon={<Plus size={14} />}>
              Novo Projeto
            </Button>
          </Link>
          <button
            aria-label="Notificações"
            className="relative h-9 w-9 rounded-md hover:bg-[#F0EDE6] flex items-center justify-center text-text-muted"
          >
            <Bell size={16} />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-accent-red" />
          </button>
          <Avatar initials={initials} size="sm" tone="brand" />
          <button
            onClick={logout}
            title="Sair"
            className="h-9 w-9 rounded-md hover:bg-accent-red/10 flex items-center justify-center text-text-faint hover:text-accent-red transition-colors"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </header>
  );
}
