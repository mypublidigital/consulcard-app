-- ============================================================
-- Corrige recursão infinita no RLS da tabela profiles
-- ERRO original: 42P17 infinite recursion detected in policy for relation "profiles"
-- Causa: políticas consultavam `select system_role from profiles` dentro da
-- própria regra da tabela profiles. Solução: função SECURITY DEFINER.
-- ============================================================

create or replace function public.is_admin_or_diretor()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and system_role in ('admin','diretor')
  );
$$;

-- profiles
drop policy if exists "profiles: admin full" on public.profiles;
create policy "profiles: admin manage" on public.profiles
  for all to authenticated
  using (public.is_admin_or_diretor())
  with check (public.is_admin_or_diretor());

-- projects
drop policy if exists "projects: update" on public.projects;
create policy "projects: update" on public.projects
  for update to authenticated
  using (manager_id = auth.uid() or public.is_admin_or_diretor());

-- prompts
drop policy if exists "prompts: admin write" on public.prompts;
create policy "prompts: admin write" on public.prompts
  for all to authenticated
  using (public.is_admin_or_diretor());
