-- DOKE Comunidades/Grupo - Features (long-term)
-- IMPORTANTE: sua tabela usa coluna case-sensitive "comunidadeId" (com I maiúsculo).
-- Em SQL, sempre referencie com aspas: "comunidadeId"

-- 1) Colunas extras na tabela de posts (se não existirem)
alter table public.comunidade_posts
  add column if not exists "autorUser" text,
  add column if not exists "autorFoto" text,
  add column if not exists reply_to_id uuid,
  add column if not exists reply_preview text,
  add column if not exists reply_user text,
  add column if not exists fixado boolean default false;

create index if not exists idx_comunidade_posts_comunidadeid_created
  on public.comunidade_posts ("comunidadeId", created_at);

-- 2) Reações por post (tabela separada)
create table if not exists public.comunidade_post_reacoes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.comunidade_posts(id) on delete cascade,
  "comunidadeId" uuid not null,
  user_id text not null,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (post_id, user_id, emoji)
);

create index if not exists idx_reacoes_post on public.comunidade_post_reacoes (post_id, created_at desc);
create index if not exists idx_reacoes_comunidade on public.comunidade_post_reacoes ("comunidadeId", created_at desc);

-- 3) Não lidas (last_read por usuário)
create table if not exists public.comunidade_post_reads (
  "comunidadeId" uuid not null,
  user_id text not null,
  last_read_at timestamptz not null default now(),
  primary key ("comunidadeId", user_id)
);

-- 4) Pins (fixar mensagem)
create table if not exists public.comunidade_post_pins (
  id uuid primary key default gen_random_uuid(),
  "comunidadeId" uuid not null,
  post_id uuid not null references public.comunidade_posts(id) on delete cascade,
  pinned_by text not null,
  created_at timestamptz not null default now(),
  unique ("comunidadeId", post_id)
);

-- 5) Silenciar membro
create table if not exists public.comunidade_mutes (
  id uuid primary key default gen_random_uuid(),
  "comunidadeId" uuid not null,
  user_id text not null,
  muted_by text not null,
  until_at timestamptz,
  created_at timestamptz not null default now(),
  unique ("comunidadeId", user_id)
);

-- 6) Entrar no grupo / Solicitar permissao (status em comunidade_membros)


-- ============================================================
-- FIX JOIN (IMPORTANT)
-- Your app uses Firebase/local uid (non-UUID). If comunidade_membros stores user id as UUID,
-- PostgREST returns 400. This block converts common user-id columns to TEXT safely.
-- ============================================================

do $$
declare
  c record;
begin
  if to_regclass('public.comunidade_membros') is null then
    raise notice 'Tabela public.comunidade_membros nao existe.';
    return;
  end if;

  -- Ensure status columns exist
  begin
    alter table public.comunidade_membros add column if not exists status text default 'pendente';
  exception when others then end;
  begin
    alter table public.comunidade_membros add column if not exists created_at timestamptz default now();
  exception when others then end;

  -- Convert user id columns (uuid -> text)
  for c in
    select column_name, data_type
    from information_schema.columns
    where table_schema='public'
      and table_name='comunidade_membros'
      and column_name in ('user_id','user_uid','userUid','uid','autorUid','usuario_id')
  loop
    if c.data_type = 'uuid' then
      execute format('alter table public.comunidade_membros alter column %I type text using %I::text', c.column_name, c.column_name);
    end if;
  end loop;

  -- Optional: set defaults for common role columns (avoid NOT NULL insert errors)
  for c in
    select column_name
    from information_schema.columns
    where table_schema='public'
      and table_name='comunidade_membros'
      and column_name in ('papel','role','cargo')
  loop
    begin
      execute format('alter table public.comunidade_membros alter column %I set default %L', c.column_name, 'membro');
    exception when others then end;
  end loop;
end $$;

-- ============================================================
-- DOKE Chat - Replies + Arquivamento (pedidos/conversas)
-- ============================================================

-- Arquivar por usuário (arrays)
alter table public.pedidos
  add column if not exists arquivadoPor text[] default '{}';
alter table public.pedidos
  add column if not exists "ocultoPedidosPor" text[] default '{}';

alter table public.conversas
  add column if not exists arquivadoPor text[] default '{}';
alter table public.conversas
  add column if not exists "ocultoChatPor" text[] default '{}',
  add column if not exists "ultimaMensagem" text,
  add column if not exists "dataAtualizacao" timestamptz,
  add column if not exists "dataCriacao" timestamptz;

-- Replies nas mensagens (pedidos/conversas)
alter table if exists public.pedidos_mensagens
  add column if not exists reply_to text,
  add column if not exists reply_preview text,
  add column if not exists reply_user text,
  add column if not exists reply_tipo text,
  add column if not exists "lidoEm" jsonb default '{}';

alter table if exists public.conversas_mensagens
  add column if not exists reply_to text,
  add column if not exists reply_preview text,
  add column if not exists reply_user text,
  add column if not exists reply_tipo text,
  add column if not exists "lidoEm" jsonb default '{}';

-- Mensagens de conversas (caso não exista)
create table if not exists public.conversas_mensagens (
  id uuid primary key default gen_random_uuid(),
  conversaid uuid not null,
  senderuid text,
  texto text,
  tipo text,
  url text,
  timestamp timestamptz not null default now(),
  lido boolean default false,
  "lidoEm" jsonb not null default '{}'
);

