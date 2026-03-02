-- DOKE — Schema perfis (Opção 2: tabelas separadas)
-- Execute no Supabase SQL editor (uma vez).
-- Requer tabela public.usuários com:
--   id uuid (PK) e uid uuid (auth uid) e isProfissional bool
-- Buckets: perfil (Storage)


-- ============================================================
-- CORE: Tabela public.usuários (obrigatória)
-- - id (uuid) = auth.uid()
-- - uid (text) para compat com código legado
-- ============================================================
create extension if not exists pgcrypto;

create table if not exists public.usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  uid text unique not null,
  nome text,
  "user" text,
  foto text,
  isProfissional boolean not null default false,
  categoria text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.__doke_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists __doke_set_usuarios_updated_at on public.usuarios;
create trigger __doke_set_usuarios_updated_at
before update on public.usuarios
for each row execute function public.__doke_set_updated_at();

alter table public.usuarios enable row level security;

-- Leitura pública (cards, perfis públicos)
do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='usuarios' and policyname='Usuarios public read') then
    create policy "Usuarios public read" on public.usuarios for select using (true);
  end if;
end $$;

-- O próprio usuário pode criar/atualizar seu registro (para contas antigas sem row)
do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='usuarios' and policyname='Usuarios self insert') then
    create policy "Usuarios self insert" on public.usuarios
      for insert with check (auth.uid() = id);
  end if;
end $$;

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='usuarios' and policyname='Usuarios self update') then
    create policy "Usuarios self update" on public.usuarios
      for update using (auth.uid() = id)
      with check (auth.uid() = id);
  end if;
end $$;

-- Trigger: cria public.usuários automaticamente quando um auth.users nasce
create or replace function public.__doke_handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.usuarios (id, uid, nome, "user", foto, isProfissional)
  values (
    new.id,
    new.id::text,
    coalesce(new.raw_user_meta_data->>'nome', new.raw_user_meta_data->>'name', split_part(new.email,'@',1), 'Usuário'),
    coalesce(new.raw_user_meta_data->>'user', new.raw_user_meta_data->>'username', null),
    coalesce(new.raw_user_meta_data->>'foto', new.raw_user_meta_data->>'avatar_url', null),
    coalesce((new.raw_user_meta_data->>'isProfissional')::boolean, false)
  )
  on conflict (id) do update set
    uid = excluded.uid;
  return new;
end;
$$;

drop trigger if exists __doke_on_auth_user_created on auth.users;
create trigger __doke_on_auth_user_created
after insert on auth.users
for each row execute procedure public.__doke_handle_new_user();

-- Backfill: cria rows faltantes para usuários já existentes
insert into public.usuarios (id, uid)
select u.id, u.id::text
from auth.users u
where not exists (select 1 from public.usuarios p where p.id = u.id)
on conflict do nothing;


-- ============================================================
-- Storage: bucket 'perfil' + políticas básicas
-- ============================================================
-- Cria bucket público para leitura de mídias
insert into storage.buckets (id, name, public)
values ('perfil','perfil', true)
on conflict (id) do nothing;

-- Políticas em storage.objects (RLS)
-- Leitura pública
do $$ begin
  if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Perfil public read') then
    create policy "Perfil public read" on storage.objects
      for select using (bucket_id = 'perfil');
  end if;
end $$;

-- Escrita por autenticados
do $$ begin
  if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Perfil auth insert') then
    create policy "Perfil auth insert" on storage.objects
      for insert with check (bucket_id = 'perfil' and auth.role() = 'authenticated');
  end if;
end $$;

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Perfil owner update') then
    create policy "Perfil owner update" on storage.objects
      for update using (bucket_id = 'perfil' and auth.uid() = owner)
      with check (bucket_id = 'perfil' and auth.uid() = owner);
  end if;
end $$;

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Perfil owner delete') then
    create policy "Perfil owner delete" on storage.objects
      for delete using (bucket_id = 'perfil' and auth.uid() = owner);
  end if;
end $$;


-- POSTS (foto/vídeo)
create table if not exists public.publicacoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.usuarios(id) on delete cascade,
  tipo text not null check (tipo in ('foto','video')),
  titulo text,
  descricao text,
  media_url text not null,
  thumb_url text,
  created_at timestamptz not null default now()
);
-- Garante coluna descrição mesmo em bases antigas
alter table public.publicacoes
  add column if not exists descricao text;
-- Garante coluna thumb_url mesmo em bases antigas
alter table public.publicacoes
  add column if not exists thumb_url text;
