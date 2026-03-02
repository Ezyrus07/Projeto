-- DOKE — Perguntas ao Profissional (Marketplace)
-- Cole e rode no Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.perguntas_profissional (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references public.usuarios(id) on delete cascade,
  asked_by_id uuid references public.usuarios(id) on delete set null,
  pergunta text not null,
  resposta text,
  oculto boolean not null default false,
  asked_by_nome text,
  asked_by_user text,
  asked_by_avatar text,
  created_at timestamptz not null default now(),
  answered_at timestamptz
);

create index if not exists idx_perguntas_prof_profissional
  on public.perguntas_profissional (profissional_id, created_at desc);

create index if not exists idx_perguntas_prof_oculto
  on public.perguntas_profissional (profissional_id, oculto, created_at desc);

-- (Opcional) Se você usa RLS, crie policies depois.
-- Eu deixei propositalmente simples para não te travar agora.