do $$
declare col_conv text;
begin
  select column_name into col_conv
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'conversas_mensagens'
    and column_name in ('conversaId','conversaid','conversa_id')
  order by case column_name when 'conversaId' then 1 when 'conversaid' then 2 else 3 end
  limit 1;
  if col_conv is not null then
    execute format('create index if not exists conversas_mensagens_conversaid_idx on public.conversas_mensagens (%I);', col_conv);
  end if;
end $$;
create index if not exists conversas_mensagens_timestamp_idx on public.conversas_mensagens (timestamp);

-- Se o id em "conversas" for TEXT e não UUID, ajuste a coluna:
-- alter table public.conversas_mensagens alter column conversaid type text using conversaid::text;

-- ============================================================
-- RLS (mensagens) - permitir apagar/editar somente o autor
-- ============================================================
do $$
begin
  if to_regclass('public.pedidos_mensagens') is not null then
    execute 'alter table public.pedidos_mensagens enable row level security';
    execute 'drop policy if exists pedidos_msg_select on public.pedidos_mensagens';
    execute 'drop policy if exists pedidos_msg_insert on public.pedidos_mensagens';
    execute 'drop policy if exists pedidos_msg_update on public.pedidos_mensagens';
    execute 'drop policy if exists pedidos_msg_delete on public.pedidos_mensagens';
    execute 'create policy pedidos_msg_select on public.pedidos_mensagens for select to authenticated using (true)';
    execute 'create policy pedidos_msg_insert on public.pedidos_mensagens for insert to authenticated with check (true)';
    execute 'create policy pedidos_msg_update on public.pedidos_mensagens for update to authenticated using (senderuid::text = auth.uid()::text) with check (senderuid::text = auth.uid()::text)';
    execute 'create policy pedidos_msg_delete on public.pedidos_mensagens for delete to authenticated using (senderuid::text = auth.uid()::text)';
  end if;
  if to_regclass('public.conversas_mensagens') is not null then
    execute 'alter table public.conversas_mensagens enable row level security';
    execute 'drop policy if exists conversas_msg_select on public.conversas_mensagens';
    execute 'drop policy if exists conversas_msg_insert on public.conversas_mensagens';
    execute 'drop policy if exists conversas_msg_update on public.conversas_mensagens';
    execute 'drop policy if exists conversas_msg_delete on public.conversas_mensagens';
    execute 'create policy conversas_msg_select on public.conversas_mensagens for select to authenticated using (true)';
    execute 'create policy conversas_msg_insert on public.conversas_mensagens for insert to authenticated with check (true)';
    execute 'create policy conversas_msg_update on public.conversas_mensagens for update to authenticated using (senderuid::text = auth.uid()::text) with check (senderuid::text = auth.uid()::text)';
    execute 'create policy conversas_msg_delete on public.conversas_mensagens for delete to authenticated using (senderuid::text = auth.uid()::text)';
  end if;
end $$;

-- ============================================================
-- DOKE Amizades (mensagens privadas)
-- ============================================================
create table if not exists public.amizades (
  id uuid primary key default gen_random_uuid(),
  "deUid" text not null,
  "paraUid" text not null,
  status text not null default 'pendente',
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  accepted_at timestamptz,
  unique ("deUid", "paraUid")
);

create index if not exists idx_amizades_de on public.amizades ("deUid", status, created_at desc);
create index if not exists idx_amizades_para on public.amizades ("paraUid", status, created_at desc);

-- ============================================================
-- DOKE Seguidores
-- ============================================================
create table if not exists public.seguidores (
  id uuid primary key default gen_random_uuid(),
  "seguidorUid" text not null,
  "seguidoUid" text not null,
  created_at timestamptz not null default now(),
  unique ("seguidorUid", "seguidoUid")
);

create index if not exists idx_seguidores_seguidor on public.seguidores ("seguidorUid", created_at desc);
create index if not exists idx_seguidores_seguido on public.seguidores ("seguidoUid", created_at desc);

-- ============================================================
-- DOKE Pedidos - Orçamento detalhado (orçamento.html)
-- ============================================================
alter table public.pedidos
  add column if not exists "anuncioId" text,
  add column if not exists "anuncioFoto" text,
  add column if not exists "descricaoBase" text,
  add column if not exists "paraQuando" text,
  add column if not exists "dataEspecifica" text,
  add column if not exists "turno" text,
  add column if not exists "localizacao" jsonb,
  add column if not exists "modoAtend" text,
  add column if not exists "respostasTriagem" jsonb,
  add column if not exists "dataAtualizacao" timestamptz,
  add column if not exists "dataConclusao" timestamptz,
  add column if not exists "ultimaMensagem" text,
  add column if not exists "avaliado" boolean default false;

-- RLS: ajuste se usar row level security nessas tabelas
-- Exemplo (permissivo) para update das colunas de arquivamento:
-- create policy pedidos_update_arquivado on public.pedidos for update
--   to authenticated using (true) with check (true);
-- create policy conversas_update_arquivado on public.conversas for update
--   to authenticated using (true) with check (true);
-- RLS permissive to unblock join/request (tighten later)
do $$
begin
  if to_regclass('public.comunidade_membros') is not null then
    execute 'alter table public.comunidade_membros enable row level security';
    execute 'drop policy if exists cm_select_all on public.comunidade_membros';
    execute 'drop policy if exists cm_insert_all on public.comunidade_membros';

    execute 'create policy cm_select_all on public.comunidade_membros for select to anon, authenticated using (true)';
    execute 'create policy cm_insert_all on public.comunidade_membros for insert to anon, authenticated with check (true)';
  end if;
end $$;