create index if not exists publicacoes_user_id_idx on public.publicacoes(user_id);
alter table public.publicacoes enable row level security;

-- CURTIDAS (publicações)
create table if not exists public.publicacoes_curtidas (
  id uuid primary key default gen_random_uuid(),
  publicacao_id uuid not null references public.publicacoes(id) on delete cascade,
  user_id uuid not null references public.usuarios(id) on delete cascade,
  created_at timestamptz not null default now()
);
create unique index if not exists publicacoes_curtidas_unique on public.publicacoes_curtidas(publicacao_id, user_id);
create index if not exists publicacoes_curtidas_pub_idx on public.publicacoes_curtidas(publicacao_id);
create index if not exists publicacoes_curtidas_user_idx on public.publicacoes_curtidas(user_id);
alter table public.publicacoes_curtidas enable row level security;

-- COMENTARIOS (publicações)
create table if not exists public.publicacoes_comentarios (
  id uuid primary key default gen_random_uuid(),
  publicacao_id uuid not null references public.publicacoes(id) on delete cascade,
  user_id uuid not null references public.usuarios(id) on delete cascade,
  texto text not null,
  created_at timestamptz not null default now()
);
alter table public.publicacoes_comentarios
  add column if not exists parent_id uuid references public.publicacoes_comentarios(id) on delete cascade;
alter table public.publicacoes_comentarios
  add column if not exists like_count int not null default 0;
alter table public.publicacoes_comentarios
  add column if not exists reply_count int not null default 0;
alter table public.publicacoes_comentarios
  add column if not exists pinned boolean not null default false;
create index if not exists publicacoes_comentarios_pub_idx on public.publicacoes_comentarios(publicacao_id);
create index if not exists publicacoes_comentarios_user_idx on public.publicacoes_comentarios(user_id);
create index if not exists publicacoes_comentarios_parent_idx on public.publicacoes_comentarios(parent_id);
alter table public.publicacoes_comentarios enable row level security;

-- COMENTARIOS CURTIDAS (publicações)
create table if not exists public.publicacoes_comentarios_curtidas (
  id uuid primary key default gen_random_uuid(),
  comentario_id uuid not null references public.publicacoes_comentarios(id) on delete cascade,
  user_id uuid not null references public.usuarios(id) on delete cascade,
  created_at timestamptz not null default now()
);
create unique index if not exists publicacoes_comentarios_curtidas_unique on public.publicacoes_comentarios_curtidas(comentario_id, user_id);
create index if not exists publicacoes_comentarios_curtidas_comment_idx on public.publicacoes_comentarios_curtidas(comentario_id);
create index if not exists publicacoes_comentarios_curtidas_user_idx on public.publicacoes_comentarios_curtidas(user_id);
alter table public.publicacoes_comentarios_curtidas enable row level security;

-- COMENTARIOS DENUNCIAS (publicações)
create table if not exists public.publicacoes_comentarios_denuncias (
  id uuid primary key default gen_random_uuid(),
  comentario_id uuid not null references public.publicacoes_comentarios(id) on delete cascade,
  user_id uuid not null references public.usuarios(id) on delete cascade,
  created_at timestamptz not null default now()
);
create unique index if not exists publicacoes_comentarios_denuncias_unique on public.publicacoes_comentarios_denuncias(comentario_id, user_id);
create index if not exists publicacoes_comentarios_denuncias_comment_idx on public.publicacoes_comentarios_denuncias(comentario_id);
create index if not exists publicacoes_comentarios_denuncias_user_idx on public.publicacoes_comentarios_denuncias(user_id);
alter table public.publicacoes_comentarios_denuncias enable row level security;

-- DENUNCIAS (publicações)
create table if not exists public.publicacoes_denuncias (
  id uuid primary key default gen_random_uuid(),
  publicacao_id uuid not null references public.publicacoes(id) on delete cascade,
  user_id uuid not null references public.usuarios(id) on delete cascade,
  created_at timestamptz not null default now()
);
create unique index if not exists publicacoes_denuncias_unique on public.publicacoes_denuncias(publicacao_id, user_id);
create index if not exists publicacoes_denuncias_pub_idx on public.publicacoes_denuncias(publicacao_id);
create index if not exists publicacoes_denuncias_user_idx on public.publicacoes_denuncias(user_id);
alter table public.publicacoes_denuncias enable row level security;

