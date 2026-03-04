-- grupo-fix-20260304.sql
-- Execute no SQL Editor do Supabase

create extension if not exists pgcrypto;

-- 1) Campos faltantes em comunidade_posts (reply + mídia + autor nome)
alter table if exists public.comunidade_posts
  add column if not exists reply_to_id text,
  add column if not exists reply_to_user text,
  add column if not exists reply_preview text,
  add column if not exists midia_url text,
  add column if not exists tipo text default 'texto',
  add column if not exists autor_nome text;

-- 2) Presença de membros (online/offline)
alter table if exists public.comunidade_membros
  add column if not exists online boolean default false,
  add column if not exists last_seen timestamptz;

-- 3) Tabela de reações (se não existir)
create table if not exists public.comunidade_post_reacoes (
  id uuid primary key default gen_random_uuid(),
  post_id text not null,
  user_uid text not null,
  emoji text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists uq_comunidade_post_reacoes_unique
  on public.comunidade_post_reacoes (post_id, user_uid, emoji);

create index if not exists idx_comunidade_post_reacoes_post
  on public.comunidade_post_reacoes (post_id);

-- 4) Índices úteis de performance
create index if not exists idx_comunidade_posts_comunidade_created
  on public.comunidade_posts (comunidade_id, created_at);

create index if not exists idx_comunidade_membros_comunidade_user
  on public.comunidade_membros (comunidade_id, user_uid);

-- 5) RLS mínimo (ajuste conforme seu projeto)
alter table if exists public.comunidade_post_reacoes enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='comunidade_post_reacoes' and policyname='reacoes_select'
  ) then
    create policy reacoes_select on public.comunidade_post_reacoes
      for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='comunidade_post_reacoes' and policyname='reacoes_insert'
  ) then
    create policy reacoes_insert on public.comunidade_post_reacoes
      for insert with check (auth.uid()::text = user_uid);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='comunidade_post_reacoes' and policyname='reacoes_delete'
  ) then
    create policy reacoes_delete on public.comunidade_post_reacoes
      for delete using (auth.uid()::text = user_uid);
  end if;
end $$;
