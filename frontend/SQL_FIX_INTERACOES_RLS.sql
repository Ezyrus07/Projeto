-- ============================================================
-- DOKE - FIX EMERGENCIAL RLS (INTERACOES) - HARD RESET
-- ============================================================
-- Use no Supabase SQL Editor quando:
-- - curtir/comentar falham com 42501 (RLS)
-- - chat/pedidos_mensagens falham com 401/42501
--
-- Escopo: desenvolvimento/homologacao.
-- Este script:
-- 1) remove TODAS as policies existentes nas tabelas-alvo
-- 2) garante grants de CRUD para anon/authenticated
-- 3) cria policies permissivas para anon/authenticated
--
-- AVISO: isso reduz bastante a seguranca. Use como hotfix.
-- ============================================================

do $$
declare
  t text;
  p record;
begin
  for t in
    select unnest(array[
      'usuarios',
      'anuncios',
      'publicacoes',
      'videos_curtos',
      'stories',
      'publicacoes_comentarios',
      'publicacoes_curtidas',
      'publicacoes_comentarios_curtidas',
      'videos_curtos_comentarios',
      'videos_curtos_curtidas',
      'videos_curtos_comentarios_curtidas',
      'pedidos_mensagens',
      'conversas_mensagens',
      'pedidos',
      'conversas',
      'notificacoes'
    ])
  loop
    if to_regclass('public.' || t) is null then
      raise notice 'Tabela public.% nao existe. Pulando.', t;
      continue;
    end if;

    execute format('alter table public.%I enable row level security', t);

    -- Remove qualquer policy antiga/restritiva que esteja conflitando.
    for p in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = t
    loop
      execute format('drop policy if exists %I on public.%I', p.policyname, t);
    end loop;

    -- Grants (sem isso, policy permissiva sozinha pode nao bastar).
    execute format('grant select, insert, update, delete on table public.%I to anon', t);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t);

    -- Policies permissivas para destravar imediatamente.
    execute format('create policy %I on public.%I for select to anon using (true)', 'doke_fix_open_anon_select_' || t, t);
    execute format('create policy %I on public.%I for insert to anon with check (true)', 'doke_fix_open_anon_insert_' || t, t);
    execute format('create policy %I on public.%I for update to anon using (true) with check (true)', 'doke_fix_open_anon_update_' || t, t);
    execute format('create policy %I on public.%I for delete to anon using (true)', 'doke_fix_open_anon_delete_' || t, t);

    execute format('create policy %I on public.%I for select to authenticated using (true)', 'doke_fix_open_auth_select_' || t, t);
    execute format('create policy %I on public.%I for insert to authenticated with check (true)', 'doke_fix_open_auth_insert_' || t, t);
    execute format('create policy %I on public.%I for update to authenticated using (true) with check (true)', 'doke_fix_open_auth_update_' || t, t);
    execute format('create policy %I on public.%I for delete to authenticated using (true)', 'doke_fix_open_auth_delete_' || t, t);
  end loop;
end $$;

-- Opcional extremo (somente dev): desabilitar RLS totalmente nas tabelas-alvo.
-- Descomente se ainda persistir 42501 apos script acima.
-- do $$
-- declare t text;
-- begin
--   for t in
--     select unnest(array[
--       'usuarios',
--       'anuncios',
--       'publicacoes',
--       'videos_curtos',
--       'stories',
--       'publicacoes_comentarios',
--       'publicacoes_curtidas',
--       'publicacoes_comentarios_curtidas',
--       'videos_curtos_comentarios',
--       'videos_curtos_curtidas',
--       'videos_curtos_comentarios_curtidas',
--       'pedidos_mensagens',
--       'conversas_mensagens',
--       'pedidos',
--       'conversas',
--       'notificacoes'
--     ])
--   loop
--     if to_regclass('public.' || t) is not null then
--       execute format('alter table public.%I disable row level security', t);
--     end if;
--   end loop;
-- end $$;

-- Apos executar:
-- 1) logout
-- 2) limpar localStorage/sessionStorage do site
-- 3) login novamente