-- REELS (vídeo-curto)
create table if not exists public.videos_curtos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.usuarios(id) on delete cascade,
  titulo text,
  descricao text,
  video_url text not null,
  thumb_url text,
  created_at timestamptz not null default now()
);
alter table public.videos_curtos
  add column if not exists thumb_url text;
create index if not exists videos_curtos_user_id_idx on public.videos_curtos(user_id);
alter table public.videos_curtos enable row level security;

-- CURTIDAS (videos curtos)
create table if not exists public.videos_curtos_curtidas (
  id uuid primary key default gen_random_uuid(),
  video_curto_id uuid not null references public.videos_curtos(id) on delete cascade,
  user_id uuid not null references public.usuarios(id) on delete cascade,
  created_at timestamptz not null default now()
);
create unique index if not exists videos_curtos_curtidas_unique on public.videos_curtos_curtidas(video_curto_id, user_id);
create index if not exists videos_curtos_curtidas_video_idx on public.videos_curtos_curtidas(video_curto_id);
create index if not exists videos_curtos_curtidas_user_idx on public.videos_curtos_curtidas(user_id);
alter table public.videos_curtos_curtidas enable row level security;

-- COMENTARIOS (videos curtos)
create table if not exists public.videos_curtos_comentarios (
  id uuid primary key default gen_random_uuid(),
  video_curto_id uuid not null references public.videos_curtos(id) on delete cascade,
  user_id uuid not null references public.usuarios(id) on delete cascade,
  texto text not null,
  parent_id uuid references public.videos_curtos_comentarios(id) on delete cascade,
  like_count int not null default 0,
  reply_count int not null default 0,
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists videos_curtos_comentarios_video_idx on public.videos_curtos_comentarios(video_curto_id);
create index if not exists videos_curtos_comentarios_user_idx on public.videos_curtos_comentarios(user_id);
create index if not exists videos_curtos_comentarios_parent_idx on public.videos_curtos_comentarios(parent_id);
alter table public.videos_curtos_comentarios enable row level security;

-- COMENTARIOS CURTIDAS (videos curtos)
create table if not exists public.videos_curtos_comentarios_curtidas (
  id uuid primary key default gen_random_uuid(),
  comentario_id uuid not null references public.videos_curtos_comentarios(id) on delete cascade,
  user_id uuid not null references public.usuarios(id) on delete cascade,
  created_at timestamptz not null default now()
);
create unique index if not exists videos_curtos_comentarios_curtidas_unique on public.videos_curtos_comentarios_curtidas(comentario_id, user_id);
create index if not exists videos_curtos_comentarios_curtidas_comment_idx on public.videos_curtos_comentarios_curtidas(comentario_id);
create index if not exists videos_curtos_comentarios_curtidas_user_idx on public.videos_curtos_comentarios_curtidas(user_id);
alter table public.videos_curtos_comentarios_curtidas enable row level security;

-- COMENTARIOS DENUNCIAS (videos curtos)
create table if not exists public.videos_curtos_comentarios_denuncias (
  id uuid primary key default gen_random_uuid(),
  comentario_id uuid not null references public.videos_curtos_comentarios(id) on delete cascade,
  user_id uuid not null references public.usuarios(id) on delete cascade,
  created_at timestamptz not null default now()
);
create unique index if not exists videos_curtos_comentarios_denuncias_unique on public.videos_curtos_comentarios_denuncias(comentario_id, user_id);
create index if not exists videos_curtos_comentarios_denuncias_comment_idx on public.videos_curtos_comentarios_denuncias(comentario_id);
create index if not exists videos_curtos_comentarios_denuncias_user_idx on public.videos_curtos_comentarios_denuncias(user_id);
alter table public.videos_curtos_comentarios_denuncias enable row level security;

-- DENUNCIAS (videos curtos)
create table if not exists public.videos_curtos_denuncias (
  id uuid primary key default gen_random_uuid(),
  video_curto_id uuid not null references public.videos_curtos(id) on delete cascade,
  user_id uuid not null references public.usuarios(id) on delete cascade,
  created_at timestamptz not null default now()
);
create unique index if not exists videos_curtos_denuncias_unique on public.videos_curtos_denuncias(video_curto_id, user_id);
create index if not exists videos_curtos_denuncias_video_idx on public.videos_curtos_denuncias(video_curto_id);
create index if not exists videos_curtos_denuncias_user_idx on public.videos_curtos_denuncias(user_id);
alter table public.videos_curtos_denuncias enable row level security;

-- NOTIFICAÇÕES (interacoes sociais)
create table if not exists public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  paraUid text not null,
  deUid text,
  deNome text,
  deUser text,
  deFoto text,
  acao text,
  postId text,
  postTipo text,
  postFonte text,
  comentarioId text,
  comentarioTexto text,
  lida boolean not null default false,
  link text,
  createdAt timestamptz not null default now()
);
create index if not exists notificacoes_para_idx on public.notificacoes(paraUid);
create index if not exists notificacoes_lida_idx on public.notificacoes(lida);
alter table public.notificacoes enable row level security;

