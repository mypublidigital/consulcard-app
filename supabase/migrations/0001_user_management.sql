-- ============================================================
-- Correção do módulo de Gestão de Usuários
-- Rodar no SQL Editor do Supabase Dashboard
-- ============================================================

-- 1. Adiciona coluna de e-mail em profiles (faltava — por isso o e-mail sumia)
alter table public.profiles add column if not exists email text;

-- 2. Atualiza o trigger para gravar o e-mail ao criar o usuário
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, initials, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    coalesce(new.raw_user_meta_data->>'initials', upper(left(new.email, 2))),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 3. Cria perfis que estejam faltando para usuários já existentes em auth.users
insert into public.profiles (id, name, initials, email)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'name', u.email),
  coalesce(u.raw_user_meta_data->>'initials', upper(left(u.email, 2))),
  u.email
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- 4. Preenche o e-mail de perfis que já existem mas estão sem ele
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id and p.email is null;

-- 5. Define o ADMIN principal — TROQUE o e-mail abaixo pelo seu e-mail de login
update public.profiles
set system_role = 'admin', role = coalesce(role, 'Admin')
where email = 'marck.mpc@gmail.com';
