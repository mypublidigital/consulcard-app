-- ============================================================
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
    ('setup-contabil', 'a1', 0, 'Assessment de Modelo Operacional Contábil', 'Diagnóstico do modelo operacional atual: processos, sistemas, equipe e gaps regulatórios.', 2, 'high', 35, 50, 'diagnostico'),
    ('setup-contabil', 'a2', 1, 'Diagnóstico do Modelo Contábil Atual', 'Análise da situação contábil vigente, identificação de desvios e riscos regulatórios.', 2, 'medium', 20, 30, 'diagnostico'),
    ('setup-contabil', 'a3', 2, 'Elaboração do Roteiro Contábil COSIF', 'Definição do roteiro de lançamentos contábeis conforme normas COSIF do BACEN.', 4, 'high', 40, 55, 'execucao'),
    ('setup-contabil', 'a4', 3, 'Definição do Plano de Contas', 'Estruturação do plano de contas adaptado ao produto financeiro e às exigências regulatórias.', 3, 'high', 35, 50, 'execucao'),
    ('setup-contabil', 'a5', 4, 'Homologação de Saldos Contábeis', 'Validação e conciliação dos saldos contábeis com os sistemas transacionais.', 3, 'medium', 20, 35, 'validacao'),
    ('setup-contabil', 'a6', 5, 'Geração de CADOCs / Reportes BACEN', 'Estruturação e validação dos documentos de reporte ao BACEN.', 4, 'high', 35, 50, 'execucao'),
    ('setup-contabil', 'a7', 6, 'Treinamento da Equipe Contábil', 'Capacitação da equipe interna nos processos e normas implementados.', 1, 'high', 50, 65, 'entrega'),
    ('migracao-processadora', 'm1', 0, 'Kick-off técnico e mapeamento de escopo', 'Alinhamento técnico inicial com a processadora atual e a nova plataforma.', 2, 'medium', 20, 35, 'planejamento'),
    ('migracao-processadora', 'm2', 1, 'Levantamento de produtos e BINs ativos', 'Inventário completo de produtos, BINs, regras e portfólios em produção.', 3, 'high', 40, 55, 'diagnostico'),
    ('migracao-processadora', 'm3', 2, 'Mapeamento de fluxos transacionais', 'Diagrama de fluxos de autorização, captura, liquidação e contestação.', 4, 'high', 45, 60, 'diagnostico'),
    ('migracao-processadora', 'm4', 3, 'Plano de migração e janela de cutover', 'Cronograma detalhado e estratégia de cutover com mitigação de riscos.', 4, 'medium', 25, 40, 'execucao'),
    ('migracao-processadora', 'm5', 4, 'Configuração de produtos na nova plataforma', 'Setup de produtos, regras de negócio e parametrização na Dock.', 4, 'medium', 20, 35, 'execucao'),
    ('migracao-processadora', 'm6', 5, 'Testes integrados e homologação', 'Bateria de testes E2E, reconciliação contábil e validação operacional.', 3, 'medium', 20, 35, 'validacao'),
    ('migracao-processadora', 'm7', 6, 'Go-live e estabilização', 'Execução do cutover e monitoramento intensivo nas primeiras semanas.', 5, 'low', 10, 20, 'entrega'),
    ('migracao-processadora', 'm8', 7, 'Decommission da plataforma legada', 'Desligamento controlado da Orbital após estabilização.', 2, 'low', 10, 20, 'entrega'),
    ('migracao-processadora', 'm9', 8, 'Documentação operacional final', 'Manual operacional, runbooks e treinamento da equipe interna.', 2, 'high', 45, 60, 'entrega'),
    ('kyc-onboarding', 'k1', 0, 'Mapeamento regulatório KYC/PLD', 'Levantamento das normas BACEN, COAF e LGPD aplicáveis ao onboarding.', 3, 'high', 40, 55, 'diagnostico'),
    ('kyc-onboarding', 'k2', 1, 'Desenho da jornada de onboarding', 'Mapeamento de etapas, regras de aprovação e árvore de decisão.', 3, 'high', 35, 50, 'execucao'),
    ('kyc-onboarding', 'k3', 2, 'Política de PLD/AML', 'Elaboração da política interna de prevenção à lavagem de dinheiro.', 3, 'high', 40, 55, 'execucao'),
    ('kyc-onboarding', 'k4', 3, 'Treinamento da equipe de back-office', 'Capacitação operacional dos analistas de onboarding e compliance.', 2, 'high', 45, 60, 'entrega'),
    ('__default__', 'g1', 0, 'Kick-off do projeto', 'Reunião inicial com cliente e equipe.', 1, 'medium', 20, 35, 'planejamento'),
    ('__default__', 'g2', 1, 'Plano de trabalho', 'Elaboração do cronograma e responsáveis.', 2, 'high', 35, 50, 'planejamento'),
    ('__default__', 'g3', 2, 'Status report final', 'Relatório consolidado de encerramento.', 1, 'high', 50, 65, 'entrega')
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