-- PORTFÓLIO (profissional)
create table if not exists public.portfolio (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references public.usuarios(id) on delete cascade,
  titulo text,
  descricao text,
  media_url text not null,
  created_at timestamptz not null default now()
);
create index if not exists portfolio_prof_id_idx on public.portfolio(profissional_id);
alter table public.portfolio enable row level security;

-- SERVIÇOS (profissional)
create table if not exists public.servicos (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references public.usuarios(id) on delete cascade,
  titulo text not null,
  categoria text,
  preco numeric,
  descricao text,
  created_at timestamptz not null default now()
);
create index if not exists servicos_prof_id_idx on public.servicos(profissional_id);
alter table public.servicos enable row level security;

-- AVALIAÇÕES (cliente -> profissional)
create table if not exists public.avaliacoes (
  id uuid primary key default gen_random_uuid(),
  profUid text not null,
  clienteUid text not null,
  anuncioId text,
  clienteNome text,
  clienteFoto text,
  detalhes jsonb,
  comentarioGeral text,
  media float,
  data timestamptz not null default now(),
  pedidoId text
);-- Adicionar colunas se não existirem (para bases antigas)
alter table public.avaliacoes add column if not exists profUid text;
alter table public.avaliacoes add column if not exists clienteUid text;
alter table public.avaliacoes add column if not exists anuncioId text;
alter table public.avaliacoes add column if not exists clienteNome text;
alter table public.avaliacoes add column if not exists clienteFoto text;
alter table public.avaliacoes add column if not exists detalhes jsonb;
alter table public.avaliacoes add column if not exists comentarioGeral text;
alter table public.avaliacoes add column if not exists media float;
alter table public.avaliacoes add column if not exists data timestamptz default now();
alter table public.avaliacoes add column if not exists pedidoId text;create index if not exists avaliacoes_prof_uid_idx on public.avaliacoes(profUid);
create index if not exists avaliacoes_cliente_uid_idx on public.avaliacoes(clienteUid);
alter table public.avaliacoes enable row level security;

-- ---------------------------
-- POLICIES
-- ---------------------------
-- Leitura pública (para exibir perfil)
do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='publicacoes' and policyname='Public read') then
    create policy "Public read" on public.publicacoes for select using (true);
  end if;
end $$;

-- Fallback permissive policy: permite inserts por usuários autenticados
do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='avaliacoes' and policyname='Cliente write - auth') then
    create policy "Cliente write - auth" on public.avaliacoes
      for insert
      with check (auth.role() = 'authenticated');
  end if;
end $$;

-- Fallback 2: allow inserts when auth.uid() is present (broader compatibility)
do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='avaliacoes' and policyname='Cliente write - auth2') then
    create policy "Cliente write - auth2" on public.avaliacoes
      for insert
      with check (auth.uid() is not null);
  end if;
end $$;

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='publicacoes_curtidas' and policyname='Public read') then
    create policy "Public read" on public.publicacoes_curtidas for select using (true);
  end if;
end $$;

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='publicacoes_comentarios' and policyname='Public read') then
    create policy "Public read" on public.publicacoes_comentarios for select using (true);
  end if;
end $$;

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='publicacoes_comentarios_curtidas' and policyname='Public read') then
    create policy "Public read" on public.publicacoes_comentarios_curtidas for select using (true);
  end if;
end $$;

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='publicacoes_comentarios_denuncias' and policyname='Public read') then
    create policy "Public read" on public.publicacoes_comentarios_denuncias for select using (true);
  end if;
end $$;

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='publicacoes_denuncias' and policyname='Public read') then
    create policy "Public read" on public.publicacoes_denuncias for select using (true);
  end if;
end $$;

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='videos_curtos' and policyname='Public read') then
    create policy "Public read" on public.videos_curtos for select using (true);
  end if;
end $$;

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='videos_curtos_curtidas' and policyname='Public read') then
    create policy "Public read" on public.videos_curtos_curtidas for select using (true);
  end if;
