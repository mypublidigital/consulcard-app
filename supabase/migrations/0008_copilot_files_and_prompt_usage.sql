-- ============================================================
-- Testes da Consulcard de 06/10:
--
-- GAP #9 / backlog 5: o arquivo anexado no co-piloto só ia ao modelo na
-- pergunta em que foi anexado e não aparecia na aba Documentos. Depois de
-- algumas perguntas o modelo "esquecia" a transcrição. Os anexos passam a ser
-- guardados no projeto (Storage) e registrados em documents.
--
-- Backlog 10/16: o prompt da Biblioteca usado no projeto não aparecia em
-- lugar nenhum. copilot_messages passa a registrar qual ficha foi usada —
-- também alimenta o uso real de prompts no Painel Executivo.
-- ============================================================

-- ── 1. Bucket privado dos arquivos de projeto ───────────────
-- Caminho: <project_id>/<user_id>/<uuid>-<nome>. A segunda pasta identifica
-- quem enviou, sem depender das colunas owner/owner_id do Storage.
insert into storage.buckets (id, name, public, file_size_limit)
values ('project-files', 'project-files', false, 52428800)  -- 50 MB
on conflict (id) do nothing;

drop policy if exists "project-files: read" on storage.objects;
create policy "project-files: read" on storage.objects
  for select to authenticated
  using (bucket_id = 'project-files');

-- Só se envia arquivo na própria pasta.
drop policy if exists "project-files: insert own" on storage.objects;
create policy "project-files: insert own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'project-files' and (storage.foldername(name))[2] = auth.uid()::text);

-- Remover: quem enviou, diretoria ou admin (mesma regra de documents).
drop policy if exists "project-files: delete own" on storage.objects;
create policy "project-files: delete own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'project-files'
    and ((storage.foldername(name))[2] = auth.uid()::text or public.is_admin_or_diretor())
  );

-- ── 2. Documento pode ser link do SharePoint OU arquivo enviado ──
alter table public.documents alter column url drop not null;
alter table public.documents add column if not exists storage_path text;
alter table public.documents add column if not exists mime_type    text;
alter table public.documents add column if not exists size_bytes   bigint;
alter table public.documents add column if not exists source       text not null default 'link';

alter table public.documents drop constraint if exists documents_source_check;
alter table public.documents add constraint documents_source_check
  check (source in ('link', 'upload', 'copiloto'));

alter table public.documents drop constraint if exists documents_url_or_file;
alter table public.documents add constraint documents_url_or_file
  check (url is not null or storage_path is not null);

-- ── 3. Histórico do co-piloto: anexos e ficha usada ──────────
-- attachments: [{ documentId, name, kind, storagePath, mimeType }]
alter table public.copilot_messages add column if not exists attachments jsonb;
alter table public.copilot_messages add column if not exists prompt_id   text;

create index if not exists idx_copilot_messages_created on public.copilot_messages(created_at);
