-- Doke | Negócios (iFood-like) - Tabelas + RLS
-- Rode este SQL no Supabase (SQL Editor) no seu projeto.

-- Requerido para gen_random_uuid()
create extension if not exists pgcrypto;

-- ===============
-- TABELA: negocios
-- ===============
create table if not exists public.negocios (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  owner_uid uuid not null references auth.users(id) on delete cascade,

  nome text not null,
  descricao text,
  categoria text,
  tags text[] default '{}',

  telefone text,
  whatsapp text,
  website text,
  instagram text,

  imagem_capa text,
  imagens text[] default '{}',

  cep text,
  cidade text,
  bairro text,
  uf text,
  endereco text,
  numero text,
  complemento text,

  -- Opcional: se quiser mapa com marcadores reais (pode preencher depois)
  latitude double precision,
  longitude double precision,

  horario jsonb,
  faixa_preco text,
  aceita_pix boolean default false,
  aceita_cartao boolean default false,
  delivery boolean default false,

  is_active boolean not null default true
);

create index if not exists idx_negocios_owner on public.negocios(owner_uid);
create index if not exists idx_negocios_cidade on public.negocios(cidade);
create index if not exists idx_negocios_bairro on public.negocios(bairro);
create index if not exists idx_negocios_categoria on public.negocios(categoria);

-- =====================
-- TABELA: negocios_promocoes
-- =====================
create table if not exists public.negocios_promocoes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  owner_uid uuid not null references auth.users(id) on delete cascade,

  titulo text not null,
  descricao text,
  desconto_percent integer,
  cupom text,
  valida_ate date,
  ativo boolean not null default true
);

create index if not exists idx_promos_negocio on public.negocios_promocoes(negocio_id);
create index if not exists idx_promos_owner on public.negocios_promocoes(owner_uid);

-- =====================
-- RLS
-- =====================
alter table public.negocios enable row level security;
alter table public.negocios_promocoes enable row level security;

-- NEGOCIOS: leitura pública apenas dos ativos
drop policy if exists "negocios_select_public" on public.negocios;
create policy "negocios_select_public"
on public.negocios
for select
using (is_active = true);

-- NEGOCIOS: dono pode inserir
drop policy if exists "negocios_insert_owner" on public.negocios;
create policy "negocios_insert_owner"
on public.negocios
for insert
with check (auth.uid() = owner_uid);

-- NEGOCIOS: dono pode atualizar
drop policy if exists "negocios_update_owner" on public.negocios;
create policy "negocios_update_owner"
on public.negocios
for update
using (auth.uid() = owner_uid)
with check (auth.uid() = owner_uid);

-- NEGOCIOS: dono pode deletar
drop policy if exists "negocios_delete_owner" on public.negocios;
create policy "negocios_delete_owner"
on public.negocios
for delete
using (auth.uid() = owner_uid);

-- PROMOCOES: leitura pública apenas ativas
drop policy if exists "promos_select_public" on public.negocios_promocoes;
create policy "promos_select_public"
on public.negocios_promocoes
for select
using (ativo = true);

-- PROMOCOES: dono pode inserir
drop policy if exists "promos_insert_owner" on public.negocios_promocoes;
create policy "promos_insert_owner"
on public.negocios_promocoes
for insert
with check (auth.uid() = owner_uid);

-- PROMOCOES: dono pode atualizar
drop policy if exists "promos_update_owner" on public.negocios_promocoes;
create policy "promos_update_owner"
on public.negocios_promocoes
for update
using (auth.uid() = owner_uid)
with check (auth.uid() = owner_uid);

-- PROMOCOES: dono pode deletar
drop policy if exists "promos_delete_owner" on public.negocios_promocoes;
create policy "promos_delete_owner"
on public.negocios_promocoes
for delete
using (auth.uid() = owner_uid);

-- DICA: se o seu front faz join de negocios_promocoes -> negocios,
-- garanta que a policy de select de negocios permita ver os ativos.
