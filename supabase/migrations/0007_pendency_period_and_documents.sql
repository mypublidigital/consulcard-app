-- ============================================================
-- Reunião de 17/09 (10:07): a pendência só tinha data final, sem período.
-- E a aba Documentos nunca teve tabela: os cards viviam em memória e
-- desapareciam ao sair da tela.
-- ============================================================

-- ── 1. Período da pendência ─────────────────────────────────
-- Opcional: pendência sem data de início continua válida.
alter table public.pendencies add column if not exists start_date date;

-- ── 2. Documentos do projeto ────────────────────────────────
create table if not exists public.documents (
  id          uuid        primary key default gen_random_uuid(),
  project_id  text        not null references public.projects(id) on delete cascade,
  name        text        not null,
  type        text        not null default 'outro'
                check (type in ('ata','cronograma','report','entregavel','outro')),
  -- Link no SharePoint (a Consulcard não usa Google Drive).
  url         text        not null,
  doc_date    date        not null default current_date,
  created_by  uuid        references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_documents_project on public.documents(project_id, doc_date desc);

alter table public.documents enable row level security;

drop policy if exists "documents: read" on public.documents;
create policy "documents: read" on public.documents
  for select to authenticated using (true);

-- Qualquer pessoa da equipe vincula documento; excluir só quem vinculou,
-- além de diretoria.
drop policy if exists "documents: insert" on public.documents;
create policy "documents: insert" on public.documents
  for insert to authenticated with check (created_by = auth.uid());

drop policy if exists "documents: update own" on public.documents;
create policy "documents: update own" on public.documents
  for update to authenticated using (created_by = auth.uid() or public.is_admin_or_diretor());

drop policy if exists "documents: delete own" on public.documents;
create policy "documents: delete own" on public.documents
  for delete to authenticated using (created_by = auth.uid() or public.is_admin_or_diretor());
