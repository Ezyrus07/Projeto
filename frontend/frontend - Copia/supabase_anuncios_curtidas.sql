-- DOKE: Curtidas de Anúncios (Supabase)
-- Rode este SQL no Supabase (SQL Editor).
-- Cria tabela anuncios_curtidas e políticas RLS compatíveis.

create table if not exists public.anuncios_curtidas (
  id bigserial primary key,
  anuncio_id text not null,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  constraint anuncios_curtidas_unique unique (anuncio_id, user_id)
);

-- Index para performance
create index if not exists idx_anuncios_curtidas_user on public.anuncios_curtidas (user_id);
create index if not exists idx_anuncios_curtidas_anuncio on public.anuncios_curtidas (anuncio_id);

alter table public.anuncios_curtidas enable row level security;

-- Permitir SELECT para todos (para contagens)
drop policy if exists "anuncios_curtidas_select_all" on public.anuncios_curtidas;
create policy "anuncios_curtidas_select_all"
on public.anuncios_curtidas
for select
to anon, authenticated
using (true);

-- Inserir: somente o próprio usuário autenticado
drop policy if exists "anuncios_curtidas_insert_own" on public.anuncios_curtidas;
create policy "anuncios_curtidas_insert_own"
on public.anuncios_curtidas
for insert
to authenticated
with check (auth.uid() = user_id);

-- Deletar: somente o próprio usuário autenticado
drop policy if exists "anuncios_curtidas_delete_own" on public.anuncios_curtidas;
create policy "anuncios_curtidas_delete_own"
on public.anuncios_curtidas
for delete
to authenticated
using (auth.uid() = user_id);
