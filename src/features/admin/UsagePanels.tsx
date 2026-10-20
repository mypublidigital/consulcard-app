import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, MessageSquare, Sparkles } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useProjectsStore } from "@/store/projects-store";
import { useUsersStore } from "@/store/users-store";
import { loadRecentQuestions } from "@/lib/copilot-history";
import { PROMPTS } from "@/mocks/prompts";
import type { PortfolioMetrics } from "./portfolio-metrics";

/**
 * Perguntas recentes ao co-piloto — reais. Antes era um "Top 10" fixo, com
 * contagens e tendências inventadas (testes de 06/10, backlog 9).
 */
export function TopQuestions() {
  const projects = useProjectsStore((s) => s.projects);
  const users = useUsersStore((s) => s.users);
  const [rows, setRows] = useState<Awaited<ReturnType<typeof loadRecentQuestions>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    loadRecentQuestions(10)
      .then((r) => { if (!cancelled) setRows(r); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? "Projeto";
  const userName = (id: string | null) => (id && users.find((u) => u.id === id)?.name) || "—";

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div>
          <CardTitle>Perguntas recentes ao co-piloto</CardTitle>
          <p className="text-[11px] text-text-faint mt-0.5">as 10 últimas, de todos os projetos</p>
        </div>
        <Badge tone="blue" size="sm"><MessageSquare size={10} /> {rows.length}</Badge>
      </CardHeader>
      <div className="divide-y divide-border">
        {loading && (
          <div className="flex items-center gap-2 px-5 py-6 text-xs text-text-faint"><Loader2 size={12} className="animate-spin" /> Carregando…</div>
        )}
        {error && <div className="px-5 py-4 text-xs text-accent-red">Não foi possível carregar: {error}</div>}
        {!loading && !error && rows.length === 0 && (
          <div className="px-5 py-6 text-center text-xs text-text-faint">Ninguém usou o co-piloto ainda.</div>
        )}
        {rows.map((q, i) => (
          <Link key={i} to={`/projects/${q.projectId}?tab=copilot`} className="block px-5 py-3 hover:bg-surface">
            <div className="text-sm text-text-primary leading-snug line-clamp-2">{q.text}</div>
            <div className="mt-1 text-[10px] text-text-faint">
              {projectName(q.projectId)} · {userName(q.authorId)} · {new Date(q.createdAt).toLocaleDateString("pt-BR")}
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}

/** Fichas da Biblioteca usadas por projeto, nos últimos 30 dias (copilot_messages.prompt_id). */
export function PromptUsageMatrix({ metrics }: { metrics: PortfolioMetrics }) {
  const usage = metrics.promptUsage;
  const projectIds = [...new Set([...usage.values()].flatMap((m) => [...m.keys()]))];
  const projects = projectIds
    .map((id) => metrics.projects.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => !!p);
  const rows = [...usage.entries()]
    .map(([promptId, byProject]) => ({
      promptId,
      title: PROMPTS.find((p) => p.id === promptId)?.title ?? promptId,
      byProject,
      total: [...byProject.values()].reduce((a, b) => a + b, 0),
    }))
    .sort((a, b) => b.total - a.total);
  const grand = rows.reduce((a, r) => a + r.total, 0);
  const maxCell = Math.max(1, ...rows.flatMap((r) => [...r.byProject.values()]));

  function heatClass(v: number): string {
    if (v === 0) return "bg-surface text-text-faint";
    const ratio = v / maxCell;
    if (ratio > 0.66) return "bg-brand-primary text-white font-semibold";
    if (ratio > 0.33) return "bg-brand-primary/40 text-brand-primary font-semibold";
    return "bg-brand-primary/15 text-brand-primary";
  }

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div>
          <CardTitle>Fichas da Biblioteca usadas por projeto</CardTitle>
          <p className="text-[11px] text-text-faint mt-0.5">últimos 30 dias · registrado a partir de 06/10</p>
        </div>
        <Badge tone="purple" size="sm"><Sparkles size={10} /> {grand} usos</Badge>
      </CardHeader>
      {rows.length === 0 ? (
        <div className="px-5 py-6 text-center text-xs text-text-faint">
          Nenhuma ficha usada no período. O uso passa a ser registrado quando uma ficha é carregada no co-piloto
          (Biblioteca → "Usar em projeto" ou lateral do co-piloto).
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-text-faint border-b border-border">
                <th className="px-5 py-3 font-medium">Ficha</th>
                {projects.map((p) => (
                  <th key={p.id} className="py-3 px-2 font-medium text-center min-w-[90px]">{p.name.split(" ").slice(0, 2).join(" ")}</th>
                ))}
                <th className="px-5 py-3 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.promptId} className="border-b border-border last:border-b-0">
                  <td className="px-5 py-2.5">
                    <span className="mr-2 font-mono text-[10px] text-text-faint">{row.promptId}</span>
                    <span className="text-xs text-text-primary">{row.title}</span>
                  </td>
                  {projects.map((p) => {
                    const v = row.byProject.get(p.id) ?? 0;
                    return (
                      <td key={p.id} className="py-2.5 px-2 text-center">
                        <span className={`inline-flex items-center justify-center min-w-[28px] h-6 rounded text-[11px] font-mono ${heatClass(v)}`}>
                          {v > 0 ? v : "—"}
                        </span>
                      </td>
                    );
                  })}
                  <td className="px-5 py-2.5 text-right text-xs font-mono font-semibold text-text-primary">{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