end $$;

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='videos_curtos_comentarios' and policyname='Public read') then
    create policy "Public read" on public.videos_curtos_comentarios for select using (true);
  end if;
end $$;

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='videos_curtos_comentarios_curtidas' and policyname='Public read') then
    create policy "Public read" on public.videos_curtos_comentarios_curtidas for select using (true);
  end if;
end $$;

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='videos_curtos_comentarios_denuncias' and policyname='Public read') then
    create policy "Public read" on public.videos_curtos_comentarios_denuncias for select using (true);
  end if;
end $$;

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='videos_curtos_denuncias' and policyname='Public read') then
    create policy "Public read" on public.videos_curtos_denuncias for select using (true);
  end if;
end $$;

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='notificacoes' and policyname='Public read') then
    create policy "Public read" on public.notificacoes for select using (true);
  end if;
end $$;

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='portfolio' and policyname='Public read') then
    create policy "Public read" on public.portfolio for select using (true);
  end if;
end $$;

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='servicos' and policyname='Public read') then
    create policy "Public read" on public.servicos for select using (true);
  end if;
end $$;

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='avaliacoes' and policyname='Public read') then
    create policy "Public read" on public.avaliacoes for select using (true);
  end if;
end $$;

-- Inserts / updates pelo dono (relaciona auth.uid() com usuários.uid)
create or replace function public.is_owner(user_row_id uuid)
returns boolean language sql stable as $$
  select (auth.uid() = user_row_id);
$$;

-- Usuários (perfil)
alter table public.usuarios enable row level security;

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='usuarios' and policyname='Usuarios public read') then
    create policy "Usuarios public read" on public.usuarios for select using (true);
  end if;
end $$;

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='usuarios' and policyname='Usuarios owner update') then
    create policy "Usuarios owner update" on public.usuarios
      for update
      using (public.is_owner(id))
      with check (public.is_owner(id));
  end if;
end $$;

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='publicacoes' and policyname='Owner write') then
    create policy "Owner write" on public.publicacoes
      for all
      using (public.is_owner(user_id))
      with check (public.is_owner(user_id));
  end if;
end $$;

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='publicacoes_curtidas' and policyname='Owner write') then
    create policy "Owner write" on public.publicacoes_curtidas
      for all
      using (public.is_owner(user_id))
      with check (public.is_owner(user_id));
  end if;
end $$;

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='publicacoes_comentarios' and policyname='Owner write') then
    create policy "Owner write" on public.publicacoes_comentarios
      for all
      using (public.is_owner(user_id))
      with check (public.is_owner(user_id));
  end if;
end $$;

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='publicacoes_comentarios_curtidas' and policyname='Owner write') then
    create policy "Owner write" on public.publicacoes_comentarios_curtidas
      for all
      using (public.is_owner(user_id))
      with check (public.is_owner(user_id));
  end if;
end $$;

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='publicacoes_comentarios_denuncias' and policyname='Owner write') then
    create policy "Owner write" on public.publicacoes_comentarios_denuncias
      for all
      using (public.is_owner(user_id))
      with check (public.is_owner(user_id));
  end if;
end $$;

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='publicacoes_denuncias' and policyname='Owner write') then
    create policy "Owner write" on public.publicacoes_denuncias
      for all
      using (public.is_owner(user_id))
      with check (public.is_owner(user_id));
  end if;
end $$;

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='videos_curtos' and policyname='Owner write') then
    create policy "Owner write" on public.videos_curtos
      for all
      using (public.is_owner(user_id))
      with check (public.is_owner(user_id));
  end if;
end $$;

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='videos_curtos_curtidas' and policyname='Owner write') then
    create policy "Owner write" on public.videos_curtos_curtidas
      for all
      using (public.is_owner(user_id))
      with check (public.is_owner(user_id));
  end if;
end $$;

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='videos_curtos_comentarios' and policyname='Owner write') then
    create policy "Owner write" on public.videos_curtos_comentarios
      for all
      using (public.is_owner(user_id))
      with check (public.is_owner(user_id));
  end if;
end $$;

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='videos_curtos_comentarios_curtidas' and policyname='Owner write') then
    create policy "Owner write" on public.videos_curtos_comentarios_curtidas
      for all
      using (public.is_owner(user_id))
      with check (public.is_owner(user_id));
  end if;
end $$;

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='videos_curtos_comentarios_denuncias' and policyname='Owner write') then
    create policy "Owner write" on public.videos_curtos_comentarios_denuncias
      for all
      using (public.is_owner(user_id))
      with check (public.is_owner(user_id));
  end if;
