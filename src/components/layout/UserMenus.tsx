import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCircle2, KeyRound, LogOut, Mail, AlertCircle, Clock, X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { NewPasswordForm } from "@/components/auth/NewPasswordForm";
import { useAuthStore } from "@/store/auth-store";
import { useProjectsStore } from "@/store/projects-store";
import { ROLE_LABELS } from "@/mocks/users";
import { cn } from "@/lib/utils";

/** Fecha o painel ao clicar fora ou apertar Esc. */
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

// ── Perfil (GAP #2: clicar nas iniciais não fazia nada) ─────────────────────
export function ProfileMenu() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout);
  const [open, setOpen] = useState(false);
  const [changing, setChanging] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));

  if (!currentUser) return null;
  const roleLabel = currentUser.systemRole ? ROLE_LABELS[currentUser.systemRole] : currentUser.role;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-full focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Meu perfil"
      >
        <Avatar initials={currentUser.initials} size="sm" tone="brand" />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-11 z-50 w-72 max-h-[calc(100dvh-4rem)] overflow-y-auto rounded-lg border border-border bg-white shadow-xl">
          <div className="flex items-center gap-3 border-b border-border p-4">
            <Avatar initials={currentUser.initials} size="md" tone="brand" />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-text-primary">{currentUser.name}</div>
              {roleLabel && <div className="text-xs text-text-muted">{roleLabel}</div>}
              {currentUser.email && (
                <div className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-text-faint">
                  <Mail size={10} className="shrink-0" /> {currentUser.email}
                </div>
              )}
            </div>
          </div>
          <div className="p-1.5">
            <button
              role="menuitem"
              onClick={() => { setOpen(false); setChanging(true); }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-text-primary hover:bg-surface"
            >
              <KeyRound size={14} className="text-text-muted" /> Alterar senha
            </button>
            <button
              role="menuitem"
              onClick={logout}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-accent-red hover:bg-accent-red/10"
            >
              <LogOut size={14} /> Sair
            </button>
          </div>
        </div>
      )}

      {changing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={() => setChanging(false)}>
          <div className="w-full max-w-sm max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-border bg-white shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h3 className="text-base font-semibold text-text-primary">Alterar senha</h3>
              <button onClick={() => setChanging(false)} className="text-text-faint hover:text-text-primary" aria-label="Fechar">
                <X size={16} />
              </button>
            </div>
            <div className="p-6">
              <NewPasswordForm onDone={() => setChanging(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Notificações (GAP #3: o sino não abria nada e o ponto vermelho era fixo) ──
interface Notice {
  key: string;
  projectId: string;
  projectName: string;
  tab: "activities" | "pendencies";
  kind: "Pendência" | "Atividade";
  text: string;
  dueDate: string;
  overdue: boolean;
}

const SOON_DAYS = 3;

function useNotices(): Notice[] {
  const currentUser = useAuthStore((s) => s.currentUser);
  const projects = useProjectsStore((s) => s.projects);
  const pendencies = useProjectsStore((s) => s.pendencies);
  const activitiesByProject = useProjectsStore((s) => s.activitiesByProject);

  return useMemo(() => {
    if (!currentUser) return [];
    const today = new Date().toISOString().slice(0, 10);
    const soon = new Date(Date.now() + SOON_DAYS * 86_400_000).toISOString().slice(0, 10);
    const nameOf = new Map(projects.map((p) => [p.id, p.name]));
    // Gerente vê também o que vence nos projetos que gerencia.
    const managed = new Set(projects.filter((p) => p.manager?.id === currentUser.id).map((p) => p.id));
    const out: Notice[] = [];

    for (const p of pendencies) {
      if (p.status !== "open" || !p.dueDate || p.dueDate > soon) continue;
      const mine = "id" in p.owner && p.owner.id === currentUser.id;
      if (!mine && !managed.has(p.projectId)) continue;
      out.push({
        key: `p-${p.id}`,
        projectId: p.projectId,
        projectName: nameOf.get(p.projectId) ?? "Projeto",
        tab: "pendencies",
        kind: "Pendência",
        text: mine ? p.description : `${p.description} — ${p.owner.name}`,
        dueDate: p.dueDate,
        overdue: p.dueDate < today,
      });
    }
    for (const [projectId, acts] of Object.entries(activitiesByProject)) {
      for (const a of acts) {
        if (a.status === "done" || !a.dueDate || a.dueDate > soon) continue;
        const mine = a.assignee?.id === currentUser.id;
        if (!mine && !managed.has(projectId)) continue;
        out.push({
          key: `a-${a.id}`,
          projectId,
          projectName: nameOf.get(projectId) ?? "Projeto",
          tab: "activities",
          kind: "Atividade",
          text: mine || !a.assignee ? a.label : `${a.label} — ${a.assignee.name}`,
          dueDate: a.dueDate,
          overdue: a.dueDate < today,
        });
      }
    }
    return out.sort((x, y) => x.dueDate.localeCompare(y.dueDate));
  }, [currentUser, projects, pendencies, activitiesByProject]);
}

export function NotificationsMenu() {
  const notices = useNotices();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const overdue = notices.filter((n) => n.overdue).length;

  return (
    <div ref={ref} className="relative">
      <button
        aria-label="Notificações"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative h-9 w-9 rounded-md hover:bg-[#EDEEEF] flex items-center justify-center text-text-muted"
        title={notices.length ? `${notices.length} item(ns) vencido(s) ou vencendo` : "Sem pendências vencendo"}
      >
        <Bell size={16} />
        {notices.length > 0 && (
          <span
            className={cn(
              "absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full px-1 text-[10px] font-semibold leading-4 text-white text-center",
              overdue ? "bg-accent-red" : "bg-accent-amber"
            )}
          >
            {notices.length > 9 ? "9+" : notices.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-96 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-white shadow-xl">
          <div className="border-b border-border px-4 py-3">
            <div className="text-sm font-semibold text-text-primary">Notificações</div>
            <div className="text-[11px] text-text-faint">
              Suas pendências e atividades — e as dos projetos que você gerencia — vencidas ou vencendo em até {SOON_DAYS} dias.
            </div>
          </div>
          <div className="max-h-[min(24rem,calc(100dvh-10rem))] overflow-y-auto divide-y divide-border">
            {notices.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center text-xs text-text-faint">
                <CheckCircle2 size={20} className="text-accent-green" />
                Nada vencido ou vencendo. Tudo em dia.
              </div>
            ) : (
              notices.map((n) => (
                <button
                  key={n.key}
                  onClick={() => { setOpen(false); navigate(`/projects/${n.projectId}?tab=${n.tab}`); }}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-surface"
                >
                  {n.overdue
                    ? <AlertCircle size={14} className="mt-0.5 shrink-0 text-accent-red" />
                    : <Clock size={14} className="mt-0.5 shrink-0 text-accent-amber" />}
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-text-primary line-clamp-2">{n.text}</div>
                    <div className="mt-0.5 text-[10px] text-text-faint">
                      {n.kind} · {n.projectName} ·{" "}
                      <span className={n.overdue ? "text-accent-red font-medium" : ""}>
                        {n.overdue ? "venceu em " : "vence em "}
                        {new Date(`${n.dueDate}T12:00:00`).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
