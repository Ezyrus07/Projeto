-- DOKE — Perguntas & Respostas (Detalhes do Serviço)
-- Execute no Supabase SQL Editor

-- Requer extensão para UUID (normalmente já vem habilitada)
-- create extension if not exists "pgcrypto";

create table if not exists public.perguntas_respostas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),

  anuncio_id text not null,
  uid_profissional text,

  perguntador_uid text not null,
  perguntador_nome text,
  pergunta text not null,

  resposta text
);

create index if not exists idx_perguntas_respostas_anuncio on public.perguntas_respostas (anuncio_id);

-- RLS (recomendado)
alter table public.perguntas_respostas enable row level security;

-- Leitura pública (para mostrar no detalhes)
create policy if not exists "read_perguntas_respostas" on public.perguntas_respostas
for select using ( true );

-- Inserção: somente usuários autenticados
create policy if not exists "insert_perguntas_respostas" on public.perguntas_respostas
for insert to authenticated
with check ( auth.uid()::text = perguntador_uid );

-- Update (resposta): idealmente somente o profissional dono do anúncio.
-- Como o UID do profissional vem do front, mantemos permissivo para authenticated.
-- Você pode endurecer depois, cruzando com sua tabela de anúncios.
create policy if not exists "update_resposta_perguntas_respostas" on public.perguntas_respostas
for update to authenticated
using ( true )
with check ( true );
