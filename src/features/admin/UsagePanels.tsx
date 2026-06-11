import { ArrowDown, ArrowRight, ArrowUp, MessageSquare, Sparkles } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { TOP_QUESTIONS, PROMPT_USAGE } from "@/mocks/admin";
import { useProjectsStore } from "@/store/projects-store";

const CAT_LABELS: Record<string, { label: string; tone: any }> = {
  regulatorio: { label: "Regulatório", tone: "blue" },
  tecnico: { label: "Técnico", tone: "purple" },
  gestao: { label: "Gestão", tone: "neutral" },
  produto: { label: "Produto", tone: "amber" },
  contabil: { label: "Contábil", tone: "green" },
};

export function TopQuestions() {
  const projects = useProjectsStore((s) => s.projects);
  const maxCount = Math.max(...TOP_QUESTIONS.map((q) => q.count));

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div>
          <CardTitle>Top 10 perguntas ao co-piloto</CardTitle>
          <p className="text-[11px] text-text-faint mt-0.5">consultores · últimos 30 dias</p>
        </div>
        <Badge tone="blue" size="sm">
          <MessageSquare size={10} /> {TOP_QUESTIONS.reduce((a, q) => a + q.count, 0)} perguntas
        </Badge>
      </CardHeader>
      <div className="divide-y divide-border">
        {TOP_QUESTIONS.map((q, idx) => {
          const cat = CAT_LABELS[q.category];
          const TrendIcon = q.trend === "up" ? ArrowUp : q.trend === "down" ? ArrowDown : ArrowRight;
          const trendColor = q.trend === "up" ? "text-accent-green" : q.trend === "down" ? "text-accent-red" : "text-text-faint";
          return (
            <div key={q.id} className="px-5 py-3 hover:bg-surface">
              <div className="flex items-start gap-3">
                <span className="text-[11px] font-mono text-text-faint w-5 pt-0.5">{(idx + 1).toString().padStart(2, "0")}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-text-primary leading-snug">{q.question}</div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <Badge tone={cat.tone} size="sm">{cat.label}</Badge>
                    {q.topProjects.slice(0, 2).map((pid) => {
                      const proj = projects.find((p) => p.id === pid);
                      return proj ? (
                        <span key={pid} className="text-[10px] text-text-faint font-mono">
                          · {proj.name.slice(0, 26)}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-semibold font-mono text-text-primary">{q.count}</div>
                  <div className={`flex items-center justify-end gap-0.5 text-[10px] font-mono ${trendColor}`}>
                    <TrendIcon size={10} />
                    {q.trendPct > 0 ? "+" : ""}{q.trendPct}%
                  </div>
                </div>
              </div>
              <div className="mt-2 h-0.5 rounded-full bg-[#EFEBE3] overflow-hidden">
                <div
                  className="h-full bg-brand-primary/40"
                  style={{ width: `${(q.count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function PromptUsageMatrix() {
  const projects = useProjectsStore((s) => s.projects);
  const totalsByProject = projects.map((p) => ({
    id: p.id,
    name: p.name,
    total: PROMPT_USAGE.reduce((a, row) => a + (row.usage[p.id] ?? 0), 0),
  }));
  const grand = PROMPT_USAGE.reduce((a, r) => a + r.total, 0);

  function heatClass(v: number, max: number): string {
    if (v === 0) return "bg-surface text-text-faint";
    const ratio = v / max;
    if (ratio > 0.66) return "bg-brand-primary text-white font-semibold";
    if (ratio > 0.33) return "bg-brand-primary/40 text-brand-primary font-semibold";
    return "bg-brand-primary/15 text-brand-primary";
  }

  const maxCell = Math.max(...PROMPT_USAGE.flatMap((r) => Object.values(r.usage)));

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div>
          <CardTitle>Prompts usados por projeto</CardTitle>
          <p className="text-[11px] text-text-faint mt-0.5">matriz de uso · últimos 30 dias</p>
        </div>
        <Badge tone="purple" size="sm">
          <Sparkles size={10} /> {grand} usos
        </Badge>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-text-faint border-b border-border">
              <th className="px-5 py-3 font-medium">Prompt</th>
              {projects.map((p) => (
                <th key={p.id} className="py-3 px-2 font-medium text-center min-w-[90px]">
                  {p.name.split(" ").slice(0, 2).join(" ")}
                </th>
              ))}
              <th className="px-5 py-3 font-medium text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {PROMPT_USAGE.map((row) => (
              <tr key={row.promptId} className="border-b border-border last:border-b-0">
                <td className="px-5 py-2.5">
                  <div className="flex items-center gap-2">
                    <Badge tone={row.kind === "specialist" ? "blue" : "neutral"} size="sm">
                      {row.kind === "specialist" ? "E" : "G"}
                    </Badge>
                    <span className="text-xs text-text-primary">{row.promptTitle}</span>
                  </div>
                </td>
                {projects.map((p) => {
                  const v = row.usage[p.id] ?? 0;
                  return (
                    <td key={p.id} className="py-2.5 px-2 text-center">
                      <span className={`inline-flex items-center justify-center min-w-[28px] h-6 rounded text-[11px] font-mono ${heatClass(v, maxCell)}`}>
                        {v > 0 ? v : "—"}
                      </span>
                    </td>
                  );
                })}
                <td className="px-5 py-2.5 text-right text-xs font-mono font-semibold text-text-primary">{row.total}</td>
              </tr>
            ))}
            <tr className="bg-surface">
              <td className="px-5 py-2.5 text-[11px] uppercase tracking-wider text-text-faint font-medium">Total por projeto</td>
              {totalsByProject.map((p) => (
                <td key={p.id} className="py-2.5 px-2 text-center text-xs font-mono font-semibold text-text-primary">{p.total}</td>
              ))}
              <td className="px-5 py-2.5 text-right text-sm font-mono font-bold text-brand-primary">{grand}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="px-5 py-3 border-t border-border flex items-center gap-3 text-[10px] text-text-faint">
        <span>Legenda:</span>
        <span className="inline-flex items-center gap-1"><span className="h-3 w-5 rounded bg-brand-primary/15" /> Baixo</span>
        <span className="inline-flex items-center gap-1"><span className="h-3 w-5 rounded bg-brand-primary/40" /> Médio</span>
        <span className="inline-flex items-center gap-1"><span className="h-3 w-5 rounded bg-brand-primary" /> Alto</span>
        <span className="ml-auto">E = Especialista · G = Generalista</span>
      </div>
    </Card>
  );
}
