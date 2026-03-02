-- ============================================================
-- DOKE - FIX DEV (TEMPORARIO)
-- Resolve erro ao:
-- - publicar
-- - trocar foto de perfil
-- - trocar capa
-- quando o frontend entra em ciclo de sessao/RLS.
--
-- ATENCAO:
-- - Este arquivo e para DESENVOLVIMENTO.
-- - Em producao, NAO use politicas abertas.
-- ============================================================

-- ---------- STORAGE: bucket perfil ----------
insert into storage.buckets (id, name, public)
values ('perfil', 'perfil', true)
on conflict (id) do update set public = true;

do $$
begin
  -- Leitura publica do bucket
  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects' and policyname='DEV perfil select open'
  ) then
    create policy "DEV perfil select open"
      on storage.objects
      for select
      to anon, authenticated
      using (bucket_id = 'perfil');
  end if;

  -- Escrita aberta no bucket perfil (DEV)
  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects' and policyname='DEV perfil insert open'
  ) then
    create policy "DEV perfil insert open"
      on storage.objects
      for insert
      to anon, authenticated
      with check (bucket_id = 'perfil');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects' and policyname='DEV perfil update open'
  ) then
    create policy "DEV perfil update open"
      on storage.objects
      for update
      to anon, authenticated
      using (bucket_id = 'perfil')
      with check (bucket_id = 'perfil');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects' and policyname='DEV perfil delete open'
  ) then
    create policy "DEV perfil delete open"
      on storage.objects
      for delete
      to anon, authenticated
      using (bucket_id = 'perfil');
  end if;
end $$;

-- ---------- TABELAS DE PERFIL/POST ----------
-- Libera write no DEV para destravar perfil/publicacao
do $$
begin
  if to_regclass('public.usuarios') is not null then
    alter table public.usuarios enable row level security;
    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='usuarios' and policyname='DEV usuarios write open'
    ) then
      create policy "DEV usuarios write open"
        on public.usuarios
        for all
        to anon, authenticated
        using (true)
        with check (true);
    end if;
  end if;

  if to_regclass('public.publicacoes') is not null then
    alter table public.publicacoes enable row level security;
    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='publicacoes' and policyname='DEV publicacoes write open'
    ) then
      create policy "DEV publicacoes write open"
        on public.publicacoes
        for all
        to anon, authenticated
        using (true)
        with check (true);
    end if;
  end if;

  if to_regclass('public.videos_curtos') is not null then
    alter table public.videos_curtos enable row level security;
    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='videos_curtos' and policyname='DEV videos_curtos write open'
    ) then
      create policy "DEV videos_curtos write open"
        on public.videos_curtos
        for all
        to anon, authenticated
        using (true)
        with check (true);
    end if;
  end if;

  if to_regclass('public.portfolio') is not null then
    alter table public.portfolio enable row level security;
    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='portfolio' and policyname='DEV portfolio write open'
    ) then
      create policy "DEV portfolio write open"
        on public.portfolio
        for all
        to anon, authenticated
        using (true)
        with check (true);
    end if;
  end if;
end $$;

-- ---------- CHECK RAPIDO ----------
-- Confere politicas do bucket perfil
select policyname, permissive, cmd, roles
from pg_policies
where schemaname='storage' and tablename='objects' and policyname like 'DEV perfil%';

