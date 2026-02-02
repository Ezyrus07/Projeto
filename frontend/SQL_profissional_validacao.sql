-- DOKE | profissional_validacao (rodar no Supabase SQL Editor)
-- Guarda dados pessoais de validação do profissional (CPF, nascimento, endereço, documento).

create table if not exists public.profissional_validacao (
  user_id uuid primary key references auth.users(id) on delete cascade,
  telefone text,
  cpf text,
  data_nascimento date,
  cep text,
  uf text,
  cidade text,
  bairro text,
  rua text,
  numero text,
  complemento text,
  identidade_url text,
  status text default 'pendente',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profissional_validacao enable row level security;

-- Políticas (cada usuário só vê/altera o próprio registro)
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname='public' and tablename='profissional_validacao' and policyname='pv_select_own'
  ) then
    create policy pv_select_own on public.profissional_validacao
      for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies 
    where schemaname='public' and tablename='profissional_validacao' and policyname='pv_insert_own'
  ) then
    create policy pv_insert_own on public.profissional_validacao
      for insert with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies 
    where schemaname='public' and tablename='profissional_validacao' and policyname='pv_update_own'
  ) then
    create policy pv_update_own on public.profissional_validacao
      for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

create index if not exists idx_profissional_validacao_status on public.profissional_validacao(status);
