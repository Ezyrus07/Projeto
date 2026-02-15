-- ==============================================================
-- DOKE — Tabelas faltantes que estão causando 'Failed to fetch' / 404
-- Rode no Supabase SQL Editor.
--
-- Este arquivo cria o mínimo para o site parar de quebrar:
--  - public.comunidades (lista/entrar em grupos)
--  - public.comunidade_posts (posts do grupo)
--  - public.anuncios + public.servicos (cards do index/detalhes)
--
-- Observação:
-- * Usei ID como TEXT para compatibilidade com links/IDs antigos do Firebase.
-- * Não habilitei RLS aqui (ambiente dev). Se você quiser RLS, eu te passo
--   as policies corretas depois.
-- ==============================================================

create extension if not exists pgcrypto;

-- ------------------------------
-- COMUNIDADES (base)
-- ------------------------------
create table if not exists public.comunidades (
  id text primary key default gen_random_uuid()::text,
  nome text not null default 'Comunidade',
  descricao text default '',
  tipo text default 'Grupo',
  privado boolean not null default false,
  owner_uid text,
  capa_url text,
  thumb_url text,
  membros text[] not null default '{}',
  membros_total int not null default 0,
  dataCriacao timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Posts do grupo (caso não exista)
create table if not exists public.comunidade_posts (
  id uuid primary key default gen_random_uuid(),
  comunidade_id text not null,
  autor_uid text,
  autor_nome text,
  autor_user text,
  autor_foto text,
  texto text,
  midia_url text,
  midia_tipo text,
  created_at timestamptz not null default now()
);

create index if not exists idx_comunidades_dataCriacao on public.comunidades (dataCriacao desc);
create index if not exists idx_comunidade_posts_comunidade_id on public.comunidade_posts (comunidade_id);

-- ------------------------------
-- ANUNCIOS / SERVICOS
-- ------------------------------
create table if not exists public.anuncios (
  id text primary key default gen_random_uuid()::text,
  uid text,                 -- compat (firebase uid)
  user_id uuid,             -- opcional (supabase auth uid)
  titulo text,
  descricao text,
  categoria text,
  preco numeric,
  tipo_preco text,
  cidade text,
  uf text,
  bairro text,
  cep text,
  whatsapp text,
  img text,                 -- capa principal
  fotos text[] default '{}',
  dados jsonb default '{}'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- servicos: alguns trechos do front fazem fallback para esta tabela
create table if not exists public.servicos (
  like public.anuncios including all
);

-- ------------------------------
-- GRANTS (dev)
-- ------------------------------
-- (Supabase costuma setar grants padrão, mas em alguns projetos não.)
-- Para evitar 401/erro de permissão no front, liberamos SELECT no anon.

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on public.comunidades to anon, authenticated;
grant select, insert, update, delete on public.comunidade_posts to anon, authenticated;
grant select, insert, update, delete on public.anuncios to anon, authenticated;
grant select, insert, update, delete on public.servicos to anon, authenticated;

