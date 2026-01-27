-- DOKE Comunidades/Grupo - Features long-term (tabelas separadas)
-- Ajustado para coluna case-sensitive: "comunidadeId"

-- 1) Colunas extras na tabela de posts (se não existirem)
alter table public.comunidade_posts
  add column if not exists "autorUser" text,
  add column if not exists "autorFoto" text,
  add column if not exists reply_to_id uuid,
  add column if not exists reply_preview text,
  add column if not exists reply_user text,
  add column if not exists fixado boolean default false;

create index if not exists idx_comunidade_posts_comunidadeid_created
  on public.comunidade_posts ("comunidadeId", created_at);

-- 2) Reações por post (tabela separada)
create table if not exists public.comunidade_post_reacoes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.comunidade_posts(id) on delete cascade,
  "comunidadeId" uuid not null,
  user_id text not null,
  emoji text not null default '👍',
  created_at timestamptz not null default now()
);

create index if not exists idx_reacoes_post on public.comunidade_post_reacoes (post_id, created_at desc);
create index if not exists idx_reacoes_comunidade on public.comunidade_post_reacoes ("comunidadeId", created_at desc);

-- 3) Não lidas (last_read por usuário)
create table if not exists public.comunidade_post_reads (
  "comunidadeId" uuid not null,
  user_id text not null,
  last_read_at timestamptz not null default now(),
  primary key ("comunidadeId", user_id)
);

-- 4) Pins (fixar mensagem)
create table if not exists public.comunidade_post_pins (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.comunidade_posts(id) on delete cascade,
  "comunidadeId" uuid not null,
  pinned_by text not null,
  pinned_at timestamptz not null default now()
);

create index if not exists idx_pins_comunidade on public.comunidade_post_pins ("comunidadeId", pinned_at desc);

-- 5) Mutes (silenciar usuário)
create table if not exists public.comunidade_mutes (
  id uuid primary key default gen_random_uuid(),
  "comunidadeId" uuid not null,
  user_id text not null,
  muted_until timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_mutes_comunidade_user on public.comunidade_mutes ("comunidadeId", user_id);

-- 6) (Opcional) RLS - deixe comentado se você ainda não usa policies
-- alter table public.comunidade_post_reacoes enable row level security;
-- alter table public.comunidade_post_reads enable row level security;
-- alter table public.comunidade_post_pins enable row level security;
-- alter table public.comunidade_mutes enable row level security;

-- Exemplo de policy simples (ajuste para seu modelo de membros):
-- create policy "read_reacoes" on public.comunidade_post_reacoes
-- for select using (true);
-- create policy "write_reacoes" on public.comunidade_post_reacoes
-- for insert with check (true);
