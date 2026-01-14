-- DOKE — Schema perfis (Opção 2: tabelas separadas)
-- Execute no Supabase SQL editor (uma vez).
-- Requer tabela public.usuarios com:
--   id uuid (PK) e uid uuid (auth uid) e isProfissional bool
-- Buckets: perfil (Storage)


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
-- Garante coluna descricao mesmo em bases antigas
alter table public.publicacoes
  add column if not exists descricao text;
-- Garante coluna thumb_url mesmo em bases antigas
alter table public.publicacoes
  add column if not exists thumb_url text;
create index if not exists publicacoes_user_id_idx on public.publicacoes(user_id);
alter table public.publicacoes enable row level security;

-- CURTIDAS (publicacoes)
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

-- COMENTARIOS (publicacoes)
create table if not exists public.publicacoes_comentarios (
  id uuid primary key default gen_random_uuid(),
  publicacao_id uuid not null references public.publicacoes(id) on delete cascade,
  user_id uuid not null references public.usuarios(id) on delete cascade,
  texto text not null,
  created_at timestamptz not null default now()
);
create index if not exists publicacoes_comentarios_pub_idx on public.publicacoes_comentarios(publicacao_id);
create index if not exists publicacoes_comentarios_user_idx on public.publicacoes_comentarios(user_id);
alter table public.publicacoes_comentarios enable row level security;

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
  profissional_id uuid not null references public.usuarios(id) on delete cascade,
  cliente_id uuid not null references public.usuarios(id) on delete cascade,
  nota int not null check (nota between 1 and 5),
  comentario text,
  created_at timestamptz not null default now()
);
create index if not exists avaliacoes_prof_id_idx on public.avaliacoes(profissional_id);
create index if not exists avaliacoes_cliente_id_idx on public.avaliacoes(cliente_id);
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
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='videos_curtos' and policyname='Public read') then
    create policy "Public read" on public.videos_curtos for select using (true);
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

-- Inserts / updates pelo dono (relaciona auth.uid() com usuarios.uid)
create or replace function public.is_owner(user_row_id uuid)
returns boolean language sql stable as $$
  select exists(select 1 from public.usuarios u where u.id=user_row_id and u.uid = auth.uid());
$$;

-- Usuarios (perfil)
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
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='videos_curtos' and policyname='Owner write') then
    create policy "Owner write" on public.videos_curtos
      for all
      using (public.is_owner(user_id))
      with check (public.is_owner(user_id));
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

-- Avaliações: cliente escreve para profissional (cliente_id precisa ser o auth.uid())
create or replace function public.is_cliente(cliente_row_id uuid)
returns boolean language sql stable as $$
  select exists(select 1 from public.usuarios u where u.id=cliente_row_id and u.uid = auth.uid());
$$;

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='avaliacoes' and policyname='Cliente write') then
    create policy "Cliente write" on public.avaliacoes
      for insert
      with check (public.is_cliente(cliente_id) and cliente_id <> profissional_id);
  end if;
end $$;

-- ---------------------------
-- STORAGE (bucket: perfil)
-- ---------------------------
-- Permite upload apenas para o dono do perfil (pasta com id do usuario).
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

-- Fallback: libera write para qualquer usuario autenticado no bucket perfil.
-- Use apenas se o mapeamento auth.uid() -> usuarios.id ainda nao estiver consistente.
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
