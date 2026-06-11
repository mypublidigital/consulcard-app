-- ============================================================
-- Consulcard — Seed de usuários iniciais
-- Rode no SQL Editor do Supabase Dashboard APÓS schema.sql
--
-- Substitua os e-mails abaixo pelos que você usou ao criar
-- os usuários em Authentication → Users
-- ============================================================

DO $$
DECLARE
  id_joao      uuid;
  id_marcelo   uuid;
BEGIN

  -- Busca os IDs pelo e-mail cadastrado no Auth
  SELECT id INTO id_joao    FROM auth.users WHERE email = 'joao.sales@consulcard.com.br';
  SELECT id INTO id_marcelo FROM auth.users WHERE email = 'marcelo@leadrix.com.br';

  -- ── João Sales ───────────────────────────────────────────
  IF id_joao IS NOT NULL THEN
    UPDATE public.profiles SET
      name        = 'João Sales',
      initials    = 'JS',
      role        = 'Diretor',
      system_role = 'admin',
      whatsapp    = NULL,
      linkedin    = NULL,
      active      = true
    WHERE id = id_joao;
  ELSE
    RAISE NOTICE 'Usuário João Sales não encontrado. Verifique o e-mail.';
  END IF;

  -- ── Marcelo Carvalho ─────────────────────────────────────
  IF id_marcelo IS NOT NULL THEN
    UPDATE public.profiles SET
      name        = 'Marcelo Carvalho',
      initials    = 'MC',
      role        = 'Admin',
      system_role = 'admin',
      whatsapp    = NULL,
      linkedin    = NULL,
      active      = true
    WHERE id = id_marcelo;
  ELSE
    RAISE NOTICE 'Usuário Marcelo Carvalho não encontrado. Verifique o e-mail.';
  END IF;

END $$;

-- ── Verificação: mostra os perfis atualizados ─────────────
SELECT id, name, initials, role, system_role, active
FROM public.profiles
ORDER BY created_at;
