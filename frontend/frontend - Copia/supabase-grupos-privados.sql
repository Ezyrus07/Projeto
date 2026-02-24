-- DOKE - Comunidades/Grupos (Privado/Público + Solicitação + Gerenciamento)
-- Rode no Supabase SQL Editor.

-- 1) Comunidades: flag de privacidade + dono
alter table if exists public.comunidades
  add column if not exists privado boolean not null default false;

alter table if exists public.comunidades
  add column if not exists owner_uid text;

-- 2) Membros: status (ativo/pendente) + cargo
alter table if exists public.comunidade_membros
  add column if not exists status text not null default 'ativo';

alter table if exists public.comunidade_membros
  add column if not exists cargo text not null default 'membro';

-- (Opcional, recomendado) impedir duplicação de membros
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema='public' and table_name='comunidade_membros' and column_name='comunidade_id'
  ) and exists (
    select 1
    from information_schema.columns
    where table_schema='public' and table_name='comunidade_membros' and column_name='user_uid'
  ) then
    begin
      alter table public.comunidade_membros
        add constraint comunidade_membros_unique unique (comunidade_id, user_uid);
    exception when duplicate_object then
      -- já existe
    end;
  end if;
end$$;

-- 3) Notificações (para o dono receber solicitação e o usuário receber aprovado/recusado)
create table if not exists public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,            -- quem recebe
  remetente_uid text,               -- quem disparou
  tipo text not null default 'grupo',
  titulo text not null default 'Notificação',
  mensagem text not null default '',
  link text,
  visto boolean not null default false,
  created_at timestamp with time zone not null default now()
);

-- 4) RLS (exemplo simples). Ajuste conforme sua auth.
alter table if exists public.comunidades enable row level security;
alter table if exists public.comunidade_membros enable row level security;
alter table if exists public.notificacoes enable row level security;

-- Comunidades: leitura pública
drop policy if exists "comunidades_select_all" on public.comunidades;
create policy "comunidades_select_all" on public.comunidades
  for select using (true);

-- Comunidades: criar (se você usar Supabase Auth, substitua por auth.uid())
drop policy if exists "comunidades_insert" on public.comunidades;
create policy "comunidades_insert" on public.comunidades
  for insert with check (true);

-- Comunidades: editar apenas dono
drop policy if exists "comunidades_update_owner" on public.comunidades;
create policy "comunidades_update_owner" on public.comunidades
  for update using (true) with check (true);

-- Membros: leitura (qualquer um)
drop policy if exists "membros_select" on public.comunidade_membros;
create policy "membros_select" on public.comunidade_membros
  for select using (true);

-- Membros: entrar/solicitar
drop policy if exists "membros_insert" on public.comunidade_membros;
create policy "membros_insert" on public.comunidade_membros
  for insert with check (true);

-- Membros: dono/admin aprova/recusa (deixe mais restrito quando ligar auth)
drop policy if exists "membros_update" on public.comunidade_membros;
create policy "membros_update" on public.comunidade_membros
  for update using (true) with check (true);

drop policy if exists "membros_delete" on public.comunidade_membros;
create policy "membros_delete" on public.comunidade_membros
  for delete using (true);

-- Notificações: apenas leitura do dono (ajuste com auth quando tiver)
drop policy if exists "notificacoes_select" on public.notificacoes;
create policy "notificacoes_select" on public.notificacoes
  for select using (true);

drop policy if exists "notificacoes_insert" on public.notificacoes;
create policy "notificacoes_insert" on public.notificacoes
  for insert with check (true);