end $$;

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='videos_curtos_denuncias' and policyname='Owner write') then
    create policy "Owner write" on public.videos_curtos_denuncias
      for all
      using (public.is_owner(user_id))
      with check (public.is_owner(user_id));
  end if;
end $$;

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='notificacoes' and policyname='Public write') then
    create policy "Public write" on public.notificacoes
      for all
      using (true)
      with check (true);
  end if;
end $$;

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='portfolio' and policyname='Owner write') then
    create policy "Owner write" on public.portfolio
      for all
      using (public.is_owner(profissional_id))
      with check (public.is_owner(profissional_id));
  end if;
end $$;

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='servicos' and policyname='Owner write') then
    create policy "Owner write" on public.servicos
      for all
      using (public.is_owner(profissional_id))
      with check (public.is_owner(profissional_id));
  end if;
end $$;

-- Avaliações: política de escrita. Alguns deployments antigos usavam nomes diferentes
-- (cliente_id/profissional_id). Aqui criamos uma política compatível que permite
-- inserts por usuários autenticados (auth.uid() não nulo). Ajuste se quiser
-- restringir por mapeamento específico entre auth.uid() e colunas da tabela.
do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='avaliacoes' and policyname='Cliente write') then
    -- If the column clienteUid exists, create a stricter policy that requires
    -- the inserted row's clienteUid to match auth.uid(); otherwise fall back
    -- to a permissive authenticated-only policy.
    if exists(
      select 1 from information_schema.columns
      where table_schema='public' and table_name='avaliacoes' and column_name='clienteUid'
    ) then
      execute $pol$
        create policy "Cliente write" on public.avaliacoes
          for insert
          with check (clienteUid = auth.uid()::text);
      $pol$;
    else
      execute $pol$
        create policy "Cliente write" on public.avaliacoes
          for insert
          with check (auth.uid() is not null);
      $pol$;
    end if;
  end if;
end $$;

-- ---------------------------
-- STORAGE (bucket: perfil)
-- ---------------------------
-- Permite upload apenas para o dono do perfil (pasta com id do usuário).
create or replace function public.current_user_row_id()
returns uuid language sql stable as $$
  select u.id from public.usuarios u where u.uid = auth.uid() limit 1;
$$;

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Perfil public read') then
    create policy "Perfil public read" on storage.objects
      for select
      using (bucket_id = 'perfil');
  end if;
end $$;

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Perfil owner insert') then
    create policy "Perfil owner insert" on storage.objects
      for insert
      with check (
        bucket_id = 'perfil'
        and (
          (storage.foldername(name))[2] = public.current_user_row_id()::text
          or (storage.foldername(name))[2] = auth.uid()::text
        )
      );
  end if;
end $$;

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Perfil owner update') then
    create policy "Perfil owner update" on storage.objects
      for update
      using (
        bucket_id = 'perfil'
        and (
          (storage.foldername(name))[2] = public.current_user_row_id()::text
          or (storage.foldername(name))[2] = auth.uid()::text
        )
      )
      with check (
        bucket_id = 'perfil'
        and (
          (storage.foldername(name))[2] = public.current_user_row_id()::text
          or (storage.foldername(name))[2] = auth.uid()::text
        )
      );
  end if;
end $$;

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Perfil owner delete') then
    create policy "Perfil owner delete" on storage.objects
      for delete
      using (
        bucket_id = 'perfil'
        and (
          (storage.foldername(name))[2] = public.current_user_row_id()::text
          or (storage.foldername(name))[2] = auth.uid()::text
        )
      );
  end if;
end $$;

-- Fallback: libera write para qualquer usuário autenticado no bucket perfil.
-- Use apenas se o mapeamento auth.uid() -> usuários.id ainda não estiver consistente.
do $$ begin
  if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Perfil auth insert') then
    create policy "Perfil auth insert" on storage.objects
      for insert
      with check (
        bucket_id = 'perfil'
        and auth.uid() is not null
      );
  end if;
end $$;

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Perfil auth update') then
    create policy "Perfil auth update" on storage.objects
      for update
      using (
        bucket_id = 'perfil'
        and auth.uid() is not null
      )
      with check (
        bucket_id = 'perfil'
        and auth.uid() is not null
      );
  end if;
end $$;

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Perfil auth delete') then
    create policy "Perfil auth delete" on storage.objects
      for delete
      using (
        bucket_id = 'perfil'
        and auth.uid() is not null
      );
  end if;
end $$;
