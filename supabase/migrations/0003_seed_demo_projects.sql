-- ============================================================
-- Seed dos projetos demo no banco
-- - Usa o primeiro admin/diretor encontrado como manager_id padrão
-- - Idempotente: não duplica se rodar de novo (ON CONFLICT DO NOTHING)
-- ============================================================

do $$
declare
  v_manager uuid;
begin
  select id into v_manager
  from public.profiles
  where system_role in ('admin','diretor') and active is not false
  order by created_at
  limit 1;

  if v_manager is null then
    raise notice 'Nenhum admin/diretor encontrado — seed abortado';
    return;
  end if;

  insert into public.projects (
    id, name, client, client_initials, macro_category, project_type, size, complexity,
    status, start_date, target_end_date, manager_id,
    progress, activities_total, activities_done, activities_delayed, last_update, tags
  ) values
    ('proj-001', 'Migração Orbital → Dock', 'Fintech Consignado S.A.', 'FC',
     'meios-pagamento', 'migracao-processadora', 'P4', 4,
     'in_progress', '2026-03-10', '2026-09-30', v_manager,
     35, 9, 3, 1, '2026-04-28',
     array['migração','Dock','consignado']),
    ('proj-002', 'Setup Contábil Cooperativa Crédito', 'Cooperativa de Crédito Meridional', 'CM',
     'contabil-regulatorio', 'setup-contabil', 'P3', 4,
     'in_progress', '2026-04-01', '2026-08-15', v_manager,
     15, 7, 1, 0, '2026-04-25',
     array['COSIF','cooperativa','BACEN']),
    ('proj-003', 'KYC/Onboarding Digital', 'Banco Regional Caipora', 'BR',
     'banking-conta-digital', 'kyc-onboarding', 'P2', 3,
     'planning', '2026-05-05', '2026-07-30', v_manager,
     0, 4, 0, 0, '2026-04-30',
     array['KYC','LGPD','onboarding'])
  on conflict (id) do nothing;
end $$;
