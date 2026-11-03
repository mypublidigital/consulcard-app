-- ============================================================
-- Testes da Consulcard de 22/10, GAP #01: o número do sino não baixava
-- depois de abrir a notificação. Passa a contar só as não lidas.
--
-- A notificação é calculada na tela (pendência ou atividade vencida ou
-- vencendo); aqui fica só o registro de que a pessoa já a viu. A chave inclui
-- o prazo: se o prazo mudar, a notificação volta como não lida.
-- ============================================================

create table if not exists public.notification_reads (
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  notice_key  text        not null,
  read_at     timestamptz not null default now(),
  primary key (user_id, notice_key)
);

alter table public.notification_reads enable row level security;

-- Cada pessoa vê, marca e desmarca só as próprias leituras.
drop policy if exists "notification_reads: own" on public.notification_reads;
create policy "notification_reads: own" on public.notification_reads
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
