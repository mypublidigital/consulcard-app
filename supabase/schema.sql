-- ============================================================
-- Consulcard — Schema completo
-- Rodar no SQL Editor do Supabase Dashboard
-- ============================================================

-- ── 1. PROFILES (estende auth.users) ───────────────────────
create table if not exists public.profiles (
  id          uuid references auth.users on delete cascade primary key,
  name        text        not null,
  initials    text        not null,
  role        text,
  system_role text        check (system_role in ('admin','diretor','gerente','consultor')),
  whatsapp    text,
  linkedin    text,
  active        boolean     not null default true,
  temp_password text,                          -- temporary password shown to admin only
  created_at    date        not null default current_date
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, initials)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    coalesce(new.raw_user_meta_data->>'initials', upper(left(new.email, 2)))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── 2. PROJECTS ─────────────────────────────────────────────
create table if not exists public.projects (
  id                  text primary key,
  name                text        not null,
  client              text        not null,
  client_initials     text        not null,
  macro_category      text        not null,
  project_type        text        not null,
  size                text        not null check (size in ('P1','P2','P3','P4','P5')),
  complexity          int         not null check (complexity between 1 and 5),
  status              text        not null default 'planning'
                        check (status in ('planning','in_progress','review','closed')),
  start_date          date        not null,
  target_end_date     date        not null,
  manager_id          uuid        references public.profiles(id),
  progress            int         not null default 0 check (progress between 0 and 100),
  activities_total    int         not null default 0,
  activities_done     int         not null default 0,
  activities_delayed  int         not null default 0,
  last_update         date        not null default current_date,
  tags                text[]      not null default '{}',
  created_at          timestamptz not null default now()
);

-- Project ↔ Consultants (N:N)
create table if not exists public.project_consultants (
  project_id  text references public.projects(id) on delete cascade,
  profile_id  uuid references public.profiles(id) on delete cascade,
  primary key (project_id, profile_id)
);

-- ── 3. ACTIVITIES ────────────────────────────────────────────
create table if not exists public.activities (
  id            text primary key,
  project_id    text        not null references public.projects(id) on delete cascade,
  label         text        not null,
  description   text        not null default '',
  complexity    int         not null check (complexity between 1 and 5),
  llm_impact    text        not null check (llm_impact in ('high','medium','low')),
  llm_index_min int         not null default 0,
  llm_index_max int         not null default 100,
  phase         text        not null
                  check (phase in ('planejamento','diagnostico','execucao','validacao','entrega')),
  status        text        not null default 'todo'
                  check (status in ('todo','in_progress','review','done')),
  assignee_id   uuid        references public.profiles(id),
  due_date      date,
  pending_count int         not null default 0,
  created_at    timestamptz not null default now()
);

-- ── 4. PENDENCIES ────────────────────────────────────────────
create table if not exists public.pendencies (
  id             text primary key,
  project_id     text        not null references public.projects(id) on delete cascade,
  description    text        not null,
  owner_id       uuid        references public.profiles(id),
  owner_name     text        not null,
  owner_initials text        not null,
  owner_type     text        not null check (owner_type in ('consultant','client')),
  due_date       date        not null,
  origin         text        not null check (origin in ('reuniao','manual','agente')),
  status         text        not null default 'open' check (status in ('open','resolved')),
  created_at     timestamptz not null default now()
);

-- ── 5. PROMPTS ───────────────────────────────────────────────
create table if not exists public.prompts (
  id              text primary key,
  title           text not null,
  macro_category  text not null,
  project_type_id text not null,
  activity_label  text not null,
  kind            text not null check (kind in ('specialist','generalist')),
  phase           text not null
                    check (phase in ('planejamento','diagnostico','execucao','validacao','entrega')),
  body            text not null,
  created_at      timestamptz not null default now()
);

-- ── 6. ROW LEVEL SECURITY ────────────────────────────────────
alter table public.profiles          enable row level security;
alter table public.projects          enable row level security;
alter table public.project_consultants enable row level security;
alter table public.activities        enable row level security;
alter table public.pendencies        enable row level security;
alter table public.prompts           enable row level security;

-- Profiles: authenticated users can read all; update only own
create policy "profiles: read all" on public.profiles
  for select to authenticated using (true);

create policy "profiles: update own" on public.profiles
  for update to authenticated using (auth.uid() = id);

-- Admins/diretores can insert/update/delete any profile
create policy "profiles: admin full" on public.profiles
  for all to authenticated
  using (
    (select system_role from public.profiles where id = auth.uid())
    in ('admin','diretor')
  );

-- Projects: all authenticated can read
create policy "projects: read" on public.projects
  for select to authenticated using (true);

-- Managers can update own projects; admins/diretores update all
create policy "projects: update" on public.projects
  for update to authenticated
  using (
    manager_id = auth.uid()
    or (select system_role from public.profiles where id = auth.uid()) in ('admin','diretor')
  );

create policy "projects: insert" on public.projects
  for insert to authenticated with check (true);

-- Activities, pendencies: authenticated read all
create policy "activities: read" on public.activities
  for select to authenticated using (true);

create policy "activities: write" on public.activities
  for all to authenticated using (true);

create policy "pendencies: read" on public.pendencies
  for select to authenticated using (true);

create policy "pendencies: write" on public.pendencies
  for all to authenticated using (true);

create policy "project_consultants: read" on public.project_consultants
  for select to authenticated using (true);

create policy "project_consultants: write" on public.project_consultants
  for all to authenticated using (true);

-- Prompts: all authenticated can read; admins manage
create policy "prompts: read" on public.prompts
  for select to authenticated using (true);

create policy "prompts: admin write" on public.prompts
  for all to authenticated
  using (
    (select system_role from public.profiles where id = auth.uid())
    in ('admin','diretor')
  );

-- ── 7. INDEXES ───────────────────────────────────────────────
create index if not exists idx_activities_project on public.activities(project_id);
create index if not exists idx_pendencies_project on public.pendencies(project_id);
create index if not exists idx_projects_manager   on public.projects(manager_id);
create index if not exists idx_proj_consultants   on public.project_consultants(profile_id);
