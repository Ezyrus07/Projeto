-- Enderecos salvos por usuario (cliente/profissional)
-- Execute este script no SQL Editor do Supabase.

create extension if not exists pgcrypto;

create table if not exists public.enderecos_usuario (
  id uuid primary key default gen_random_uuid(),
  usuario_uid text not null,
  uid uuid null,
  apelido text not null default '',
  cep text not null,
  endereco text not null,
  numero text not null,
  complemento text not null default '',
  referencia text not null default '',
  info text not null default '',
  principal boolean not null default false,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_enderecos_usuario_uid on public.enderecos_usuario (usuario_uid);
create index if not exists idx_enderecos_usuario_ativo on public.enderecos_usuario (ativo);
create index if not exists idx_enderecos_usuario_updated_at on public.enderecos_usuario (updated_at desc);

-- Garante no maximo 1 endereco principal ativo por usuario
create unique index if not exists uq_endereco_principal_ativo
  on public.enderecos_usuario (usuario_uid)
  where (principal = true and ativo = true);

create or replace function public.fn_enderecos_usuario_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_enderecos_usuario_updated_at on public.enderecos_usuario;
create trigger trg_enderecos_usuario_updated_at
before update on public.enderecos_usuario
for each row
execute function public.fn_enderecos_usuario_set_updated_at();

alter table public.enderecos_usuario enable row level security;

drop policy if exists "eu_leio_meus_enderecos" on public.enderecos_usuario;
create policy "eu_leio_meus_enderecos"
on public.enderecos_usuario
for select
using (
  usuario_uid = auth.uid()::text
  or uid = auth.uid()
);

drop policy if exists "eu_insiro_meus_enderecos" on public.enderecos_usuario;
create policy "eu_insiro_meus_enderecos"
on public.enderecos_usuario
for insert
with check (
  usuario_uid = auth.uid()::text
  or uid = auth.uid()
);

drop policy if exists "eu_atualizo_meus_enderecos" on public.enderecos_usuario;
create policy "eu_atualizo_meus_enderecos"
on public.enderecos_usuario
for update
using (
  usuario_uid = auth.uid()::text
  or uid = auth.uid()
)
with check (
  usuario_uid = auth.uid()::text
  or uid = auth.uid()
);

drop policy if exists "eu_apago_meus_enderecos" on public.enderecos_usuario;
create policy "eu_apago_meus_enderecos"
on public.enderecos_usuario
for delete
using (
  usuario_uid = auth.uid()::text
  or uid = auth.uid()
);

