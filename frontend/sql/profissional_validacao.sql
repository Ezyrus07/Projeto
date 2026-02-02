-- DOKE: tabela de validação profissional (robusta p/ esquemas diferentes)
-- ✅ Funciona tanto se você usa "usuarios.id" = auth.uid() quanto se usa "usuarios.uid" = auth.uid()

create table if not exists public.profissional_validacao (
  -- Identificador principal usado pelo app (recomendado)
  usuario_id uuid primary key references public.usuarios(id) on delete cascade,

  -- Identificador do Auth (opcional, mas recomendado p/ RLS simples)
  uid uuid unique,

  telefone text not null,
  cpf text not null,
  data_nascimento date not null,

  cep text not null,
  uf text not null,
  cidade text not null,
  bairro text not null,
  rua text not null,
  numero text not null,
  complemento text,

  identidade_url text,
  status text default 'pendente',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Se a tabela já existir com colunas diferentes, garante as colunas usadas pelo front
alter table public.profissional_validacao add column if not exists usuario_id uuid;
alter table public.profissional_validacao add column if not exists uid uuid;
alter table public.profissional_validacao add column if not exists telefone text;
alter table public.profissional_validacao add column if not exists cpf text;
alter table public.profissional_validacao add column if not exists data_nascimento date;
alter table public.profissional_validacao add column if not exists cep text;
alter table public.profissional_validacao add column if not exists uf text;
alter table public.profissional_validacao add column if not exists cidade text;
alter table public.profissional_validacao add column if not exists bairro text;
alter table public.profissional_validacao add column if not exists rua text;
alter table public.profissional_validacao add column if not exists numero text;
alter table public.profissional_validacao add column if not exists complemento text;
alter table public.profissional_validacao add column if not exists identidade_url text;
alter table public.profissional_validacao add column if not exists status text;
alter table public.profissional_validacao add column if not exists created_at timestamptz;
alter table public.profissional_validacao add column if not exists updated_at timestamptz;

-- Índices/uniques
create unique index if not exists profissional_validacao_uid_unique on public.profissional_validacao(uid);
create unique index if not exists profissional_validacao_cpf_unique on public.profissional_validacao(cpf);

-- RLS (se você não usa RLS, pode remover este bloco)
alter table public.profissional_validacao enable row level security;

drop policy if exists "pv_select_own" on public.profissional_validacao;
drop policy if exists "pv_insert_own" on public.profissional_validacao;
drop policy if exists "pv_update_own" on public.profissional_validacao;

create policy "pv_select_own"
on public.profissional_validacao
for select
using (
  uid = auth.uid()
  OR usuario_id = auth.uid()
  OR exists (
    select 1 from public.usuarios u
    where u.id = profissional_validacao.usuario_id
      and u.uid = auth.uid()
  )
);

create policy "pv_insert_own"
on public.profissional_validacao
for insert
with check (
  uid = auth.uid()
  OR usuario_id = auth.uid()
  OR exists (
    select 1 from public.usuarios u
    where u.id = profissional_validacao.usuario_id
      and u.uid = auth.uid()
  )
);

create policy "pv_update_own"
on public.profissional_validacao
for update
using (
  uid = auth.uid()
  OR usuario_id = auth.uid()
  OR exists (
    select 1 from public.usuarios u
    where u.id = profissional_validacao.usuario_id
      and u.uid = auth.uid()
  )
)
with check (
  uid = auth.uid()
  OR usuario_id = auth.uid()
  OR exists (
    select 1 from public.usuarios u
    where u.id = profissional_validacao.usuario_id
      and u.uid = auth.uid()
  )
);
