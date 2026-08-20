-- ============================================================
-- Hierarquia de visibilidade de senhas + trava de escalonamento
--
-- Regra pedida:
--   • Admin   → vê a senha de todos, EXCETO de outros admins
--   • Diretor → vê a senha de todos, EXCETO de outros diretores e de admins
--   • Gerente/Consultor → não acessam o módulo (nem veem senha alguma)
--   • Todos podem ver a própria senha
--
-- Problema que isso corrige: a policy "profiles: read all" deixava QUALQUER
-- usuário autenticado ler a coluna temp_password de toda a equipe via API,
-- mesmo sem acesso à tela de Usuários.
-- ============================================================

-- ── 1. Rank de papéis ───────────────────────────────────────
create or replace function public.role_rank(r text)
returns int
language sql
immutable
as $$
  select case r
    when 'admin'     then 3
    when 'diretor'   then 2
    when 'gerente'   then 1
    when 'consultor' then 0
    else -1
  end;
$$;

-- ── 2. RPC que devolve as senhas que o chamador PODE ver ────
-- Retorna uma linha por perfil. temp_password vem NULL quando não permitido,
-- e can_view diz à UI se deve mostrar "sem permissão" ou "sem senha definida".
create or replace function public.list_user_passwords()
returns table (user_id uuid, temp_password text, can_view boolean)
language sql
security definer
stable
set search_path = public
as $$
  with me as (
    select public.role_rank(system_role) as rank
    from public.profiles
    where id = auth.uid()
  )
  select
    p.id,
    case when v.allowed then p.temp_password else null end,
    v.allowed
  from public.profiles p
  cross join me
  cross join lateral (
    select (
      p.id = auth.uid()
      or (me.rank >= 2 and me.rank > public.role_rank(p.system_role))
    ) as allowed
  ) v;
$$;

revoke all on function public.list_user_passwords() from public;
grant execute on function public.list_user_passwords() to authenticated;

-- ── 3. Tira temp_password do alcance do cliente ─────────────
-- REVOKE de coluna não subtrai de um GRANT de tabela inteira: é preciso
-- revogar o SELECT da tabela e regrantar coluna a coluna.
revoke select on public.profiles from authenticated;
revoke select on public.profiles from anon;

grant select (
  id, name, initials, role, system_role,
  email, whatsapp, linkedin, active, created_at
) on public.profiles to authenticated;

-- ── 4. Trava escalonamento de privilégio via "profiles: update own" ──
-- A policy permite o usuário editar a PRÓPRIA linha; sem restrição de coluna
-- um consultor poderia rodar `update profiles set system_role='admin'`.
-- Alterações de papel/senha/status passam a existir só via Edge Function
-- admin-users (service_role), que ignora estes grants.
revoke update on public.profiles from authenticated;

grant update (name, initials, whatsapp, linkedin) on public.profiles to authenticated;

-- Mesmo raciocínio no INSERT: sem isto, um diretor poderia inserir um perfil
-- já com system_role='admin' para um auth.user órfão (sem profile), driblando
-- a hierarquia da Edge Function. Criação real passa pelo service_role.
revoke insert on public.profiles from authenticated;

grant insert (id, name, initials, role, email, whatsapp, linkedin)
  on public.profiles to authenticated;
