-- ==========================================
-- DOKE - Comunidades (Supabase)
-- Execute no SQL Editor do Supabase
-- Objetivo:
-- 1) Corrigir o erro de tabela inexistente (cargos/membros)
-- 2) Dar suporte a: cargos, online/offline e posts no grupo
-- ==========================================

-- EXTENSION (necessária para gen_random_uuid em alguns projetos)
create extension if not exists pgcrypto;

-- -------------------------------
-- 1) CARGOS (roles) por comunidade
-- -------------------------------
create table if not exists public.comunidade_cargos (
  id uuid primary key default gen_random_uuid(),
  comunidade_id text not null,
  nome text not null,
  cor text default '#2a5f90',
  nivel int default 10,
  criado_por text,
  criado_em timestamptz not null default now()
);

create index if not exists idx_comunidade_cargos_comunidade_id
  on public.comunidade_cargos (comunidade_id);

-- -------------------------------
-- 2) MEMBROS (online/offline + role_id)
-- -------------------------------
create table if not exists public.comunidade_membros (
  id uuid primary key default gen_random_uuid(),
  comunidade_id text not null,
  user_uid text not null,
  role_id uuid null,
  status text not null default 'offline',
  last_seen timestamptz,
  joined_at timestamptz not null default now(),
  unique (comunidade_id, user_uid)
);

create index if not exists idx_comunidade_membros_comunidade_id
  on public.comunidade_membros (comunidade_id);

create index if not exists idx_comunidade_membros_user_uid
  on public.comunidade_membros (user_uid);

-- (Opcional) FK role_id -> comunidade_cargos.id
do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_name = 'fk_comunidade_membros_role'
      and table_name = 'comunidade_membros'
  ) then
    alter table public.comunidade_membros
      add constraint fk_comunidade_membros_role
      foreign key (role_id) references public.comunidade_cargos(id)
      on delete set null;
  end if;
end $$;

-- -------------------------------
-- 3) POSTS (garantir colunas comuns)
--    Obs: a sua tabela 'comunidade_posts' já existe.
--    Estes ALTERs só adicionam se estiver faltando.
-- -------------------------------
alter table public.comunidade_posts add column if not exists comunidade_id text;
alter table public.comunidade_posts add column if not exists autor_uid text;
alter table public.comunidade_posts add column if not exists autor_nome text;
alter table public.comunidade_posts add column if not exists autor_user text;
alter table public.comunidade_posts add column if not exists autor_foto text;
alter table public.comunidade_posts add column if not exists texto text;
alter table public.comunidade_posts add column if not exists midia_url text;
alter table public.comunidade_posts add column if not exists midia_tipo text;
alter table public.comunidade_posts add column if not exists created_at timestamptz default now();

create index if not exists idx_comunidade_posts_comunidade_id
  on public.comunidade_posts (comunidade_id);

-- -------------------------------
-- 4) RLS (exemplo simples)
--    Se você já tem RLS custom, ignore esta parte.
-- -------------------------------
-- alter table public.comunidade_cargos enable row level security;
-- alter table public.comunidade_membros enable row level security;
-- alter table public.comunidade_posts enable row level security;

-- Políticas mínimas (ajuste conforme sua auth):
-- * SELECT liberado para todos logados
-- * INSERT/UPDATE/DELETE liberado apenas para logados (você pode restringir ao dono)
-- create policy "select_cargos" on public.comunidade_cargos for select to authenticated using (true);
-- create policy "write_cargos" on public.comunidade_cargos for all to authenticated using (true) with check (true);

-- create policy "select_membros" on public.comunidade_membros for select to authenticated using (true);
-- create policy "write_membros" on public.comunidade_membros for all to authenticated using (true) with check (true);

-- create policy "select_posts" on public.comunidade_posts for select to authenticated using (true);
-- create policy "write_posts" on public.comunidade_posts for all to authenticated using (true) with check (true);
