-- ============================================================
-- Fase 1 da lista de erros da Consulcard: persistência
--
-- Itens 1 e 12: o histórico do co-piloto vivia só em memória no navegador e
-- sumia ao sair da tela. Passa a ser gravado por projeto.
--
-- (Atividades e pendências já tinham tabela desde o schema original, mas o
-- front nunca gravava nelas — itens 5, 6 e 7. Corrigido no código; o
-- preenchimento dos projetos existentes está em 0006.)
-- ============================================================

create table if not exists public.copilot_messages (
  id          uuid        primary key default gen_random_uuid(),
  project_id  text        not null references public.projects(id) on delete cascade,
  -- Quem enviou (role=user) ou quem disparou a resposta (role=assistant).
  author_id   uuid        references public.profiles(id) on delete set null,
  role        text        not null check (role in ('user','assistant')),
  content     text        not null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_copilot_messages_project
  on public.copilot_messages(project_id, created_at);

alter table public.copilot_messages enable row level security;

-- O co-piloto é a memória do projeto: toda a equipe lê o histórico.
drop policy if exists "copilot_messages: read" on public.copilot_messages;
create policy "copilot_messages: read" on public.copilot_messages
  for select to authenticated using (true);

-- Só se grava em nome próprio: impede registrar mensagem como outra pessoa.
drop policy if exists "copilot_messages: insert own" on public.copilot_messages;
create policy "copilot_messages: insert own" on public.copilot_messages
  for insert to authenticated with check (author_id = auth.uid());

-- Sem update/delete: o histórico é um registro, não um rascunho.
