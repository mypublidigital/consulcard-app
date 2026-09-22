// Gera supabase/migrations/0006_backfill_activities.sql a partir dos modelos de
// src/mocks/activities.ts, para que SQL e código não divirjam.
// Requer Node 23.6+ (remoção de tipos nativa para importar o .ts).
//   node scripts/gen-activities-backfill.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
// import() precisa de URL file:// — caminho absoluto cru quebra no Windows.
const { ACTIVITIES_BY_TYPE, DEFAULT_ACTIVITIES } = await import(
  pathToFileURL(path.join(here, "..", "src", "mocks", "activities.ts")).href
);

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

// Uma linha por (tipo de projeto, modelo de atividade). "__default__" cobre
// os tipos sem modelo próprio, espelhando getActivitiesForType().
const rows = [];
for (const [type, list] of Object.entries(ACTIVITIES_BY_TYPE)) {
  list.forEach((a, idx) => rows.push([type, a, idx]));
}
DEFAULT_ACTIVITIES.forEach((a, idx) => rows.push(["__default__", a, idx]));

const values = rows
  .map(
    ([type, a, idx]) =>
      `    (${q(type)}, ${q(a.id)}, ${idx}, ${q(a.label)}, ${q(a.description)}, ${a.complexity}, ${q(a.llmImpact)}, ${a.llmIndexMin}, ${a.llmIndexMax}, ${q(a.phase)})`
  )
  .join(",\n");

const sql = `-- ============================================================
-- GERADO por scripts/gen-activities-backfill.mjs — não editar à mão.
--
-- Preenche as atividades dos projetos que já existem no banco. Até aqui elas
-- nasciam só na memória do navegador de quem criava o projeto: o banco tinha
-- 0 atividades para 6 projetos (itens 5 e 7 da lista da Consulcard).
--
-- Idempotente: IDs determinísticos (<projeto>__<modelo>) + ON CONFLICT DO
-- NOTHING, e só age em projetos que ainda não têm nenhuma atividade.
-- ============================================================

with templates (project_type, template_id, idx, label, description, complexity,
                llm_impact, llm_index_min, llm_index_max, phase) as (
  values
${values}
),
alvo as (
  -- Projetos sem nenhuma atividade gravada.
  select p.*
  from public.projects p
  where not exists (select 1 from public.activities a where a.project_id = p.id)
),
resolvido as (
  -- Tipo sem modelo próprio usa o padrão, como no código.
  select a.id as project_id, a.start_date,
         coalesce(
           (select t.project_type from templates t where t.project_type = a.project_type limit 1),
           '__default__'
         ) as tpl_type,
         a.id as pid
  from alvo a
)
insert into public.activities (
  id, project_id, label, description, complexity, llm_impact,
  llm_index_min, llm_index_max, phase, status, due_date, pending_count
)
select
  r.project_id || '__' || t.template_id,
  r.project_id,
  t.label, t.description, t.complexity, t.llm_impact,
  t.llm_index_min, t.llm_index_max, t.phase,
  -- Os dois projetos de demonstração mantêm o andamento que já exibiam.
  case
    when r.pid = 'proj-001' and t.idx < 3  then 'done'
    when r.pid = 'proj-001' and t.idx < 5  then 'in_progress'
    when r.pid = 'proj-001' and t.idx = 5  then 'review'
    when r.pid = 'proj-002' and t.idx = 0  then 'done'
    when r.pid = 'proj-002' and t.idx = 1  then 'in_progress'
    else 'todo'
  end,
  -- Mesma regra de prazo que o front usava: início + (posição+1) × 14 dias.
  r.start_date + ((t.idx + 1) * 14),
  0
from resolvido r
join templates t on t.project_type = r.tpl_type
on conflict (id) do nothing;
`;

const out = path.join(here, "..", "supabase", "migrations", "0006_backfill_activities.sql");
fs.writeFileSync(out, sql, "utf8");
console.log(`modelos: ${rows.length} linhas (${Object.keys(ACTIVITIES_BY_TYPE).length} tipos + padrão)`);
console.log("gerado:", path.relative(process.cwd(), out));
