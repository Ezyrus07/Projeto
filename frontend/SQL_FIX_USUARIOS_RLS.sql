-- DOKE / Supabase
-- FIX: políticas RLS da tabela public.usuarios
-- Objetivo:
-- 1) Evitar "policy already exists" (script idempotente)
-- 2) Garantir SELECT (senão o perfil não carrega)
-- 3) Manter INSERT/UPDATE apenas do próprio usuário

alter table if exists public.usuarios enable row level security;

-- Remove policies antigas (se existirem)
drop policy if exists "usuarios_upsert_own" on public.usuarios;
drop policy if exists "usuarios_update_own" on public.usuarios;
drop policy if exists "usuarios_select_own" on public.usuarios;
drop policy if exists "usuarios_select_authenticated" on public.usuarios;
drop policy if exists "usuarios_select_public" on public.usuarios;

-- SELECT
-- Recomendação segura (mínimo): usuário autenticado lê qualquer perfil
-- (se você quiser restringir para apenas o próprio perfil, troque 'using (true)'
-- por 'using (uid::text = auth.uid()::text)')
create policy "usuarios_select_authenticated"
  on public.usuarios
  for select
  to authenticated
  using (true);

-- Opcional: permitir leitura pública (SEM LOGIN) do perfil
-- ATENÇÃO: isso libera TODAS as colunas via REST. Se tiver coluna sensível,
-- crie uma VIEW com colunas públicas e exponha só a VIEW.
-- create policy "usuarios_select_public"
--   on public.usuarios
--   for select
--   to anon
--   using (true);

-- INSERT (upsert)
create policy "usuarios_upsert_own"
  on public.usuarios
  for insert
  to authenticated
  with check (uid::text = auth.uid()::text);

-- UPDATE
create policy "usuarios_update_own"
  on public.usuarios
  for update
  to authenticated
  using (uid::text = auth.uid()::text)
  with check (uid::text = auth.uid()::text);
